import axios from 'axios'

export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}
