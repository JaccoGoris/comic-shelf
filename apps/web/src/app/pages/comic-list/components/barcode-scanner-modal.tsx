import { useCallback, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  Modal,
  Stack,
  Text,
  Group,
  Loader,
  Alert,
  Center,
  Image,
  Badge,
  Button,
  Box,
  Title,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react'
import type { MetronIssueDetailDto } from '@comic-shelf/shared-types'
import { searchMetron, getMetronIssue, importMetronIssue } from '../../../../api/client'
import { getErrorMessage } from '../../../../utils/error'
import { useBarcodeScanner } from '../hooks/use-barcode-scanner'
import { CSButton } from '../../../components/cs-button'

type LookupStatus = 'idle' | 'looking-up' | 'found' | 'not-found' | 'error'

interface BarcodeScannerModalProps {
  opened: boolean
  onClose: () => void
  onImported: () => void
}

export function BarcodeScannerModal({
  opened,
  onClose,
  onImported,
}: BarcodeScannerModalProps) {
  const isMobile = useMediaQuery('(max-width: 48em)')

  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [comicDetail, setComicDetail] = useState<MetronIssueDetailDto | null>(null)
  const [importing, setImporting] = useState(false)

  // Guard state updates from in-flight API calls after unmount
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    setLookupStatus('looking-up')
    setLookupError(null)
    setComicDetail(null)

    try {
      // Search Metron by UPC
      const results = await searchMetron({ upc: barcode })
      if (!mountedRef.current) return

      if (!results || results.length === 0) {
        setLookupStatus('not-found')
        return
      }

      // Fetch full detail of the first result
      const detail = await getMetronIssue(results[0].id)
      if (!mountedRef.current) return

      setComicDetail(detail)
      setLookupStatus('found')
    } catch (err) {
      if (!mountedRef.current) return
      setLookupError(getErrorMessage(err, 'Failed to look up comic. Please try again.'))
      setLookupStatus('error')
    }
  }, [])

  const { status, detectedBarcode, error: cameraError, isSupported, videoRef, startScanning, resetScan } =
    useBarcodeScanner(handleBarcodeDetected)

  // Start scanning when modal opens
  useEffect(() => {
    if (opened && status === 'idle') {
      startScanning()
    }
  }, [opened, status, startScanning])

  const resetLookup = useCallback(() => {
    resetScan()
    setLookupStatus('idle')
    setLookupError(null)
    setComicDetail(null)
  }, [resetScan])

  const handleClose = useCallback(() => {
    resetLookup()
    onClose()
  }, [resetLookup, onClose])

  const handleScanAgain = useCallback(() => {
    resetLookup()
    startScanning()
  }, [resetLookup, startScanning])

  const handleImport = useCallback(async () => {
    if (!comicDetail) return
    setImporting(true)
    try {
      await importMetronIssue(comicDetail.id)
      notifications.show({
        title: 'Comic Added',
        message: `"${comicDetail.series.name} #${comicDetail.number}" has been added to your collection.`,
        color: 'green',
      })
      handleClose()
      onImported()
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to import comic.')
      if (msg.includes('already exists')) {
        notifications.show({
          title: 'Already in Collection',
          message: msg,
          color: 'yellow',
        })
        handleClose()
      } else {
        setLookupError(msg)
        setLookupStatus('error')
      }
    } finally {
      setImporting(false)
    }
  }, [comicDetail, handleClose, onImported])

  const showCamera = status === 'starting' || status === 'scanning'

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Scan Comic Barcode"
      size="lg"
      fullScreen={isMobile}
      centered
    >
      <Stack gap="md">
        {/* Camera not supported */}
        {!isSupported && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Camera Not Supported">
            Your browser does not support camera access. Try Chrome or Safari on a mobile device.
          </Alert>
        )}

        {/* Camera error */}
        {cameraError && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            title="Camera Error"
          >
            {cameraError}
          </Alert>
        )}

        {/* Lookup error */}
        {lookupError && lookupStatus === 'error' && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            title="Lookup Error"
            withCloseButton
            onClose={() => setLookupError(null)}
          >
            {lookupError}
          </Alert>
        )}

        {/* Camera viewport — shown during scanning phases */}
        {isSupported && showCamera && (
          <Stack gap="xs">
            <Box
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4/3',
                backgroundColor: 'black',
                borderRadius: 'var(--mantine-radius-md)',
                overflow: 'hidden',
              }}
            >
              {/* Video element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: status === 'starting' ? 'none' : 'block',
                }}
              />

              {/* Loader while camera is starting */}
              {status === 'starting' && (
                <Center
                  style={{
                    position: 'absolute',
                    inset: 0,
                  }}
                >
                  <Stack align="center" gap="xs">
                    <Loader color="violet" size="lg" />
                    <Text size="sm" c="dimmed">
                      Starting camera...
                    </Text>
                  </Stack>
                </Center>
              )}

              {/* SVG overlay with scan window */}
              {status === 'scanning' && (
                <svg
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                  viewBox="0 0 400 300"
                  preserveAspectRatio="xMidYMid slice"
                >
                  {/* Dark mask with cutout */}
                  <defs>
                    <mask id="scan-mask">
                      <rect width="400" height="300" fill="white" />
                      <rect x="60" y="110" width="280" height="80" rx="4" fill="black" />
                    </mask>
                  </defs>
                  <rect
                    width="400"
                    height="300"
                    fill="rgba(0,0,0,0.55)"
                    mask="url(#scan-mask)"
                  />
                  {/* Animated border around scan window */}
                  <rect
                    x="60"
                    y="110"
                    width="280"
                    height="80"
                    rx="4"
                    fill="none"
                    stroke="var(--mantine-color-violet-4)"
                    strokeWidth="2"
                  >
                    <animate
                      attributeName="stroke-opacity"
                      values="1;0.4;1"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </rect>
                  {/* Scanning line animation */}
                  <line
                    x1="64"
                    y1="150"
                    x2="336"
                    y2="150"
                    stroke="var(--mantine-color-violet-5)"
                    strokeWidth="1.5"
                    strokeOpacity="0.8"
                  >
                    <animate
                      attributeName="y1"
                      values="114;186;114"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="y2"
                      values="114;186;114"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="stroke-opacity"
                      values="0.8;0.3;0.8"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </line>
                </svg>
              )}
            </Box>

            {status === 'scanning' && (
              <Text size="sm" c="dimmed" ta="center">
                Point the barcode at the rectangle to scan
              </Text>
            )}
          </Stack>
        )}

        {/* Barcode detected — looking up */}
        {detectedBarcode && lookupStatus === 'looking-up' && (
          <Center py="xl">
            <Stack align="center" gap="md">
              <Loader color="violet" size="lg" />
              <Stack align="center" gap="xs">
                <Text fw={600}>Barcode detected</Text>
                <Badge variant="light" color="violet" size="lg">
                  {detectedBarcode}
                </Badge>
                <Text size="sm" c="dimmed">Looking up comic on Metron...</Text>
              </Stack>
            </Stack>
          </Center>
        )}

        {/* Comic not found */}
        {lookupStatus === 'not-found' && (
          <Stack align="center" gap="md" py="md">
            <Alert icon={<IconAlertCircle size={16} />} color="orange" title="No Comic Found" w="100%">
              No comic was found for barcode <strong>{detectedBarcode}</strong>. The barcode may not be in the Metron database.
            </Alert>
            <CSButton
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={handleScanAgain}
            >
              Scan Again
            </CSButton>
          </Stack>
        )}

        {/* Lookup error with scan again */}
        {lookupStatus === 'error' && (
          <Center>
            <CSButton
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={handleScanAgain}
            >
              Scan Again
            </CSButton>
          </Center>
        )}

        {/* Comic found */}
        {lookupStatus === 'found' && comicDetail && (
          <Stack gap="md">
            <Group align="flex-start" wrap="wrap" gap="md">
              {comicDetail.image && (
                <Image
                  src={comicDetail.image}
                  w={120}
                  radius="sm"
                  alt={`${comicDetail.series.name} #${comicDetail.number} cover`}
                />
              )}
              <Stack gap="xs" style={{ flex: 1, minWidth: 160 }}>
                <Title order={4}>
                  {comicDetail.series.name} #{comicDetail.number}
                </Title>
                {comicDetail.title && (
                  <Text size="sm" c="dimmed">
                    {comicDetail.title}
                  </Text>
                )}
                <Group gap="xs" wrap="wrap">
                  <Badge variant="light" color="violet">
                    {comicDetail.publisher.name}
                  </Badge>
                  <Badge variant="light" color="gray">
                    {comicDetail.coverDate}
                  </Badge>
                </Group>
                {comicDetail.upc && (
                  <Text size="xs" c="dimmed">
                    UPC: {comicDetail.upc}
                  </Text>
                )}
              </Stack>
            </Group>

            <Group justify="flex-end" gap="sm">
              <Button
                variant="subtle"
                size="sm"
                leftSection={<IconRefresh size={14} />}
                onClick={handleScanAgain}
              >
                Scan Again
              </Button>
              <CSButton
                leftSection={<IconCheck size={16} />}
                loading={importing}
                onClick={handleImport}
              >
                Add to Collection
              </CSButton>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}
