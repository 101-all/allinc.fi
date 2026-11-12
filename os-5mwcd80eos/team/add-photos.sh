#!/bin/sh
# add team photos: ./add-photos.sh /path/to/originals/*
# makes photos/NAME-800 and NAME-2000 as .avif and .jpg, and adds each to photos.json with an empty alt.
# a photo only shows on the page once its "alt" in photos.json is written.
set -e
cd "$(dirname "$0")"
for src in "$@"; do
  [ -f "$src" ] || continue
  name=$(basename "$src" | sed 's/\.[^.]*$//' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//')
  for size in 800 2000; do
    sips -Z $size -s format jpeg -s formatOptions 80 "$src" --out "photos/$name-$size.jpg" >/dev/null
    sips -Z $size -s format avif -s formatOptions 60 "$src" --out "photos/$name-$size.avif" >/dev/null
  done
  w=$(sips -g pixelWidth "photos/$name-2000.jpg" | awk '/pixelWidth/ {print $2}')
  h=$(sips -g pixelHeight "photos/$name-2000.jpg" | awk '/pixelHeight/ {print $2}')
  python3 - "$name" "$w" "$h" <<'PY'
import json, sys
name, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
items = json.load(open('photos.json'))
if not any(i['name'] == name for i in items):
    items.append({'name': name, 'alt': '', 'w': w, 'h': h})
json.dump(items, open('photos.json', 'w'), indent=2, ensure_ascii=False)
PY
  echo "added $name (${w}x${h})"
done
