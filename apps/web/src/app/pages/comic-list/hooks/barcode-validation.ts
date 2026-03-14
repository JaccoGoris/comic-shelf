export interface ComicBarcodeSet {
  main: string
  supplement?: string
}

export function classifyBarcode(text: string): 'main' | 'supplement' | 'unknown' {
  if (/^\d{12,13}$/.test(text)) return 'main'
  if (/^\d{5}$/.test(text)) return 'supplement'
  return 'unknown'
}

export function normalizeToEan13(barcode: string): string {
  return barcode.length === 12 ? '0' + barcode : barcode
}

