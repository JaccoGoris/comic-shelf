import axios from 'axios';
import type {
  ComicListItemDto,
  ComicDetailDto,
  PaginatedResponse,
  ImportResultDto,
  PublisherDto,
  SeriesDto,
  CreatorDto,
  CharacterDto,
  GenreDto,
  StoryArcDto,
  MetronSearchResultDto,
  MetronIssueDetailDto,
  MetronImportResultDto,
} from '@comic-shelf/shared-types';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// ─── Comics ──────────────────────────────────────────────

export interface ComicFilters {
  page?: number;
  limit?: number;
  search?: string;
  publisherId?: number;
  seriesId?: number;
  creatorId?: number;
  characterId?: number;
  genreId?: number;
  read?: boolean;
  collectionWishlist?: string;
  sortBy?: string;
  sortOrder?: string;
}

export async function getComics(
  filters: ComicFilters = {},
): Promise<PaginatedResponse<ComicListItemDto>> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  );
  const { data } = await api.get('/comics', { params });
  return data;
}

export async function getComic(id: number): Promise<ComicDetailDto> {
  const { data } = await api.get(`/comics/${id}`);
  return data;
}

export async function deleteComic(id: number): Promise<void> {
  await api.delete(`/comics/${id}`);
}

// ─── Import ──────────────────────────────────────────────

export async function importComics(
  file: File,
): Promise<ImportResultDto> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5 min for large imports
  });
  return data;
}

// ─── Resources (for filters) ─────────────────────────────

export async function getPublishers(
  search?: string,
): Promise<PublisherDto[]> {
  const { data } = await api.get('/publishers', {
    params: search ? { search } : {},
  });
  return data;
}

export async function getSeries(
  search?: string,
  publisherId?: number,
): Promise<SeriesDto[]> {
  const params: Record<string, string | number> = {};
  if (search) params['search'] = search;
  if (publisherId) params['publisherId'] = publisherId;
  const { data } = await api.get('/series', { params });
  return data;
}

export async function getCreators(
  search?: string,
): Promise<CreatorDto[]> {
  const { data } = await api.get('/creators', {
    params: search ? { search } : {},
  });
  return data;
}

export async function getCharacters(
  search?: string,
): Promise<CharacterDto[]> {
  const { data } = await api.get('/characters', {
    params: search ? { search } : {},
  });
  return data;
}

export async function getGenres(search?: string): Promise<GenreDto[]> {
  const { data } = await api.get('/genres', {
    params: search ? { search } : {},
  });
  return data;
}

export async function getStoryArcs(
  search?: string,
): Promise<StoryArcDto[]> {
  const { data } = await api.get('/story-arcs', {
    params: search ? { search } : {},
  });
  return data;
}

// ─── Metron ──────────────────────────────────────────────

export async function searchMetronByUpc(
  upc: string,
): Promise<MetronSearchResultDto[]> {
  const { data } = await api.get('/metron/search', {
    params: { upc },
  });
  return data;
}

export async function getMetronIssue(
  metronId: number,
): Promise<MetronIssueDetailDto> {
  const { data } = await api.get(`/metron/issue/${metronId}`);
  return data;
}

export async function importMetronIssue(
  metronId: number,
): Promise<MetronImportResultDto> {
  const { data } = await api.post(`/metron/import/${metronId}`);
  return data;
}
