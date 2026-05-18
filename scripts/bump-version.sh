#!/bin/bash
# Auto-increment patch version in app.json and package.json
# Usage: ./scripts/bump-version.sh
# Third digit +1 each build; when third > 99, second +1 and third resets

set -e

APP_JSON="app.json"
PACKAGE_JSON="package.json"

# Read current version from app.json
CURRENT=$(python3 -c "
import json
with open('$APP_JSON') as f:
    print(json.load(f)['expo']['version'])
")

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
PATCH=$((PATCH + 1))
if [ "$PATCH" -gt 99 ]; then
  PATCH=0
  MINOR=$((MINOR + 1))
  if [ "$MINOR" -gt 99 ]; then
    MINOR=0
    MAJOR=$((MAJOR + 1))
  fi
fi
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Update app.json
python3 -c "
import json
with open('$APP_JSON') as f:
    data = json.load(f)
data['expo']['version'] = '$NEW_VERSION'
with open('$APP_JSON', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')
"

# Update package.json
python3 -c "
import json
with open('$PACKAGE_JSON') as f:
    data = json.load(f)
data['version'] = '$NEW_VERSION'
with open('$PACKAGE_JSON', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"

echo "Version: $CURRENT → $NEW_VERSION"
