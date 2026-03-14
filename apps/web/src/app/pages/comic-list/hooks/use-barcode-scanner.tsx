import { useState, useRef, useCallback, useEffect } from 'react'
import Quagga, {
  type QuaggaJSResultObject,
  type QuaggaJSCodeReader,
  type QuaggaJSResultObject_CodeResult,
} from '@ericblade/quagga2'
import {
  buildBarcodeSet,
  type BarcodeSet,
  type ComicBarcodeSet,
} from './barcode-validation'

// ─── Public types ─────────────────────────────────────────────────────────────

export type { BarcodeSet } from './barcode-validation'

export type ScannerPhase =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'complete'
  | 'error'

export interface UseBarcodeScanner {
  phase: ScannerPhase
  barcodeSet: BarcodeSet | null
  error: string | null
  isSupported: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  hits: number
  startScanning: () => void
  stopScanning: () => void
  resetScan: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Number of times a full UPC must be detected before it is considered confirmed.
 * Higher = more reliable, slower to lock on.
 */
const CONFIDENCE_THRESHOLD = 3

/** Abort scanning entirely if nothing is detected within this window. */
const SCAN_TIMEOUT_MS = 90_000

/** Reject detections with average decode error above this threshold. */
const MAX_AVG_ERROR = 0.25

// ─── Quagga config ────────────────────────────────────────────────────────────

function buildQuaggaConfig(target: Element) {
  return {
    inputStream: {
      type: 'LiveStream' as const,
      target,
      constraints: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    decoder: {
      readers: [
        { format: 'ean_reader', config: { supplements: ['ean_5_reader'] } },
      ] as unknown as QuaggaJSCodeReader[],
    },
    locate: false,
    frequency: 10,
  }
}

// ─── Error helpers ────────────────────────────────────────────────────────────

/** Maps raw Quagga/camera errors to human-readable messages shown in the UI. */
function describeCameraError(err: unknown): string {
  const message =
    typeof err === 'string' ? err : err instanceof Error ? err.message : ''
  if (message.includes('Permission') || message.includes('NotAllowedError')) {
    return 'Camera permission denied. Please allow camera access and try again.'
  }
  if (
    message.includes('NotFound') ||
    message.includes('DevicesNotFound') ||
    message.includes('OverconstrainedError')
  ) {
    return 'No camera found on this device.'
  }
  if (message.includes('Could not start video source')) {
    return 'Failed to start camera. Another app may be using it.'
  }
  return 'Failed to start camera. Please try again.'
}

/** Returns the average decode error across all decoded segments. */
function getAverageError(codeResult: QuaggaJSResultObject_CodeResult): number {
  const errors = codeResult.decodedCodes
    .filter((c) => typeof c.error === 'number')
    .map((c) => c.error!)
  if (errors.length === 0) return 1
  return errors.reduce((sum, e) => sum + e, 0) / errors.length
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBarcodeScanner(): UseBarcodeScanner {
  // ── React state (drives UI re-renders) ──────────────────────────────────────
  const [phase, setPhase] = useState<ScannerPhase>('idle')
  const [barcodeSet, setBarcodeSet] = useState<BarcodeSet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hits, setHits] = useState(0)

  // ── Refs (mutated each frame; do NOT trigger re-renders) ─────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null)
  const quaggaRunningRef = useRef(false)

  /** Set to true when `stopScanning` is called so callbacks exit cleanly. */
  const stoppedRef = useRef(false)

  /** Mirror of `phase` readable synchronously inside the onDetected callback. */
  const phaseRef = useRef<ScannerPhase>('idle')

  /** Timer that aborts scanning if no barcode is detected within SCAN_TIMEOUT_MS. */
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Maps each candidate full UPC to its consecutive hit count. */
  const confidenceMapRef = useRef<Map<string, number>>(new Map())

  // ── Phase helper ─────────────────────────────────────────────────────────────
  /** Updates both the React state and the synchronous ref so callbacks see changes immediately. */
  const updatePhase = useCallback((nextPhase: ScannerPhase) => {
    phaseRef.current = nextPhase
    setPhase(nextPhase)
  }, [])

  // ── Camera teardown ───────────────────────────────────────────────────────────
  const stopScanning = useCallback(() => {
    stoppedRef.current = true

    if (quaggaRunningRef.current) {
      quaggaRunningRef.current = false
      Quagga.offDetected()
      Quagga.stop().catch((_err: unknown) => undefined)
    }

    if (containerRef.current) {
      const video = containerRef.current.querySelector('video')
      if (video?.srcObject instanceof MediaStream) {
        video.srcObject.getTracks().forEach((t) => t.stop())
        video.srcObject = null
      }
    }
  }, [])

  // ── Full state reset ──────────────────────────────────────────────────────────
  const resetScan = useCallback(() => {
    stopScanning()

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = null
    }

    confidenceMapRef.current.clear()
    stoppedRef.current = false

    setBarcodeSet(null)
    setError(null)
    setHits(0)
    updatePhase('idle')
  }, [stopScanning, updatePhase])

  // ── Scan completion ───────────────────────────────────────────────────────────
  const finalizeScan = useCallback(
    (confirmedSet: ComicBarcodeSet) => {
      stopScanning()
      setBarcodeSet(buildBarcodeSet(confirmedSet))
      updatePhase('complete')
    },
    [stopScanning, updatePhase]
  )

  // ── Frame handler ─────────────────────────────────────────────────────────────
  /**
   * Called for every detected frame.
   * The supplement-only reader returns a concatenated code only when both
   * EAN-13 and EAN-5 decode successfully, so fullCode is always 17-18 chars.
   */
  const handleFrame = useCallback(
    (fullCode: string, supplement: string) => {
      const hitCount = (confidenceMapRef.current.get(fullCode) ?? 0) + 1
      confidenceMapRef.current.set(fullCode, hitCount)
      setHits(Math.min(hitCount, CONFIDENCE_THRESHOLD))

      if (hitCount >= CONFIDENCE_THRESHOLD) {
        const main = fullCode.slice(0, fullCode.length - supplement.length)
        finalizeScan({ main, supplement })
      }
    },
    [finalizeScan]
  )

  // ── Stable callback ref (avoids re-registering on every render) ───────────────
  const handleDetectedRef = useRef<(r: QuaggaJSResultObject) => void>(
    (_r: QuaggaJSResultObject) => undefined
  )
  useEffect(() => {
    handleDetectedRef.current = (result) => {
      if (stoppedRef.current) return
      const code = result.codeResult.code
      if (!code) return

      // Reject low-confidence detections
      if (getAverageError(result.codeResult) > MAX_AVG_ERROR) return

      // supplement is present at runtime but missing from @ericblade/quagga2 type defs
      const extendedResult =
        result.codeResult as QuaggaJSResultObject_CodeResult & {
          supplement?: { code: string }
        }
      const supplement = extendedResult.supplement?.code
      if (!supplement) return

      // Validate full code is 17-18 digits
      if (code.length < 17 || code.length > 18) return

      if (phaseRef.current === 'scanning') handleFrame(code, supplement)
    }
  }, [handleFrame])

  // ── Phase-driven timeout management ──────────────────────────────────────────
  useEffect(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = null
    }

    if (phase === 'scanning') {
      scanTimeoutRef.current = setTimeout(() => {
        if (!stoppedRef.current) {
          stopScanning()
          setError('Scan timed out. Please try again.')
          updatePhase('error')
        }
      }, SCAN_TIMEOUT_MS)
    }

    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }
    }
  }, [phase, stopScanning, updatePhase])

  // ── Camera startup ────────────────────────────────────────────────────────────
  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'

  /**
   * Resets transient state and advances phase to 'starting'.
   * Actual Quagga init happens in the useEffect below, after React has flushed
   * the render that makes the container div appear in the DOM.
   */
  const startScanning = useCallback(() => {
    if (!isSupported) {
      setError('Camera is not supported in this browser.')
      updatePhase('error')
      return
    }

    stoppedRef.current = false
    confidenceMapRef.current.clear()
    setBarcodeSet(null)
    setError(null)
    setHits(0)
    updatePhase('starting')
  }, [isSupported, updatePhase])

  /**
   * Runs after React renders the container div (phase === 'starting').
   * Retries via requestAnimationFrame until containerRef.current is available,
   * bridging Mantine Modal's double-RAF delay before content appears in the DOM.
   */
  useEffect(() => {
    if (phase !== 'starting') return

    let cancelled = false
    let rafId: number

    const tryInit = async () => {
      if (cancelled) return

      const container = containerRef.current
      if (!container) {
        // Mantine's Modal content appears after 2 requestAnimationFrames — retry
        rafId = requestAnimationFrame(tryInit)
        return
      }

      try {
        await new Promise<void>((resolve, reject) => {
          Quagga.init(buildQuaggaConfig(container), (err: unknown) => {
            if (err) {
              reject(err)
              return
            }
            resolve()
          })
        })

        if (cancelled || stoppedRef.current) {
          await Quagga.stop().catch((_err: unknown) => undefined)
          return
        }

        quaggaRunningRef.current = true
        Quagga.start()
        updatePhase('scanning')
        Quagga.onDetected(handleDetectedRef.current)
      } catch (err) {
        if (!cancelled) {
          setError(describeCameraError(err))
          updatePhase('error')
        }
      }
    }

    rafId = requestAnimationFrame(tryInit)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }
      stopScanning()
    }
  }, [stopScanning])

  return {
    phase,
    barcodeSet,
    error,
    isSupported,
    containerRef,
    hits,
    startScanning,
    stopScanning,
    resetScan,
  }
}
