import { useState, useRef, useCallback, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
  ReedSolomonException,
  ResultMetadataType,
} from '@zxing/library'
import {
  classifyBarcode,
  normalizeToEan13,
  type ComicBarcodeSet,
} from './barcode-validation'

export type ScannerPhase =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'confirming'
  | 'complete'
  | 'error'

export interface BarcodeSet {
  main: string
  supplement?: string
  fullUpc: string
}

interface UseBarcodeScanner {
  phase: ScannerPhase
  barcodeSet: BarcodeSet | null
  error: string | null
  isSupported: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  mainHits: number
  supplementHits: number
  startScanning: () => Promise<void>
  stopScanning: () => void
  resetScan: () => void
}

const CONFIDENCE_THRESHOLD = 3

function buildReader(): BrowserMultiFormatReader {
  const hints = new Map<DecodeHintType, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  return new BrowserMultiFormatReader(hints)
}

function buildBarcodeSet(set: ComicBarcodeSet): BarcodeSet {
  const main = normalizeToEan13(set.main)
  const fullUpc = set.supplement ? main + set.supplement : main
  return { main, supplement: set.supplement, fullUpc }
}

export function useBarcodeScanner(): UseBarcodeScanner {
  const [phase, setPhase] = useState<ScannerPhase>('idle')
  const [barcodeSet, setBarcodeSet] = useState<BarcodeSet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mainHits, setMainHits] = useState(0)
  const [supplementHits, setSupplementHits] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const rafRef = useRef<number | null>(null)
  const stoppedRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const unexpectedErrorCountRef = useRef(0)

  // Confidence tracking — refs only, no re-render per frame
  const confidenceMapRef = useRef<Map<string, number>>(new Map())
  const confirmedMainRef = useRef<string | null>(null)
  const piggybackedSupplementRef = useRef<string | null>(null)
  const phaseRef = useRef<ScannerPhase>('idle')

  // Keep phaseRef in sync so the scan loop can read it without closures
  const updatePhase = useCallback((p: ScannerPhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'

  // Tears down camera hardware only — does NOT change phase
  const stopScanning = useCallback(() => {
    stoppedRef.current = true

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    readerRef.current = null
  }, [])

  const resetScan = useCallback(() => {
    stopScanning()
    confidenceMapRef.current.clear()
    confirmedMainRef.current = null
    piggybackedSupplementRef.current = null
    stoppedRef.current = false
    setBarcodeSet(null)
    setError(null)
    setMainHits(0)
    setSupplementHits(0)
    updatePhase('idle')
  }, [stopScanning, updatePhase])

  const finalizeScan = useCallback(
    (set: ComicBarcodeSet) => {
      stopScanning()
      setBarcodeSet(buildBarcodeSet(set))
      updatePhase('complete')
    },
    [stopScanning, updatePhase]
  )

  const startScanning = useCallback(async () => {
    if (!isSupported) {
      setError('Camera is not supported in this browser.')
      updatePhase('error')
      return
    }

    stoppedRef.current = false
    unexpectedErrorCountRef.current = 0
    confidenceMapRef.current.clear()
    confirmedMainRef.current = null
    piggybackedSupplementRef.current = null
    setBarcodeSet(null)
    setError(null)
    setMainHits(0)
    setSupplementHits(0)
    updatePhase('starting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (stoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      streamRef.current = stream

      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()

      updatePhase('scanning')

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        throw new Error('Could not get canvas context for barcode decoding.')
      }

      readerRef.current = buildReader()
      const reader = readerRef.current

      const scan = () => {
        if (stoppedRef.current || !videoRef.current) return

        const video = videoRef.current
        if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(scan)
          return
        }

        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight)
          canvas.height = video.videoHeight

        if (canvas.width === 0 || canvas.height === 0) {
          rafRef.current = requestAnimationFrame(scan)
          return
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        try {
          const result = reader.decodeFromCanvas(canvas)
          if (result && !stoppedRef.current) {
            const text = result.getText()
            const currentPhase = phaseRef.current

            // Check for piggybacked supplement in result metadata
            const meta = result.getResultMetadata()
            const piggybackedSupplement = meta?.get(
              ResultMetadataType.UPC_EAN_EXTENSION
            ) as string | undefined

            if (currentPhase === 'scanning') {
              const kind = classifyBarcode(text)
              if (kind === 'main') {
                const count = (confidenceMapRef.current.get(text) ?? 0) + 1
                confidenceMapRef.current.set(text, count)
                setMainHits(Math.min(count, CONFIDENCE_THRESHOLD))

                // Accumulate piggybacked supplement across all hits
                if (
                  piggybackedSupplement &&
                  /^\d{5}$/.test(piggybackedSupplement)
                ) {
                  piggybackedSupplementRef.current = piggybackedSupplement
                }

                if (count >= CONFIDENCE_THRESHOLD) {
                  confirmedMainRef.current = text
                  confidenceMapRef.current.clear()
                  updatePhase('confirming')
                }
              }
            } else if (currentPhase === 'confirming') {
              const kind = classifyBarcode(text)

              // Determine the supplement value from current frame or prior detection
              const supplement =
                piggybackedSupplement && /^\d{5}$/.test(piggybackedSupplement)
                  ? piggybackedSupplement
                  : kind === 'supplement'
                  ? text
                  : kind === 'main' && piggybackedSupplementRef.current
                  ? piggybackedSupplementRef.current
                  : null

              if (supplement) {
                if (supplement !== piggybackedSupplementRef.current) {
                  piggybackedSupplementRef.current = supplement
                }

                const count =
                  (confidenceMapRef.current.get(supplement) ?? 0) + 1
                confidenceMapRef.current.set(supplement, count)
                setSupplementHits(Math.min(count, CONFIDENCE_THRESHOLD))

                if (count >= CONFIDENCE_THRESHOLD && confirmedMainRef.current) {
                  finalizeScan({ main: confirmedMainRef.current, supplement })
                  return
                }
              }
            }
          }
        } catch (err) {
          if (
            err instanceof NotFoundException ||
            err instanceof ReedSolomonException
          ) {
            unexpectedErrorCountRef.current = 0
          } else {
            unexpectedErrorCountRef.current += 1
            console.warn('Barcode decode error:', err)
            if (unexpectedErrorCountRef.current > 30) {
              setError(
                'Barcode scanner encountered repeated errors. Please try again.'
              )
              updatePhase('error')
              stopScanning()
              return
            }
          }
        }

        if (!stoppedRef.current) {
          rafRef.current = requestAnimationFrame(scan)
        }
      }

      rafRef.current = requestAnimationFrame(scan)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to access camera.'
      const friendlyMessage = message.includes('Permission')
        ? 'Camera permission denied. Please allow camera access and try again.'
        : message.includes('NotFound') || message.includes('DevicesNotFound')
        ? 'No camera found on this device.'
        : 'Failed to start camera. Please try again.'
      setError(friendlyMessage)
      updatePhase('error')
    }
  }, [isSupported, stopScanning, updatePhase, finalizeScan])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stoppedRef.current = true
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (canvasRef.current) {
        canvasRef.current.width = 0
        canvasRef.current = null
      }
    }
  }, [])

  return {
    phase,
    barcodeSet,
    error,
    isSupported,
    videoRef,
    mainHits,
    supplementHits,
    startScanning,
    stopScanning,
    resetScan,
  }
}
