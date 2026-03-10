import axios, { type AxiosInstance } from 'axios'
import qs from 'qs'
import type {
  MetronClientConfig,
  MetronIssueDetail,
  MetronIssueListItem,
  MetronIssueSearchParams,
  MetronPaginatedResponse,
} from './types.js'

export class MetronApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryAfter?: number
  ) {
    super(message)
    this.name = 'MetronApiError'
  }
}

export class MetronClient {
  private readonly http: AxiosInstance
  private lastRequestTime = 0
  private blockedUntil = 0
  private pendingRequest: Promise<void> = Promise.resolve()
  private readonly minRequestIntervalMs: number

  constructor(config: MetronClientConfig) {
    this.http = axios.create({
      baseURL: config.baseUrl,
      auth: {
        username: config.username,
        password: config.password,
      },
      timeout: config.timeout ?? 15000,
      paramsSerializer: (params) => qs.stringify(params, { encode: true }),
    })
    this.minRequestIntervalMs = config.minRequestIntervalMs ?? 0
  }

  async searchIssues(
    params: MetronIssueSearchParams
  ): Promise<MetronPaginatedResponse<MetronIssueListItem>> {
    return this.enqueue<MetronPaginatedResponse<MetronIssueListItem>>(
      () => this.http.get('/api/issue/', { params }),
      'searchIssues'
    )
  }

  async getIssueDetail(id: number): Promise<MetronIssueDetail> {
    return this.enqueue<MetronIssueDetail>(
      () => this.http.get(`/api/issue/${id}/`),
      'getIssueDetail'
    )
  }

  private enqueue<T>(
    request: () => Promise<{ data: T }>,
    context: string,
    maxRetries = 3
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pendingRequest = this.pendingRequest.then(async () => {
        // Wait if rate-limited by a previous request
        const now = Date.now()
        if (this.blockedUntil > now) {
          await new Promise((r) => setTimeout(r, this.blockedUntil - now))
        }

        // Enforce minimum interval between requests
        if (this.minRequestIntervalMs > 0) {
          const elapsed = Date.now() - this.lastRequestTime
          if (elapsed < this.minRequestIntervalMs) {
            await new Promise((r) =>
              setTimeout(r, this.minRequestIntervalMs - elapsed)
            )
          }
        }

        // Execute with retry
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            this.lastRequestTime = Date.now()
            const response = await request()
            resolve(response.data)
            return
          } catch (error) {
            const axiosError = error as {
              response?: { status: number; headers: Record<string, string> }
              message?: string
            }

            if (axiosError.response?.status === 429 && attempt < maxRetries) {
              const waitMs = parseRetryAfter(
                axiosError.response.headers['retry-after']
              )
              this.blockedUntil = Date.now() + waitMs
              await new Promise((r) => setTimeout(r, waitMs))
              continue
            }

            if (axiosError.response) {
              const retryAfter =
                axiosError.response.status === 429
                  ? parseRetryAfter(axiosError.response.headers['retry-after'])
                  : undefined
              reject(
                new MetronApiError(
                  `Metron API error in ${context}: ${axiosError.response.status}`,
                  axiosError.response.status,
                  retryAfter
                )
              )
            } else {
              reject(
                new MetronApiError(
                  `Failed to reach Metron API in ${context}: ${
                    axiosError.message ?? String(error)
                  }`,
                  0
                )
              )
            }
            return
          }
        }
        reject(new MetronApiError(`${context} exhausted retries`, 429))
      })
    })
  }
}

function parseRetryAfter(header: string | undefined): number {
  if (!header) return 60_000
  const seconds = parseInt(header, 10)
  if (!isNaN(seconds)) return seconds * 1000
  const date = Date.parse(header)
  if (!isNaN(date)) return Math.max(0, date - Date.now())
  return 60_000
}
