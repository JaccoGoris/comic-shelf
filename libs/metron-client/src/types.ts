// ─── Client config ───────────────────────────────────────

export interface MetronClientConfig {
  baseUrl: string
  username: string
  password: string
  timeout?: number
  minRequestIntervalMs?: number
}

// ─── Metron API response types ───────────────────────────

export interface MetronPaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface MetronIssueListItem {
  id: number
  series: {
    name: string
    volume: number
    year_began: number
  }
  number: string
  issue: string
  cover_date: string
  store_date: string | null
  image: string | null
  cover_hash: string
  modified: string
}

export interface MetronIssueDetail {
  id: number
  publisher: { id: number; name: string }
  imprint: { id: number; name: string } | null
  series: {
    id: number
    name: string
    sort_name: string
    volume: number
    year_began: number
    series_type: { id: number; name: string }
    genres: { id: number; name: string }[]
  }
  number: string
  alt_number: string
  title: string
  name: string[]
  cover_date: string
  store_date: string | null
  foc_date: string | null
  price: string | null
  price_currency: string | null
  rating: { id: number; name: string } | null
  sku: string
  isbn: string
  upc: string
  page: number | null
  desc: string
  image: string | null
  cover_hash: string
  arcs: { id: number; name: string; modified: string }[]
  credits: {
    id: number
    creator: string
    role: { id: number; name: string }[]
  }[]
  characters: { id: number; name: string; modified: string }[]
  teams: { id: number; name: string; modified: string }[]
  universes: { id: number; name: string; modified: string }[]
  reprints: unknown[]
  variants: unknown[]
  cv_id: number | null
  gcd_id: number | null
  resource_url: string
  modified: string
}

export interface MetronIssueSearchParams {
  upc?: string
  series_name?: string
  number?: string
  publisher_name?: string
}

export interface MetronSeriesListItem {
  id: number
  series: string
  volume: number
  year_began: number
  issue_count: number
  modified: string
}

export interface MetronSeriesSearchParams {
  name?: string
  publisher_name?: string
  page?: number
}
