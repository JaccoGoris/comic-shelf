import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsMobile } from '../../../hooks/use-is-mobile'
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
  Box,
  Title,
  SimpleGrid,
  Card,
  Stepper,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconCheck,
  IconRefresh,
  IconArrowLeft,
  IconBarcode,
} from '@tabler/icons-react'
import type {
  MetronSearchResultDto,
  MetronIssueDetailDto,
} from '@comic-shelf/shared-types'
import {
  searchMetron,
  getMetronIssue,
  importMetronIssue,
} from '../../../../api/client'
import { getErrorMessage } from '../../../../utils/error'
import { useBarcodeScanner } from '../hooks/use-barcode-scanner'
import { CSButton } from '../../../components/cs-button'
import classes from './barcode-scanner.module.css'

type ModalStep =
  | 'scanning'
  | 'looking-up'
  | 'results'
  | 'preview'
  | 'not-found'
  | 'error'

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
  const isMobile = useIsMobile()

  const [step, setStep] = useState<ModalStep>('scanning')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [results, setResults] = useState<MetronSearchResultDto[]>([])
  const [comicDetail, setComicDetail] = useState<MetronIssueDetailDto | null>(
    null
  )
  const [importing, setImporting] = useState(false)

  // Guard state updates from in-flight API calls after unmount/reset
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const {
    phase,
    barcodeSet,
    error: cameraError,
    isSupported,
    containerRef,
    hits,
    startScanning,
    resetScan,
  } = useBarcodeScanner()

  // Fix for the restart loop: only react to open/close transitions
  const prevOpenedRef = useRef(false)
  useEffect(() => {
    if (opened && !prevOpenedRef.current) {
      startScanning()
    }
    if (!opened && prevOpenedRef.current) {
      resetScan()
      setStep('scanning')
      setLookupError(null)
      setResults([])
      setComicDetail(null)
    }
    prevOpenedRef.current = opened
  }, [opened, startScanning, resetScan])

  // Stop camera when tab is hidden; resume when it becomes visible again
  useEffect(() => {
    if (!opened) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        resetScan()
      } else {
        startScanning()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [opened, resetScan, startScanning])

  // Trigger lookup when scan completes
  useEffect(() => {
    if (phase !== 'complete' || !barcodeSet) return

    setStep('looking-up')
    setLookupError(null)

    let cancelled = false

    const doLookup = async () => {
      try {
        let found: MetronSearchResultDto[] = []

        if (cancelled || !mountedRef.current) return
        const result = await searchMetron({ upc: barcodeSet.fullUpc })
        if (result && result.length > 0) {
          found = result
        }

        if (cancelled || !mountedRef.current) return

        if (found.length === 0) {
          setStep('not-found')
          return
        }

        if (found.length === 1) {
          // Auto-proceed to preview for single result
          const detail = await getMetronIssue(found[0].id)
          if (cancelled || !mountedRef.current) return
          setComicDetail(detail)
          setResults(found)
          setStep('preview')
        } else {
          setResults(found)
          setStep('results')
        }
      } catch (err) {
        if (cancelled || !mountedRef.current) return
        setLookupError(
          getErrorMessage(err, 'Failed to look up comic. Please try again.')
        )
        setStep('error')
      }
    }

    doLookup()

    return () => {
      cancelled = true
    }
  }, [phase, barcodeSet])

  const handleSelectIssue = useCallback(async (id: number) => {
    setStep('looking-up')
    try {
      const detail = await getMetronIssue(id)
      if (!mountedRef.current) return
      setComicDetail(detail)
      setStep('preview')
    } catch (err) {
      if (!mountedRef.current) return
      setLookupError(getErrorMessage(err, 'Failed to load comic details.'))
      setStep('error')
    }
  }, [])

  const handleScanAgain = useCallback(() => {
    resetScan()
    setStep('scanning')
    setLookupError(null)
    setResults([])
    setComicDetail(null)
    startScanning()
  }, [resetScan, startScanning])

  const handleClose = useCallback(() => {
    resetScan()
    onClose()
  }, [resetScan, onClose])

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
        setStep('error')
      }
    } finally {
      if (mountedRef.current) setImporting(false)
    }
  }, [comicDetail, handleClose, onImported])

  const showCamera =
    step === 'scanning' && (phase === 'starting' || phase === 'scanning')

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
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            title="Camera Not Supported"
          >
            Your browser does not support camera access. Try Chrome or Safari on
            a mobile device.
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
        {lookupError && step === 'error' && (
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

        {/* ── Step: Scanning ── */}
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
              <div
                ref={containerRef}
                className={classes.scanContainer}
                style={{ width: '100%', height: '100%' }}
              />

              {phase === 'starting' && (
                <Center style={{ position: 'absolute', inset: 0 }}>
                  <Stack align="center" gap="xs">
                    <Loader color="violet" size="lg" />
                    <Text size="sm" c="dimmed">
                      Starting camera...
                    </Text>
                  </Stack>
                </Center>
              )}

              {phase === 'scanning' && (
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
                  <defs>
                    <mask id="scan-mask">
                      <rect width="400" height="300" fill="white" />
                      <rect
                        x="60"
                        y="110"
                        width="280"
                        height="80"
                        rx="4"
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect
                    width="400"
                    height="300"
                    fill="rgba(0,0,0,0.55)"
                    mask="url(#scan-mask)"
                  />
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

            {phase === 'scanning' && (
              <Stack align="center" gap="xs">
                <Stepper
                  active={hits}
                  size="xs"
                  color="violet"
                >
                  {[0, 1, 2].map((i) => (
                    <Stepper.Step
                      key={i}
                      icon={<IconBarcode size={14} />}
                      completedIcon={<IconCheck size={14} />}
                    />
                  ))}
                </Stepper>
                <Text size="sm" c="dimmed" ta="center">
                  Scanning barcode...
                </Text>
              </Stack>
            )}
          </Stack>
        )}

        {/* ── Step: Looking up ── */}
        {step === 'looking-up' && (
          <Center py="xl">
            <Stack align="center" gap="md">
              <Loader color="violet" size="lg" />
              <Stack align="center" gap="xs">
                <Text fw={600}>Barcode detected</Text>
                <Badge variant="light" color="violet" size="lg">
                  {barcodeSet?.fullUpc}
                </Badge>
                <Text size="sm" c="dimmed">
                  Looking up comic on Metron...
                </Text>
              </Stack>
            </Stack>
          </Center>
        )}

        {/* ── Step: Results (multiple matches) ── */}
        {step === 'results' && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {results.length} result{results.length !== 1 ? 's' : ''} found —
              pick one
            </Text>
            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="md">
              {results.map((issue) => (
                <Card
                  key={issue.id}
                  shadow="sm"
                  padding="sm"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSelectIssue(issue.id)}
                >
                  {issue.image && (
                    <Card.Section>
                      <Image
                        src={issue.image}
                        h={200}
                        fit="cover"
                        alt={issue.issue}
                      />
                    </Card.Section>
                  )}
                  <Stack gap="xs" mt="sm">
                    <Text fw={600} size="sm" lineClamp={2}>
                      {issue.issue}
                    </Text>
                    <Text size="xs" c="violet">
                      {issue.series.name} (Vol. {issue.series.volume},{' '}
                      {issue.series.yearBegan})
                    </Text>
                    <Group gap="xs">
                      <Badge variant="light" size="sm">
                        #{issue.number}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {issue.coverDate}
                      </Text>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && comicDetail && (
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
        )}

        {/* ── Step: Not found ── */}
        {step === 'not-found' && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="orange"
            title="No Comic Found"
          >
            No comic was found for barcode{' '}
            <strong>{barcodeSet?.fullUpc}</strong>. The barcode may not be in
            the Metron database.
          </Alert>
        )}

        {/* ── Shared footer: all post-scan steps ── */}
        {step !== 'scanning' && step !== 'looking-up' && (
          <Group justify="flex-end" gap="sm" wrap="wrap">
            {step === 'preview' && results.length > 1 && (
              <CSButton
                variant="subtle"
                size="sm"
                rightSection={<IconArrowLeft size={14} />}
                onClick={() => setStep('results')}
              >
                Back to Results
              </CSButton>
            )}
            <CSButton
              variant="subtle"
              size="sm"
              rightSection={<IconRefresh size={14} />}
              onClick={handleScanAgain}
            >
              Scan Again
            </CSButton>
            {step === 'preview' && (
              <CSButton
                rightSection={<IconCheck size={16} />}
                loading={importing}
                onClick={handleImport}
              >
                Add to Collection
              </CSButton>
            )}
          </Group>
        )}
      </Stack>
    </Modal>
  )
}
