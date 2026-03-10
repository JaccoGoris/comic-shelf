// ─── Auth ────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'USER'

export interface UserDto {
  id: number
  username: string
  role: UserRole
  createdAt: string
}

export interface LoginDto {
  username: string
  password: string
}

export interface SetupDto {
  username: string
  password: string
}

export interface CreateUserDto {
  username: string
  password: string
  role: UserRole
}

export interface AuthStatusDto {
  setupComplete: boolean
  authenticated: boolean
  user: UserDto | null
}

// ─── Enums ───────────────────────────────────────────────

export type CreatorRole =
  | 'WRITER'
  | 'ARTIST'
  | 'PENCILLER'
  | 'INKER'
  | 'COLORIST'
  | 'COVER_ARTIST'
  | 'LETTERER'
  | 'EDITOR'
  | 'CREATED_BY'

export type GenreType = 'GENRE' | 'SUBGENRE'

export type CollectionType = 'COLLECTION' | 'WISHLIST'

// ─── API Response Types ──────────────────────────────────

export interface PublisherDto {
  id: number
  name: string
}

export interface SeriesDto {
  id: number
  name: string
  publisher?: PublisherDto | null
}

export interface StoryArcDto {
  id: number
  name: string
}

export interface CreatorDto {
  id: number
  name: string
}

export interface CharacterDto {
  id: number
  name: string
  alias?: string | null
}

export interface GenreDto {
  id: number
  name: string
}

export interface ComicCreatorDto {
  role: CreatorRole
  creator: CreatorDto
}

export interface ComicGenreDto {
  type: GenreType
  genre: GenreDto
}

export interface ComicListItemDto {
  id: number
  itemId: string // BigInt serialized as string
  title: string
  issueNumber?: string | null
  volume?: string | null
  coverDate?: string | null
  year?: number | null
  read: boolean
  coverPriceCents?: number | null
  coverPriceCurrency?: string | null
  publisher?: PublisherDto | null
  series?: SeriesDto | null
  typeOfComic?: string | null
  metronId?: number | null
  coverImageUrl?: string | null
}

export interface ComicDetailDto extends ComicListItemDto {
  barcode?: string | null
  synopsis?: string | null
  legacyNumber?: string | null
  month?: string | null
  variantNumber?: string | null
  coverLetter?: string | null
  purchaseType?: string | null
  attributes?: string | null
  country?: string | null
  printing?: string | null
  printRun?: number | null
  printOrderRatio?: string | null
  coverPriceRaw?: string | null
  coverExclusive?: string | null
  era?: string | null
  language?: string | null
  numberOfPages?: number | null
  preordered: boolean
  quantity: number
  loanedTo?: string | null
  estimatedValue?: string | null
  purchasePriceRaw?: string | null
  purchasePriceCents?: number | null
  purchasePriceCurrency?: string | null
  purchaseDate?: string | null
  purchasedFrom?: string | null
  forSale: boolean
  soldFor?: string | null
  personalRating?: string | null
  signedBy?: string | null
  condition?: string | null
  gradedBy?: string | null
  gradedRating?: string | null
  gradedLabelType?: string | null
  gradedSerialNumber?: string | null
  graderNotes?: string | null
  pageQuality?: string | null
  storageLocation?: string | null
  notes?: string | null
  owner?: string | null
  collectionName?: string | null
  dateAdded?: string | null
  collectionWishlist?: CollectionType | null
  storyArcs: StoryArcDto[]
  creators: ComicCreatorDto[]
  characters: CharacterDto[]
  genres: ComicGenreDto[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ImportResultDto {
  imported: number
  skipped: number
  errors: string[]
}

// ─── Metron API Types ────────────────────────────────────

export interface MetronSearchResultDto {
  id: number
  series: {
    name: string
    volume: number
    yearBegan: number
  }
  number: string
  issue: string
  coverDate: string
  storeDate?: string | null
  image?: string | null
}

export interface MetronCreditDto {
  id: number
  creator: string
  role: { id: number; name: string }[]
}

export interface MetronIssueDetailDto {
  id: number
  publisher: { id: number; name: string }
  imprint?: { id: number; name: string } | null
  series: {
    id: number
    name: string
    sortName: string
    volume: number
    yearBegan: number
    seriesType: { id: number; name: string }
    genres: { id: number; name: string }[]
  }
  number: string
  title?: string | null
  name: string[]
  coverDate: string
  storeDate?: string | null
  price?: string | null
  priceCurrency?: string | null
  upc?: string | null
  isbn?: string | null
  page?: number | null
  desc?: string | null
  image?: string | null
  arcs: { id: number; name: string }[]
  credits: MetronCreditDto[]
  characters: { id: number; name: string }[]
  teams: { id: number; name: string }[]
  resourceUrl: string
}

export interface MetronImportResultDto {
  comicId: number
}

export interface MetronSyncStatusDto {
  running: boolean
  cancelled: boolean
  total: number
  processed: number
  found: number
  skipped: number
  failed: number
  startedAt: string | null
  completedAt: string | null
}

export interface MetronSingleSyncResultDto {
  status: 'synced' | 'skipped' | 'failed'
  reason?: string
  updatedFields?: string[]
}

// ─── Backup ─────────────────────────────────────────────

export interface BackupComicDto {
  itemId: string
  metronId: number | null
  barcode: string | null
  title: string
  synopsis: string | null
  issueNumber: string | null
  legacyNumber: string | null
  volume: string | null
  month: string | null
  year: number | null
  variantNumber: string | null
  coverLetter: string | null
  purchaseType: string | null
  attributes: string | null
  country: string | null
  printing: string | null
  printRun: number | null
  printOrderRatio: string | null
  coverDate: string | null
  coverPriceRaw: string | null
  coverPriceCents: number | null
  coverPriceCurrency: string | null
  coverExclusive: string | null
  coverImageUrl: string | null
  era: string | null
  language: string | null
  typeOfComic: string | null
  numberOfPages: number | null
  preordered: boolean
  quantity: number
  loanedTo: string | null
  estimatedValue: string | null
  purchasePriceRaw: string | null
  purchasePriceCents: number | null
  purchasePriceCurrency: string | null
  purchaseDate: string | null
  purchasedFrom: string | null
  forSale: boolean
  soldFor: string | null
  personalRating: string | null
  signedBy: string | null
  condition: string | null
  read: boolean
  gradedBy: string | null
  gradedRating: string | null
  gradedLabelType: string | null
  gradedSerialNumber: string | null
  graderNotes: string | null
  pageQuality: string | null
  storageLocation: string | null
  notes: string | null
  owner: string | null
  collectionName: string | null
  dateAdded: string | null
  storeDate: string | null
  createdAt: string
  updatedAt: string
  collectionWishlist: CollectionType | null
  publisher: string | null
  series: string | null
  creators: { name: string; role: CreatorRole }[]
  characters: { name: string; alias: string | null }[]
  storyArcs: string[]
  genres: { name: string; type: GenreType }[]
}

export interface BackupEnvelope {
  version: number
  exportedAt: string
  comics: BackupComicDto[]
}

export interface BackupImportResultDto {
  created: number
  updated: number
  errors: string[]
}

// ─── Dashboard Stats ─────────────────────────────────────

export interface NameCountItem { name: string; count: number }
export interface YearCountItem { year: number; count: number }
export interface MonthCountItem { month: string; count: number }

export interface RecentComicDto {
  id: number
  title: string
  issueNumber: string | null
  coverImageUrl: string | null
  publisher: string | null
  series: string | null
  dateAdded: string
}

export interface DashboardStatsDto {
  totalComics: number
  totalRead: number
  totalUnread: number
  readPercentage: number
  collectionCount: number
  wishlistCount: number
  totalCoverValueCents: number
  totalPurchaseSpendCents: number
  publisherCount: number
  seriesCount: number
  comicsByPublisher: NameCountItem[]
  comicsBySeries: NameCountItem[]
  comicsByYear: YearCountItem[]
  comicsByGenre: NameCountItem[]
  comicsAddedPerMonth: MonthCountItem[]
  recentlyAdded: RecentComicDto[]
}

// ─── Site Settings ──────────────────────────────────────

export interface SiteSettingsDto {
  collectionName: string
}

export interface UpdateSiteSettingsDto {
  collectionName?: string
}

// ─── Create DTO ─────────────────────────────────────────

export interface CreateComicDto {
  title: string
  synopsis?: string | null
  issueNumber?: string | null
  volume?: string | null
  year?: number | null
  coverDate?: string | null
  barcode?: string | null
  legacyNumber?: string | null
  variantNumber?: string | null
  coverLetter?: string | null
  era?: string | null
  language?: string | null
  country?: string | null
  typeOfComic?: string | null
  numberOfPages?: number | null
  printing?: string | null
  coverPriceCents?: number | null
  coverPriceCurrency?: string | null
  read?: boolean
  preordered?: boolean
  forSale?: boolean
  quantity?: number
  condition?: string | null
  storageLocation?: string | null
  loanedTo?: string | null
  signedBy?: string | null
  personalRating?: string | null
  purchasePriceCents?: number | null
  purchasePriceCurrency?: string | null
  purchaseDate?: string | null
  purchasedFrom?: string | null
  collectionWishlist?: CollectionType | null
  notes?: string | null
  gradedBy?: string | null
  gradedRating?: string | null
  gradedLabelType?: string | null
  gradedSerialNumber?: string | null
  graderNotes?: string | null
  pageQuality?: string | null
  publisher?: { name: string } | null
  series?: { name: string } | null
  creators?: { name: string; role: CreatorRole }[]
  characters?: { name: string }[]
  storyArcs?: { name: string }[]
  genres?: { name: string; type: GenreType }[]
}

// ─── Update DTO ─────────────────────────────────────────

export interface UpdateComicDto {
  title?: string
  synopsis?: string | null
  issueNumber?: string | null
  volume?: string | null
  year?: number | null
  coverDate?: string | null
  barcode?: string | null
  legacyNumber?: string | null
  variantNumber?: string | null
  coverLetter?: string | null
  era?: string | null
  language?: string | null
  country?: string | null
  typeOfComic?: string | null
  numberOfPages?: number | null
  printing?: string | null
  coverPriceCents?: number | null
  coverPriceCurrency?: string | null
  read?: boolean
  preordered?: boolean
  forSale?: boolean
  quantity?: number
  condition?: string | null
  storageLocation?: string | null
  loanedTo?: string | null
  signedBy?: string | null
  personalRating?: string | null
  purchasePriceCents?: number | null
  purchasePriceCurrency?: string | null
  purchaseDate?: string | null
  purchasedFrom?: string | null
  collectionWishlist?: CollectionType | null
  notes?: string | null
  gradedBy?: string | null
  gradedRating?: string | null
  gradedLabelType?: string | null
  gradedSerialNumber?: string | null
  graderNotes?: string | null
  pageQuality?: string | null
  publisher?: { name: string } | null
  series?: { name: string } | null
  creators?: { name: string; role: CreatorRole }[]
  characters?: { name: string }[]
  storyArcs?: { name: string }[]
  genres?: { name: string; type: GenreType }[]
}
