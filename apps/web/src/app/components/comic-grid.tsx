import type { ReactNode } from 'react'
import { Center, Group, SegmentedControl, SimpleGrid } from '@mantine/core'
import { IconGridDots, IconLayoutGrid, IconList } from '@tabler/icons-react'
import { useViewMode } from '../hooks/use-view-mode'

function Toolbar({ extra }: { extra?: ReactNode }) {
  const { viewMode, setViewMode } = useViewMode()

  return (
    <Group justify="space-between">
      {extra ?? <span />}
      <SegmentedControl
        size="xs"
        value={viewMode}
        onChange={setViewMode}
        data={[
          {
            value: 'large',
            label: (
              <Center>
                <IconLayoutGrid size={16} />
              </Center>
            ),
          },
          {
            value: 'small',
            label: (
              <Center>
                <IconGridDots size={16} />
              </Center>
            ),
          },
          {
            value: 'row',
            label: (
              <Center>
                <IconList size={16} />
              </Center>
            ),
          },
        ]}
      />
    </Group>
  )
}

function Section({ children }: { children: ReactNode }) {
  const { gridCols } = useViewMode()

  return (
    <SimpleGrid type="container" cols={gridCols} spacing="md">
      {children}
    </SimpleGrid>
  )
}

export const ComicGrid = { Toolbar, Section }
