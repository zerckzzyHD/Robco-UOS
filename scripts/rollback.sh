#!/bin/sh
# scripts/rollback.sh — Protocol 16 hotfix rollback (DEV-FIRST, per Protocol 43)
#
# Restores users by reverting the offending commit and bumping CACHE_NAME so
# every cached client receives the update prompt. Per Protocol 43, `main` is
# release-only and is NEVER pushed directly: the revert lands on `dev`, clears
# the full gate, and reaches production by the same verified `dev → main` path
# every release uses. This script does the revert on `dev` and then prints the
# promotion procedure — it deliberately does NOT push to `main` (or anywhere).
#
# Why dev-first (owner decision, 2026-07-21): "main would only get pushed when
# we know the build is good." Accepted tradeoff: routing an emergency through the
# gate adds a little latency exactly when prod is broken and speed matters — the
# owner judged main-integrity worth that cost. Mitigant: a rollback reverts to a
# commit that was ALREADY gated and already lived in main's history, so the
# target is known-good code, not new code being rushed onto prod.
#
# Usage (from repo root, in Git Bash), ON THE `dev` BRANCH:
#   sh scripts/rollback.sh           # reverts HEAD
#   sh scripts/rollback.sh <hash>    # reverts a specific commit
#
# The script refuses to run on any branch other than `dev`.

set -e

# ── Guard: dev-first. Refuse to run anywhere but `dev` (the whole point). ──
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "dev" ]; then
  echo ""
  echo "  [rollback] Refusing to run on '$BRANCH'."
  echo "  [rollback] Rollback is DEV-FIRST (Protocol 43): main is release-only and"
  echo "  [rollback] is never pushed directly. Check out 'dev' and re-run —"
  echo "  [rollback]   git checkout dev"
  echo "  [rollback] The revert reaches prod via the normal dev -> main release path."
  echo ""
  exit 1
fi

COMMIT=${1:-HEAD}

echo ""
echo "  [rollback] Staging revert of $COMMIT on dev ..."
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

git commit -m "revert: hotfix rollback on dev — restore pre-$COMMIT state (Protocol 16/43)

Reverted the offending commit and bumped CACHE_NAME to force an update
prompt on all cached clients. Landed on dev; promote to prod via the normal
dev -> main release path. Diagnose root cause before re-attempting.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"

echo ""
echo "  [rollback] Revert committed on dev. New cache rev: $NEW_CACHE"
echo ""
echo "  [rollback] NEXT — restore users the verified way (main stays release-only):"
echo "  [rollback]   1. git push origin dev"
echo "  [rollback]      # runs the full gate + CI and refreshes the staging site,"
echo "  [rollback]      # proving the revert is good before it can touch prod."
echo "  [rollback]   2. Promote to production exactly as a release does — merge"
echo "  [rollback]      dev -> main (the same gated path every release uses)."
echo "  [rollback]   3. Publish to prod: production is release-gated, so either cut"
echo "  [rollback]      the rollback as a patch APP_VERSION release (automated deploy),"
echo "  [rollback]      or run deploy.yml's manual 'workflow_dispatch' from the"
echo "  [rollback]      Actions tab (emergency redeploy of the now-reverted main)."
echo "  [rollback]   See ARCHITECTURE.md 'Hotfix Rollback (Protocol 16)' for the full runbook."
echo ""
echo "  [rollback] Then diagnose the root cause and add a regression test (Protocol 13)."
echo ""
