# Selva Demo Site

This repository is an isolated publish target for the frontend demo in `/Users/a./Documents/selva`.

## Structure

- `site/`: files deployed to GitHub Pages
- `source/`: source backup copied from the local demo project
- `scripts/sync-source.sh`: syncs the latest local files into this publish repo

## Update flow

1. Edit files in `/Users/a./Documents/selva`.
2. Run `./scripts/sync-source.sh`.
3. Review changes in this repo.
4. Commit and push to `main`.
5. GitHub Pages redeploys automatically.

