import { Group, Text } from '@mantine/core'

export interface DonutLegendItem {
  name: string
  value: number
  color: string
}

export function DonutLegend({ data }: { data: DonutLegendItem[] }) {
  return (
    <Group justify="center" mt="xs" gap="lg" wrap="wrap">
      {data.map((d) => (
        <Group key={d.name} gap={6}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: `var(--mantine-color-${d.color.replace('.', '-')})`,
              flexShrink: 0,
            }}
          />
          <Text size="xs">
            {d.name}: {d.value}
          </Text>
        </Group>
      ))}
    </Group>
  )
}
