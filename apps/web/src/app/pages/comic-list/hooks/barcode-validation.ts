import { z } from 'zod'

// ─── Schemas ────────────────────────────────────────────────────────────────

/** A raw detected pair: the main 12/13-digit barcode and an optional 5-digit supplement. */
export const ComicBarcodeSetSchema = z.object({
  main: z.string(),
  supplement: z.string().optional(),
})

/**
 * The normalized, consumer-facing barcode result:
 * - `main`     — always EAN-13 (padded to 13 digits)
 * - `supplement` — raw 5-digit supplement if present
 * - `fullUpc`  — main + supplement concatenated, or just main
 */
export const BarcodeSetSchema = z.object({
  main: z.string(),
  supplement: z.string().optional(),
  fullUpc: z.string(),
})

// ─── Derived Types ───────────────────────────────────────────────────────────

export type ComicBarcodeSet = z.infer<typeof ComicBarcodeSetSchema>
export type BarcodeSet = z.infer<typeof BarcodeSetSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns whether a decoded barcode string is a main (EAN/UPC) code, a 5-digit supplement, or unrecognised. */
export function classifyBarcode(text: string): 'main' | 'supplement' | 'unknown' {
  if (/^\d{12,13}$/.test(text)) return 'main'
  if (/^\d{5}$/.test(text)) return 'supplement'
  return 'unknown'
}

/** Returns true when a string is a valid 5-digit supplement. */
export function isValidSupplement(value: string): boolean {
  return /^\d{5}$/.test(value)
}

/** Ensures a barcode is always in EAN-13 form (pads UPC-A 12-digit codes with a leading zero). */
export function normalizeToEan13(barcode: string): string {
  return barcode.length === 12 ? '0' + barcode : barcode
}

/** Builds the final `BarcodeSet` from a raw `ComicBarcodeSet`. */
export function buildBarcodeSet(raw: ComicBarcodeSet): BarcodeSet {
  const main = normalizeToEan13(raw.main)
  // When a supplement is present, strip the EAN-13 leading '0' so the
  // concatenated UPC matches the 17-digit format Metron stores (UPC-A + EAN-5).
  const upcMain = raw.main.length === 13 && raw.main.startsWith('0')
    ? raw.main.slice(1)
    : raw.main
  const fullUpc = raw.supplement ? upcMain + raw.supplement : main
  return { main, supplement: raw.supplement, fullUpc }
}
