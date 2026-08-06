#!/usr/bin/env bash
# Publish a Dsp32 GitHub release with all prebuilt binaries attached.
#
#   export GITHUB_TOKEN=ghp_xxxxxxxxxxxx      # needs "Contents: write"
#   ./tools/pack_release.sh                   # bundles firmware/ into dist/
#   ./tools/publish_release.sh v1.0.0
#
# Re-running for an existing tag replaces the assets rather than duplicating
# them, so it is safe to run again after a rebuild.

set -euo pipefail

TAG="${1:-v1.0.0}"
REPO="${DSP32_REPO:-AliAkrami1375/Dsp32-firmware}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
NOTES="$ROOT/docs/RELEASE_NOTES_${TAG}.md"

: "${GITHUB_TOKEN:?set GITHUB_TOKEN to a token with Contents: write on $REPO}"

[ -d "$DIST" ] || { echo "missing $DIST — run ./tools/pack_release.sh first"; exit 1; }
[ -f "$NOTES" ] || { echo "missing release notes: $NOTES"; exit 1; }

api() {
  curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" \
       -H "Accept: application/vnd.github+json" \
       -H "X-GitHub-Api-Version: 2022-11-28" "$@"
}

echo "▸ repo   $REPO"
echo "▸ tag    $TAG"

# ---- create or update the release ----------------------------------------
existing=$(api "https://api.github.com/repos/$REPO/releases/tags/$TAG" \
           | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null || true)

payload=$(python3 - "$TAG" "$NOTES" <<'PY'
import json, sys
tag, notes = sys.argv[1], sys.argv[2]
print(json.dumps({
    "tag_name": tag,
    "name": f"Dsp32 {tag}",
    "body": open(notes, encoding="utf-8").read(),
    "draft": False,
    "prerelease": False,
}))
PY
)

if [ -n "$existing" ]; then
  echo "▸ updating existing release $existing"
  rel=$(api -X PATCH -d "$payload" "https://api.github.com/repos/$REPO/releases/$existing")
else
  echo "▸ creating release"
  rel=$(api -X POST -d "$payload" "https://api.github.com/repos/$REPO/releases")
fi

# A command substitution feeding `read` cannot trip set -e on its own, so the
# exit status is captured explicitly — otherwise an API error here would fall
# through and every upload below would fail against an empty URL.
if ! parsed=$(python3 -c '
import sys, json
try:
    r = json.load(sys.stdin)
except ValueError:
    sys.exit("GitHub returned a non-JSON response")
if "id" not in r:
    msg = r.get("message", json.dumps(r)[:300])
    hint = ""
    if "not accessible by personal access token" in msg:
        hint = ("\n  The token is missing the \"Contents\" permission.\n"
                "  Fine-grained tokens need Repository permissions -> "
                "Contents: Read and write.")
    sys.exit(f"GitHub API error: {msg}{hint}")
print(r["id"], r["upload_url"].split("{")[0], r["html_url"])
' <<<"$rel"); then
  exit 1
fi
read -r rel_id upload_url html_url <<<"$parsed"

# ---- upload every asset ---------------------------------------------------
existing_assets=$(api "https://api.github.com/repos/$REPO/releases/$rel_id/assets")

for f in "$DIST"/*; do
  name=$(basename "$f")

  old=$(python3 -c '
import sys, json
name = sys.argv[1]
for a in json.load(sys.stdin):
    if a["name"] == name:
        print(a["id"]); break
' "$name" <<<"$existing_assets" 2>/dev/null || true)

  if [ -n "$old" ]; then
    api -X DELETE "https://api.github.com/repos/$REPO/releases/assets/$old" >/dev/null
  fi

  case "$name" in
    *.zip) ctype="application/zip" ;;
    *.txt) ctype="text/plain" ;;
    *)     ctype="application/octet-stream" ;;
  esac

  printf '  ↑ %-42s %6s KB  ' "$name" "$(( $(stat -c%s "$f") / 1024 ))"
  api -X POST -H "Content-Type: $ctype" --data-binary @"$f" \
      "${upload_url}?name=${name}" \
      | python3 -c 'import sys,json; r=json.load(sys.stdin); print("ok" if r.get("state")=="uploaded" else "FAILED: "+json.dumps(r)[:200])'
done

echo ""
echo "✓ published: $html_url"
