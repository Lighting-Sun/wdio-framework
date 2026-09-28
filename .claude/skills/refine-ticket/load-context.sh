#!/usr/bin/env bash
# Prints every file refine-ticket must read before deriving cases (step 2).
#
# The list lives here, not in the agent's head: a hand-built list once left
# out consulting/.claude.md, and the draft went out without its decisions.
# A missing file or an empty glob exits non-zero instead of being skipped.
#
# Output: a manifest first (path + line count; it stays visible even when a
# long output is truncated), then each file under an unambiguous header.

set -euo pipefail

root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$root"

shopt -s nullglob
pages=(tests/pages/*.ts)
specs=(tests/specs/*.ts)
shopt -u nullglob

missing=0
[ ${#pages[@]} -gt 0 ] || { echo "ERROR: no page objects under tests/pages/" >&2; missing=1; }
[ ${#specs[@]} -gt 0 ] || { echo "ERROR: no specs under tests/specs/" >&2; missing=1; }
# Stop here: macOS bash 3.2 treats an empty "${arr[@]}" as unbound under set -u.
[ "$missing" -eq 0 ] || exit 1

files=(
    consulting/.claude.md
    architecture/projectArchitecture.md
    tests/support/flows.support.ts
    "${pages[@]}"
    "${specs[@]}"
)

for f in "${files[@]}"; do
    [ -f "$f" ] || { echo "ERROR: missing required file: $f" >&2; missing=1; }
done
[ "$missing" -eq 0 ] || exit 1

echo "SOURCES (${#files[@]} files)"
for f in "${files[@]}"; do
    printf '  %s (%s lines)\n' "$f" "$(wc -l < "$f" | tr -d ' ')"
done

for f in "${files[@]}"; do
    printf '\n########## BEGIN %s ##########\n' "$f"
    cat "$f"
    printf '\n########## END %s ##########\n' "$f"
done
