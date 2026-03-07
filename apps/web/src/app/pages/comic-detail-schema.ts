import { z } from 'zod';

const CREATOR_ROLES = [
  'WRITER',
  'ARTIST',
  'PENCILLER',
  'INKER',
  'COLORIST',
  'COVER_ARTIST',
  'LETTERER',
  'EDITOR',
  'CREATED_BY',
] as const;

const GENRE_TYPES = ['GENRE', 'SUBGENRE'] as const;

const COLLECTION_TYPES = ['COLLECTION', 'WISHLIST'] as const;

export const comicFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  synopsis: z.string().nullable(),
  issueNumber: z.string().nullable(),
  volume: z.string().nullable(),
  year: z.number().int().positive().nullable(),
  coverDate: z.string().nullable(),
  barcode: z.string().nullable(),
  legacyNumber: z.string().nullable(),
  variantNumber: z.string().nullable(),
  coverLetter: z.string().nullable(),
  era: z.string().nullable(),
  language: z.string().nullable(),
  country: z.string().nullable(),
  typeOfComic: z.string().nullable(),
  numberOfPages: z.number().int().positive().nullable(),
  printing: z.string().nullable(),
  coverPriceCents: z.number().int().min(0).nullable(),
  coverPriceCurrency: z.string().nullable(),
  read: z.boolean(),
  preordered: z.boolean(),
  forSale: z.boolean(),
  quantity: z.number().int().min(1),
  condition: z.string().nullable(),
  storageLocation: z.string().nullable(),
  loanedTo: z.string().nullable(),
  signedBy: z.string().nullable(),
  personalRating: z.string().nullable(),
  purchasePriceCents: z.number().int().min(0).nullable(),
  purchasePriceCurrency: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  purchasedFrom: z.string().nullable(),
  collectionWishlist: z.enum(COLLECTION_TYPES).nullable(),
  notes: z.string().nullable(),
  gradedBy: z.string().nullable(),
  gradedRating: z.string().nullable(),
  gradedLabelType: z.string().nullable(),
  gradedSerialNumber: z.string().nullable(),
  graderNotes: z.string().nullable(),
  pageQuality: z.string().nullable(),
  publisherName: z.string().nullable(),
  seriesName: z.string().nullable(),
  creators: z.array(
    z.object({
      name: z.string().min(1, 'Creator name is required'),
      role: z.enum(CREATOR_ROLES),
    }),
  ),
  characters: z.array(
    z.object({
      name: z.string().min(1, 'Character name is required'),
    }),
  ),
  storyArcs: z.array(
    z.object({
      name: z.string().min(1, 'Story arc name is required'),
    }),
  ),
  genres: z.array(
    z.object({
      name: z.string().min(1, 'Genre name is required'),
      type: z.enum(GENRE_TYPES),
    }),
  ),
});

export type ComicFormValues = z.infer<typeof comicFormSchema>;
