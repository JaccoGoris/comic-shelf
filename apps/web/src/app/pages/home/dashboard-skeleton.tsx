import { Container, Title, SimpleGrid, Skeleton } from '@mantine/core'

export function DashboardSkeleton() {
  return (
    <Container size="xl" py="xl">
      <Title mb="lg">Dashboard</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} mb="xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={110} radius="md" />
        ))}
      </SimpleGrid>
      <Skeleton height={40} radius="md" mb="sm" />
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={240} radius="md" />
        ))}
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">
        <Skeleton height={300} radius="md" />
        <Skeleton height={300} radius="md" />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">
        <Skeleton height={320} radius="md" />
        <Skeleton height={320} radius="md" />
      </SimpleGrid>
    </Container>
  )
}
