import { useEffect, useState } from 'react'
import { Autocomplete, type AutocompleteProps } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'

interface TypeaheadFieldProps extends Omit<AutocompleteProps, 'data'> {
  fetchOptions: (search?: string) => Promise<string[]>
}

export function TypeaheadField({
  fetchOptions,
  defaultValue,
  onChange,
  ...props
}: TypeaheadFieldProps) {
  const [search, setSearch] = useState<string>(
    typeof defaultValue === 'string' ? defaultValue : ''
  )
  const [options, setOptions] = useState<string[]>([])
  const [debounced] = useDebouncedValue(search, 300)

  useEffect(() => {
    let cancelled = false
    fetchOptions(debounced || undefined)
      .then((results) => {
        if (!cancelled) setOptions([...new Set(results)])
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <Autocomplete
      data={options}
      value={search}
      {...props}
      onChange={(val) => {
        setSearch(val)
        onChange?.(val)
      }}
    />
  )
}
