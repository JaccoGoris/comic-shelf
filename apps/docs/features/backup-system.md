# Backup System

Comic Shelf includes a versioned backup system to export and restore your collection.

## Exporting

Navigate to Settings > Backup and click **Export**. This downloads a JSON file containing your entire collection.

## Importing

Upload a previously exported JSON file. The backup system automatically migrates older backup versions to the current schema.

## Versioning & Migrations

Each backup includes a `version` field. When importing, the system runs sequential migration functions to upgrade old backups:

```
V1 → V2 → V3 → current
```

When adding new database fields, the backup system must be updated — see `CLAUDE.md` for the full checklist.
