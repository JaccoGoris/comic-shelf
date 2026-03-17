import { useSearchParams } from 'react-router-dom'

export type ViewMode = 'large' | 'small' | 'row'

export function useViewMode() {
  const [searchParams, setSearchParams] = useSearchParams()
  const viewMode = (searchParams.get('view') ?? 'large') as ViewMode

  const setViewMode = (value: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (value) {
        params.set('view', value)
      } else {
        params.delete('view')
      }
      return params
    })
  }

  const gridCols =
    viewMode === 'small'
      ? { base: 2, '400px': 3, '600px': 4, '900px': 6, '1200px': 8 }
      : { base: 1, '300px': 2, '500px': 3, '700px': 4, '1000px': 6 }

  return { viewMode, setViewMode, gridCols }
}
