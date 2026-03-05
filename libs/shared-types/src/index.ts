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
  | 'CREATED_BY';

export type GenreType = 'GENRE' | 'SUBGENRE';

export type CollectionType = 'COLLECTION' | 'WISHLIST';

// ─── API Response Types ──────────────────────────────────

export interface PublisherDto {
  id: number;
  name: string;
}

export interface SeriesDto {
  id: number;
  name: string;
  publisher?: PublisherDto | null;
}

export interface StoryArcDto {
  id: number;
  name: string;
}

export interface CreatorDto {
  id: number;
  name: string;
}

export interface CharacterDto {
  id: number;
  name: string;
  alias?: string | null;
}

export interface GenreDto {
  id: number;
  name: string;
}

export interface ComicCreatorDto {
  role: CreatorRole;
  creator: CreatorDto;
}

export interface ComicGenreDto {
  type: GenreType;
  genre: GenreDto;
}

export interface ComicListItemDto {
  id: number;
  itemId: string; // BigInt serialized as string
  title: string;
  issueNumber?: string | null;
  coverDate?: string | null;
  year?: number | null;
  read: boolean;
  coverPriceCents?: number | null;
  coverPriceCurrency?: string | null;
  publisher?: PublisherDto | null;
  series?: SeriesDto | null;
  typeOfComic?: string | null;
  metronId?: number | null;
  coverImageUrl?: string | null;
}

export interface ComicDetailDto extends ComicListItemDto {
  barcode?: string | null;
  synopsis?: string | null;
  legacyNumber?: string | null;
  volume?: string | null;
  month?: string | null;
  variantNumber?: string | null;
  coverLetter?: string | null;
  purchaseType?: string | null;
  attributes?: string | null;
  country?: string | null;
  printing?: string | null;
  printRun?: number | null;
  printOrderRatio?: string | null;
  coverPriceRaw?: string | null;
  coverExclusive?: string | null;
  era?: string | null;
  language?: string | null;
  numberOfPages?: number | null;
  preordered: boolean;
  quantity: number;
  loanedTo?: string | null;
  estimatedValue?: string | null;
  purchasePriceRaw?: string | null;
  purchasePriceCents?: number | null;
  purchasePriceCurrency?: string | null;
  purchaseDate?: string | null;
  purchasedFrom?: string | null;
  forSale: boolean;
  soldFor?: string | null;
  personalRating?: string | null;
  signedBy?: string | null;
  condition?: string | null;
  gradedBy?: string | null;
  gradedRating?: string | null;
  gradedLabelType?: string | null;
  gradedSerialNumber?: string | null;
  graderNotes?: string | null;
  pageQuality?: string | null;
  storageLocation?: string | null;
  notes?: string | null;
  owner?: string | null;
  collectionName?: string | null;
  dateAdded?: string | null;
  collectionWishlist?: CollectionType | null;
  storyArcs: StoryArcDto[];
  creators: ComicCreatorDto[];
  characters: CharacterDto[];
  genres: ComicGenreDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ImportResultDto {
  imported: number;
  skipped: number;
  errors: string[];
}

// ─── Metron API Types ────────────────────────────────────

export interface MetronSearchResultDto {
  id: number;
  series: {
    name: string;
    volume: number;
    yearBegan: number;
  };
  number: string;
  issue: string;
  coverDate: string;
  storeDate?: string | null;
  image?: string | null;
}

export interface MetronCreditDto {
  id: number;
  creator: string;
  role: { id: number; name: string }[];
}

export interface MetronIssueDetailDto {
  id: number;
  publisher: { id: number; name: string };
  imprint?: { id: number; name: string } | null;
  series: {
    id: number;
    name: string;
    sortName: string;
    volume: number;
    yearBegan: number;
    seriesType: { id: number; name: string };
    genres: { id: number; name: string }[];
  };
  number: string;
  title?: string | null;
  name: string[];
  coverDate: string;
  storeDate?: string | null;
  price?: string | null;
  priceCurrency?: string | null;
  upc?: string | null;
  isbn?: string | null;
  page?: number | null;
  desc?: string | null;
  image?: string | null;
  arcs: { id: number; name: string }[];
  credits: MetronCreditDto[];
  characters: { id: number; name: string }[];
  teams: { id: number; name: string }[];
  resourceUrl: string;
}

export interface MetronImportResultDto {
  comicId: number;
}
