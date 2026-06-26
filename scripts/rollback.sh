#!/bin/sh
# scripts/rollback.sh — Protocol 16 hotfix rollback
#
# Restores users first by reverting the offending commit and bumping
# CACHE_NAME so every cached client receives the update prompt immediately.
#
# Usage (from repo root, in Git Bash):
#   sh scripts/rollback.sh           # reverts HEAD
#   sh scripts/rollback.sh <hash>    # reverts a specific commit
#
# After this script commits, push manually:
#   git push origin main
#
# Then diagnose the root cause, add a regression test (Protocol 13),
# and record it in CHANGELOG.md before re-attempting the fix.

set -e

COMMIT=${1:-HEAD}

echo ""
echo "  [rollback] Staging revert of $COMMIT ..."
git revert --no-commit "$COMMIT"

# Parse current CACHE_NAME and increment the -rN suffix
CURRENT=$(grep "^const CACHE_NAME" sw.js | sed "s/.*'\([^']*\)'.*/\1/")
BASE=$(echo "$CURRENT" | sed 's/-r[0-9]*$//')
N=$(echo "$CURRENT" | sed 's/.*-r\([0-9]*\)$/\1/')
NEXT_N=$((N + 1))
NEW_CACHE="${BASE}-r${NEXT_N}"

echo "  [rollback] Bumping CACHE_NAME: $CURRENT -> $NEW_CACHE"
perl -i -pe "s|const CACHE_NAME = '[^']*'|const CACHE_NAME = '$NEW_CACHE'|" sw.js

git add sw.js

git commit -m "revert: hotfix rollback — restore pre-$COMMIT state (Protocol 16)

Reverted the offending commit and bumped CACHE_NAME to force an update
prompt on all cached clients. Diagnose root cause before re-attempting.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

echo ""
echo "  [rollback] Rollback committed. New cache rev: $NEW_CACHE"
echo "  [rollback] Push now:  git push origin main"
echo "  [rollback] Then diagnose the root cause and add a regression test (Protocol 13)."
echo ""
