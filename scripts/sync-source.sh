#!/bin/zsh

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
SOURCE_REPO="/Users/a./Documents/selva"
SITE_DIR="$REPO_ROOT/site"
BACKUP_DIR="$REPO_ROOT/source"

if [[ ! -d "$SOURCE_REPO" ]]; then
  echo "Source repo not found: $SOURCE_REPO" >&2
  exit 1
fi

mkdir -p "$SITE_DIR" "$BACKUP_DIR"

# Deploy only runtime files to Pages.
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude 'tests/' \
  --exclude 'docs/' \
  --exclude '.worktrees/' \
  --exclude 'worktrees/' \
  --exclude '.claude/' \
  --exclude '.superpowers/' \
  --exclude 'coverage/' \
  "$SOURCE_REPO"/ "$SITE_DIR"/

# Keep a broader source backup on GitHub for later recovery.
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude '.worktrees/' \
  --exclude 'worktrees/' \
  "$SOURCE_REPO"/ "$BACKUP_DIR"/

if [[ ! -f "$SITE_DIR/index.html" ]]; then
  echo "Deployed site is missing site/index.html after sync" >&2
  exit 1
fi

echo "Synced runtime files into $SITE_DIR"
echo "Backed up source files into $BACKUP_DIR"

