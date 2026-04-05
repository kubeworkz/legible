---
sidebar_position: 13
title: Backup & Restore Metadata
description: Export and import models, instructions, and SQL pairs via API for version control and disaster recovery.
---

# Backup & Restore Metadata

Back up and restore your Models (MDL) and Knowledge metadata using Legible's REST API. This enables version control, safe iteration, rollback, and team collaboration through Git.

## Overview

Legible exposes CRUD APIs for:

- **Model definitions (MDL)** — schema and semantic layer metadata
- **Knowledge instructions** — domain-specific guidance for the AI
- **SQL pairs** — question–SQL example pairs

Using these APIs, you can:

1. **Export (backup)** the current state of models and knowledge
2. **Store** them as structured files on disk
3. **Version control** them with Git
4. **Restore (sync)** the files back when needed

## Prerequisites

- A valid Legible **API Key** (see [API Access](./api-access.md))
- Python 3.8+ with the `requests` library
- Access to a local filesystem or Git repository

## What Gets Backed Up

| Resource | Description | File |
|----------|-------------|------|
| MDL | Model metadata and schema definitions | `models.json` |
| Instructions | Knowledge instructions used by the AI | `instructions.json` |
| SQL Pairs | Question–SQL example pairs | `sql_pairs.json` |

## Backup File Structure

```
backup/
├── models.json
├── instructions.json
└── sql_pairs.json
```

This structure is human-readable, Git-friendly, and deterministic for predictable restores.

## Backup Models & Knowledge

### Step 1: Configure Credentials

Set your API key and project ID as environment variables:

```bash
export LEGIBLE_API_KEY=your_api_key_here
export LEGIBLE_PROJECT_ID=your_project_id
```

### Step 2: Run the Backup Script

Save the following as `legible_backup.py` and run it:

```bash
python legible_backup.py
```

**`legible_backup.py`:**

```python
import os
import json
import sys

import requests

# 1. Configuration
API_KEY = os.getenv("LEGIBLE_API_KEY")
PROJECT_ID = os.getenv("LEGIBLE_PROJECT_ID")

if not API_KEY or not PROJECT_ID:
    print("Error: Missing LEGIBLE_API_KEY or LEGIBLE_PROJECT_ID environment variables.")
    sys.exit(1)

BASE_URL = f"https://legiblequery.ai/api/v1/projects/{PROJECT_ID}"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# 2. Define endpoints and target filenames
tasks = {
    "models.json": f"{BASE_URL}/models",
    "instructions.json": f"{BASE_URL}/knowledge/instructions",
    "sql_pairs.json": f"{BASE_URL}/knowledge/sql_pairs",
}

# 3. Prepare backup directory
backup_dir = "backup"
os.makedirs(backup_dir, exist_ok=True)
print(f"Directory '{backup_dir}' is ready.")
print(f"Fetching current state for Project: {PROJECT_ID}...")

# Fields to strip from exported data (server-managed metadata)
STRIP_FIELDS = ("createdAt", "updatedAt", "createdBy", "updatedBy", "projectId")

# 4. Fetch and save each resource
for filename, url in tasks.items():
    try:
        print(f"Fetching {filename}...")
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()
        file_path = os.path.join(backup_dir, filename)

        with open(file_path, "w", encoding="utf-8") as f:
            # Strip server-managed fields from list items
            if isinstance(data, list):
                filtered = [
                    {k: v for k, v in item.items() if k not in STRIP_FIELDS}
                    if isinstance(item, dict) else item
                    for item in data
                ]
                json.dump(filtered, f, ensure_ascii=False, indent=2)
            else:
                json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"Saved to {file_path}")

    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch {filename}: {e}")
    except IOError as e:
        print(f"Failed to write {filename}: {e}")

print("Backup completed.")
```

After execution, the script will:
- Fetch all models and knowledge via API
- Strip server-managed metadata fields (`createdAt`, `updatedAt`, etc.)
- Save clean JSON files into the `backup/` directory

### Step 3: Store in Git (Optional but Recommended)

```bash
git add backup/
git commit -m "Backup Legible models and knowledge"
```

This allows you to track changes over time, review diffs, and roll back to any previous version.

## Restore Models & Knowledge

### Before You Restore

:::warning
- Restore operations **overwrite** existing models and knowledge
- Ensure the `backup/` directory structure has not been modified
- Verify you are restoring to the correct project
:::

### Step 1: Verify Backup Structure

Ensure your backup directory matches the expected layout:

```
backup/
├── models.json
├── instructions.json
└── sql_pairs.json
```

### Step 2: Run the Restore Script

Save the following as `legible_restore.py` and run it:

```bash
python legible_restore.py
```

**`legible_restore.py`:**

```python
import os
import json
import sys

import requests

# 1. Configuration
API_KEY = os.getenv("LEGIBLE_API_KEY")
PROJECT_ID = os.getenv("LEGIBLE_PROJECT_ID")

if not API_KEY or not PROJECT_ID:
    print("Error: Missing LEGIBLE_API_KEY or LEGIBLE_PROJECT_ID environment variables.")
    sys.exit(1)

BASE_URL = f"https://legiblequery.ai/api/v1/projects/{PROJECT_ID}"
BACKUP_DIR = "backup"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# Fields to exclude from API payloads (server-managed metadata)
EXCLUDED_FIELDS = {"id", "projectId", "createdAt", "updatedAt", "createdBy", "updatedBy"}


def load_backup(filename):
    """Read a backup JSON file."""
    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        print(f"Backup file not found: {filepath}. Skipping.")
        return None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return None


def restore_mdl():
    """Restore Model Definition (MDL) via PUT /api/v1/projects/{projectId}."""
    print("\n--- Restoring Models (MDL) ---")
    mdl_object = load_backup("models.json")
    if not mdl_object:
        return

    payload = {"mdl": mdl_object}
    try:
        response = requests.put(BASE_URL, headers=headers, json=payload)
        response.raise_for_status()
        print("Models (MDL) updated successfully.")
    except requests.exceptions.RequestException as e:
        print(f"Failed to update Models: {e}")
        if e.response is not None:
            print(f"  Response: {e.response.text}")


def sync_resource(name, backup_filename, api_path):
    """
    Sync a resource (Instructions or SQL Pairs) using delta logic:
    1. Load backup and current server state
    2. Update existing items, create new ones
    3. Delete server items not present in backup
    """
    print(f"\n--- Restoring {name} ---")

    # 1. Load backup
    backup_list = load_backup(backup_filename)
    if backup_list is None:
        return

    # 2. Fetch current server state
    list_url = f"{BASE_URL}/{api_path}"
    try:
        resp = requests.get(list_url, headers=headers)
        resp.raise_for_status()
        current_list = resp.json()
    except Exception as e:
        print(f"Failed to fetch current {name}: {e}")
        return

    current_map = {
        str(item.get("id")): item
        for item in current_list
        if item.get("id") is not None
    }

    processed_server_ids = set()

    # 3. Process backup items (update or create)
    for item in backup_list:
        item_id = str(item.get("id")) if "id" in item else None
        payload = {k: v for k, v in item.items() if k not in EXCLUDED_FIELDS}

        if item_id and item_id in current_map:
            # Update existing
            print(f"  Updating {name} ID: {item_id}")
            try:
                requests.put(
                    f"{list_url}/{item_id}", headers=headers, json=payload
                ).raise_for_status()
                processed_server_ids.add(item_id)
            except Exception as e:
                print(f"    Update failed: {e}")
        else:
            # Create new
            print(f"  Creating {name} (new item)")
            try:
                requests.post(
                    list_url, headers=headers, json=payload
                ).raise_for_status()
            except Exception as e:
                print(f"    Create failed: {e}")

    # 4. Delete items on server that are not in backup
    for item_id in current_map:
        if item_id not in processed_server_ids:
            print(f"  Deleting {name} ID: {item_id} (not in backup)")
            try:
                requests.delete(
                    f"{list_url}/{item_id}", headers=headers
                ).raise_for_status()
            except Exception as e:
                print(f"    Delete failed: {e}")


if __name__ == "__main__":
    print(f"Starting restore for Project: {PROJECT_ID}")

    restore_mdl()
    sync_resource("Instructions", "instructions.json", "knowledge/instructions")
    sync_resource("SQL Pairs", "sql_pairs.json", "knowledge/sql_pairs")

    print("\nRestore completed.")
```

The restore script will:
- **MDL**: Replace the project's model definition via `PUT`
- **Instructions & SQL Pairs**: Perform a delta sync — update existing items, create new ones, and delete items that are no longer in the backup

## Using with the CLI

You can also use the Legible CLI for individual operations:

```bash
# Export models
legible model list --format json > backup/models.json

# Export knowledge
legible instruction list --format json > backup/instructions.json
legible sql-pair list --format json > backup/sql_pairs.json
```

## Best Practices

- **Schedule regular backups** — run the backup script on a cron or CI schedule
- **Use Git branches** — create a branch per environment (staging, production)
- **Review before restore** — use `git diff` to inspect changes before restoring
- **Test on staging first** — always restore to a non-production project before production
- **Keep API keys secure** — use environment variables or a secrets manager, never commit keys to Git
