import axios from 'axios'
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
  MetronSyncStatusDto,
  MetronSingleSyncResultDto,
  CreateComicDto,
  UpdateComicDto,
  AuthStatusDto,
  UserDto,
  LoginDto,
  SetupDto,
  CreateUserDto,
  BackupImportResultDto,
  SiteSettingsDto,
  UpdateSiteSettingsDto,
} from '@comic-shelf/shared-types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// ─── Auth ─────────────────────────────────────────────────

export async function getAuthStatus(): Promise<AuthStatusDto> {
  const { data } = await api.get('/auth/status')
  return data
}

export async function login(dto: LoginDto): Promise<{ user: UserDto }> {
  const { data } = await api.post('/auth/login', dto)
  return data
}

export async function setup(dto: SetupDto): Promise<{ user: UserDto }> {
  const { data } = await api.post('/auth/setup', dto)
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

// ─── Users ────────────────────────────────────────────────

export async function getUsers(): Promise<UserDto[]> {
  const { data } = await api.get('/users')
  return data
}

export async function createUser(dto: CreateUserDto): Promise<UserDto> {
  const { data } = await api.post('/users', dto)
  return data
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`)
}

// ─── Comics ──────────────────────────────────────────────

export interface ComicFilters {
  page?: number
  limit?: number
  search?: string
  publisherId?: number
  seriesId?: number
  creatorId?: number
  characterId?: number
  genreId?: number
  read?: boolean
  collectionWishlist?: string
  sortBy?: string
  sortOrder?: string
}

export async function getComics(
  filters: ComicFilters = {},
): Promise<PaginatedResponse<ComicListItemDto>> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  )
  const { data } = await api.get('/comics', { params })
  return data
}

export async function createComic(dto: CreateComicDto): Promise<ComicDetailDto> {
  const { data } = await api.post('/comics', dto)
  return data
}

export async function getComic(id: number): Promise<ComicDetailDto> {
  const { data } = await api.get(`/comics/${id}`)
  return data
}

export async function updateComic(
  id: number,
  dto: UpdateComicDto,
): Promise<ComicDetailDto> {
  const { data } = await api.patch(`/comics/${id}`, dto)
  return data
}

export async function deleteComic(id: number): Promise<void> {
  await api.delete(`/comics/${id}`)
}

// ─── Import ──────────────────────────────────────────────

export async function importComics(file: File): Promise<ImportResultDto> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5 min for large imports
  })
  return data
}

// ─── Backup ──────────────────────────────────────────────

export async function exportBackup(): Promise<void> {
  const response = await api.get('/backup/export', { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/json' }))
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `comic-shelf-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File): Promise<BackupImportResultDto> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/backup/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  })
  return data
}

// ─── Settings ───────────────────────────────────────────

export async function getSettings(): Promise<SiteSettingsDto> {
  const { data } = await api.get('/settings')
  return data
}

export async function updateSettings(dto: UpdateSiteSettingsDto): Promise<SiteSettingsDto> {
  const { data } = await api.patch('/settings', dto)
  return data
}

// ─── Resources (for filters) ─────────────────────────────

export async function getPublishers(search?: string): Promise<PublisherDto[]> {
  const { data } = await api.get('/publishers', {
    params: search ? { search } : {},
  })
  return data
}

export async function getSeries(
  search?: string,
  publisherId?: number,
): Promise<SeriesDto[]> {
  const params: Record<string, string | number> = {}
  if (search) params['search'] = search
  if (publisherId) params['publisherId'] = publisherId
  const { data } = await api.get('/series', { params })
  return data
}

export async function getCreators(search?: string): Promise<CreatorDto[]> {
  const { data } = await api.get('/creators', {
    params: search ? { search } : {},
  })
  return data
}

export async function getCharacters(search?: string): Promise<CharacterDto[]> {
  const { data } = await api.get('/characters', {
    params: search ? { search } : {},
  })
  return data
}

export async function getGenres(search?: string): Promise<GenreDto[]> {
  const { data } = await api.get('/genres', {
    params: search ? { search } : {},
  })
  return data
}

export async function getStoryArcs(search?: string): Promise<StoryArcDto[]> {
  const { data } = await api.get('/story-arcs', {
    params: search ? { search } : {},
  })
  return data
}

// ─── Metron ──────────────────────────────────────────────

export async function searchMetron(params: {
  upc?: string
  series_name?: string
  number?: string
  publisher_name?: string
}): Promise<MetronSearchResultDto[]> {
  const { data } = await api.get('/metron/search', { params })
  return data
}

export async function getMetronIssue(
  metronId: number,
): Promise<MetronIssueDetailDto> {
  const { data } = await api.get(`/metron/issue/${metronId}`)
  return data
}

export async function importMetronIssue(
  metronId: number,
): Promise<MetronImportResultDto> {
  const { data } = await api.post(`/metron/import/${metronId}`)
  return data
}

export async function startMetronSync(): Promise<MetronSyncStatusDto> {
  const { data } = await api.post('/metron/sync')
  return data
}

export async function getMetronSyncStatus(): Promise<MetronSyncStatusDto> {
  const { data } = await api.get('/metron/sync/status')
  return data
}

export async function stopMetronSync(): Promise<MetronSyncStatusDto> {
  const { data } = await api.delete('/metron/sync')
  return data
}

export async function syncSingleComic(
  comicId: number,
): Promise<MetronSingleSyncResultDto> {
  const { data } = await api.post(`/metron/sync/${comicId}`)
  return data
}
