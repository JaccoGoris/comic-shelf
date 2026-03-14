import { useState, useRef, useCallback, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
  ReedSolomonException,
} from '@zxing/library'

export type ScannerStatus =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'detected'
  | 'error'

interface UseBarcodeScanner {
  status: ScannerStatus
  detectedBarcode: string | null
  error: string | null
  isSupported: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  startScanning: () => Promise<void>
  stopScanning: () => void
  resetScan: () => void
}

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

export function useBarcodeScanner(
  onBarcodeDetected?: (barcode: string) => void
): UseBarcodeScanner {
  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const rafRef = useRef<number | null>(null)
  const stoppedRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const unexpectedErrorCountRef = useRef(0)
  // Ref to always call the latest callback without restarting the scan loop
  const onBarcodeDetectedRef = useRef(onBarcodeDetected)
  onBarcodeDetectedRef.current = onBarcodeDetected

  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'

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
    setStatus('idle')
  }, [])

  const resetScan = useCallback(() => {
    stopScanning()
    setDetectedBarcode(null)
    setError(null)
    stoppedRef.current = false
  }, [stopScanning])

  const startScanning = useCallback(async () => {
    if (!isSupported) {
      setError('Camera is not supported in this browser.')
      setStatus('error')
      return
    }

    stoppedRef.current = false
    setDetectedBarcode(null)
    setError(null)
    setStatus('starting')

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

      setStatus('scanning')

      // Set up offscreen canvas for decoding
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

        // Only resize when dimensions actually change — assigning canvas.width
        // resets the bitmap buffer even when the value is identical.
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        try {
          const result = reader.decodeFromCanvas(canvas)
          if (result && !stoppedRef.current) {
            const text = result.getText()
            setDetectedBarcode(text)
            setStatus('detected')
            stopScanning()
            onBarcodeDetectedRef.current?.(text)
          }
        } catch (err) {
          // NotFoundException and ReedSolomonException are expected — thrown on every
          // frame that contains no barcode.
          if (
            err instanceof NotFoundException ||
            err instanceof ReedSolomonException
          ) {
            unexpectedErrorCountRef.current = 0
            if (!stoppedRef.current) {
              rafRef.current = requestAnimationFrame(scan)
            }
          } else {
            unexpectedErrorCountRef.current += 1
            console.warn('Barcode decode error:', err)
            if (unexpectedErrorCountRef.current > 30) {
              setError('Barcode scanner encountered repeated errors. Please try again.')
              setStatus('error')
              stopScanning()
            } else if (!stoppedRef.current) {
              rafRef.current = requestAnimationFrame(scan)
            }
          }
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
      setStatus('error')
    }
  }, [isSupported, stopScanning])

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
      // Release the off-screen canvas pixel buffer
      if (canvasRef.current) {
        canvasRef.current.width = 0
        canvasRef.current = null
      }
    }
  }, [])

  return {
    status,
    detectedBarcode,
    error,
    isSupported,
    videoRef,
    startScanning,
    stopScanning,
    resetScan,
  }
}
