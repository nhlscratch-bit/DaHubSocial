#!/bin/bash
# Builds DAHUB_Characters.zip: every character's art sorted by character, then by game.
set -e
G="$(cd "$(dirname "$0")/../games" && pwd)"; OUT="${1:-$PWD/DAHUB_Characters.zip}"
T=$(mktemp -d); R="$T/DAHUB_Characters"
name(){ case $1 in fp|philly) echo "Fresh Prince";; kd|tape) echo "KennDogg";; mb|whip) echo "Mabel";; tc) echo "TChalla";; mm) echo "Man Man";; *) echo "$1";; esac; }
for f in "$G"/spades/img/*_*.webp; do b=$(basename "$f"); id=${b%%_*}; d="$R/$(name $id)/Spades seat"; mkdir -p "$d"; cp "$f" "$d/${b#*_}"; done
for f in "$G"/fight/sprites/*_*.webp; do b=$(basename "$f"); id=${b%%_*}; [ "$id" = stage ] && { mkdir -p "$R/_Places/Fight stages"; cp "$f" "$R/_Places/Fight stages/${b#stage_}"; continue; }; d="$R/$(name $id)/Fighter"; mkdir -p "$d"; cp "$f" "$d/${b#*_}"; done
for f in "$G"/fight/video/*; do [ -f "$f" ] || continue; b=$(basename "$f"); id=${b%%_*}; d="$R/$(name $id)/Fighter/video"; mkdir -p "$d"; cp "$f" "$d/${b#*_}"; done
[ -d "$G/spades/art/seats" ] && { d="$R/Unnamed player 5/Spades seat"; mkdir -p "$d"; for f in "$G"/spades/art/seats/player4_chair_*; do cp "$f" "$d/$(basename "$f" | sed 's/player4_chair_//')"; done; }
[ -d "$G/characters" ] && cp -r "$G"/characters/* "$R/"
[ -d "$G/spades/art/rooms" ] && { mkdir -p "$R/_Places/Spades rooms"; cp "$G"/spades/art/rooms/* "$R/_Places/Spades rooms/"; }
rm -f "$OUT"; (cd "$T" && zip -qr "$OUT" DAHUB_Characters); rm -rf "$T"; echo "$OUT"
