/**
 * Backup Migration Registry
 *
 * When adding a new DB field:
 * 1. Add field to BackupComicDto in shared-types
 * 2. Add to export mapping in backup.service.ts
 * 3. Add to scalarData import mapping in backup.service.ts
 * 4. Bump CURRENT_BACKUP_VERSION below
 * 5. Add a migrateVNtoVN1() function with sensible defaults for missing data
 * 6. Register it in the migrations map below
 */

import type { BackupComicDto } from '@comic-shelf/shared-types'

export const CURRENT_BACKUP_VERSION = 4

type PartialBackupComicDto = Record<string, unknown>

function migrateV1toV2(
  comics: PartialBackupComicDto[]
): PartialBackupComicDto[] {
  const now = new Date().toISOString()
  return comics.map((comic) => ({
    ...comic,
    storeDate: comic['storeDate'] ?? null,
    createdAt: (comic['dateAdded'] as string | null) ?? now,
    updatedAt: now,
  }))
}

function migrateV2toV3(
  comics: PartialBackupComicDto[]
): PartialBackupComicDto[] {
  return comics.map((comic) => ({
    ...comic,
    // Comics without a collectionWishlist default to COLLECTION (safe default for existing data)
    collectionWishlist: comic['collectionWishlist'] ?? null,
  }))
}

const migrations: Record<
  number,
  (comics: PartialBackupComicDto[]) => PartialBackupComicDto[]
> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
}

export function migrateToCurrentVersion(
  comics: PartialBackupComicDto[],
  fromVersion: number
): BackupComicDto[] {
  let current = comics
  for (let v = fromVersion; v < CURRENT_BACKUP_VERSION; v++) {
    const migrate = migrations[v]
    if (migrate) {
      current = migrate(current)
    }
  }
  return current as unknown as BackupComicDto[]
}
