import { useEffect, useState } from 'react'
import { TagsInput, type TagsInputProps } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'

interface TagsInputFieldProps extends Omit<TagsInputProps, 'data'> {
  fetchOptions: (search?: string) => Promise<string[]>
}

export function TagsInputField({
  fetchOptions,
  onSearchChange,
  ...props
}: TagsInputFieldProps) {
  const [search, setSearch] = useState('')
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
    <TagsInput
      data={options}
      splitChars={[',']}
      onSearchChange={(val) => {
        setSearch(val)
        onSearchChange?.(val)
      }}
      {...props}
    />
  )
}
