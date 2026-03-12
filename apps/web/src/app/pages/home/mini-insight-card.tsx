import { Paper, Stack, Text } from '@mantine/core'

export function MiniInsightCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color?: string
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack align="center" gap={4}>
        {icon}
        <Text fw={700} size="lg" c={color}>
          {value}
        </Text>
        <Text size="xs" c="dimmed" ta="center">
          {label}
        </Text>
      </Stack>
    </Paper>
  )
}
