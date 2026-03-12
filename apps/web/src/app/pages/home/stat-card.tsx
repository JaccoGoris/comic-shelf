import { Paper, Group, Text, Box } from '@mantine/core'
import { Sparkline } from '@mantine/charts'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  sub?: React.ReactNode
  sparklineData?: number[]
  sparklineColor?: string
  valueColor?: string
}

export function StatCard({
  label,
  value,
  icon,
  sub,
  sparklineData,
  sparklineColor = 'violet.6',
  valueColor,
}: StatCardProps) {
  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {label}
        </Text>
        {icon}
      </Group>
      <Text fw={700} size="xl" c={valueColor}>
        {value}
      </Text>
      {sub && (
        <Text size="xs" c="dimmed" mt={4}>
          {sub}
        </Text>
      )}
      {sparklineData && sparklineData.length > 1 && (
        <Box mt="xs">
          <Sparkline
            h={30}
            data={sparklineData}
            color={sparklineColor}
            curveType="monotone"
            fillOpacity={0.15}
          />
        </Box>
      )}
    </Paper>
  )
}
