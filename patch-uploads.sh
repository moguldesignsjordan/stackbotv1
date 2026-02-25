#!/bin/bash
# ============================================================================
# patch-uploads.sh — Auto-patch all uploadBytes calls to smartUploadBytes
#
# This script:
#   1. Finds every .ts/.tsx file that calls uploadBytes (excluding node_modules)
#   2. Adds the smartUploadBytes import
#   3. Replaces uploadBytes( calls with smartUploadBytes(
#   4. Leaves the firebase/storage import intact (still needed for ref, getDownloadURL, etc.)
#
# USAGE:
#   cd /path/to/your/stackbot-v1
#   chmod +x patch-uploads.sh
#   ./patch-uploads.sh
#
# DRY RUN (preview changes without modifying files):
#   DRY_RUN=1 ./patch-uploads.sh
#
# ROLLBACK:
#   git checkout -- src/
#   (or revert the specific files listed in the output)
#
# PREREQUISITE:
#   Copy smartUpload.ts to src/lib/firebase/smartUpload.ts BEFORE running this.
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DRY_RUN="${DRY_RUN:-0}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  StackBot LCP Fix — Auto-patch uploadBytes → smartUploadBytes${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$DRY_RUN" = "1" ]; then
  echo -e "${YELLOW}🔍 DRY RUN MODE — No files will be modified${NC}"
  echo ""
fi

# ── Step 0: Check prerequisites ────────────────────────────────────────────

if [ ! -f "src/lib/firebase/smartUpload.ts" ]; then
  echo -e "${RED}❌ ERROR: src/lib/firebase/smartUpload.ts not found!${NC}"
  echo "   Copy smartUpload.ts to src/lib/firebase/ before running this script."
  echo ""
  exit 1
fi

# ── Step 1: Find all files that use uploadBytes ────────────────────────────

echo -e "${BLUE}📂 Scanning for files that use uploadBytes...${NC}"
echo ""

# Find files that contain uploadBytes( but exclude:
#   - node_modules, .next, android, ios
#   - smartUpload.ts itself
#   - compressImage.ts (the old manual approach)
FILES=$(grep -rl "uploadBytes(" src/ \
  --include="*.ts" \
  --include="*.tsx" \
  | grep -v "node_modules" \
  | grep -v ".next" \
  | grep -v "smartUpload.ts" \
  | grep -v "compressImage.ts" \
  | sort)

if [ -z "$FILES" ]; then
  echo -e "${GREEN}✅ No files found that use uploadBytes. Nothing to patch.${NC}"
  exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo -e "   Found ${YELLOW}${FILE_COUNT}${NC} file(s) to patch:"
echo ""

for f in $FILES; do
  # Count how many uploadBytes( calls (excluding import lines)
  CALL_COUNT=$(grep -c "uploadBytes(" "$f" | tr -d ' ')
  IMPORT_COUNT=$(grep -c "uploadBytes" "$f" | tr -d ' ')
  ACTUAL_CALLS=$((CALL_COUNT))
  echo -e "   ${BLUE}→${NC} $f  (${ACTUAL_CALLS} call(s))"
done
echo ""

# ── Step 2: Patch each file ────────────────────────────────────────────────

PATCHED=0
SKIPPED=0

for FILE in $FILES; do
  echo -e "${BLUE}━━━ Patching: ${NC}${FILE}"

  # Check if already patched
  if grep -q "smartUploadBytes" "$FILE"; then
    echo -e "   ${YELLOW}⏭  Already patched, skipping${NC}"
    SKIPPED=$((SKIPPED + 1))
    echo ""
    continue
  fi

  if [ "$DRY_RUN" = "1" ]; then
    echo -e "   ${YELLOW}Would add: import { smartUploadBytes } from '@/lib/firebase/smartUpload';${NC}"
    
    # Show which lines would change
    grep -n "uploadBytes(" "$FILE" | while read -r line; do
      LINENUM=$(echo "$line" | cut -d: -f1)
      CONTENT=$(echo "$line" | cut -d: -f2-)
      # Skip import lines
      if echo "$CONTENT" | grep -q "from "; then
        echo -e "   ${BLUE}Line $LINENUM:${NC} (import — kept as-is)"
      else
        echo -e "   ${GREEN}Line $LINENUM:${NC} uploadBytes( → smartUploadBytes("
      fi
    done
    
    PATCHED=$((PATCHED + 1))
    echo ""
    continue
  fi

  # ── Add the smartUploadBytes import ──────────────────────────────────────

  # Strategy: Add the import right after the firebase/storage import line.
  # This keeps imports grouped logically.
  
  if grep -q "from \"firebase/storage\"" "$FILE"; then
    # File uses double quotes for imports
    sed -i.bak "/from \"firebase\/storage\"/a\\
import { smartUploadBytes } from '@/lib/firebase/smartUpload';" "$FILE"
  elif grep -q "from 'firebase/storage'" "$FILE"; then
    # File uses single quotes for imports
    sed -i.bak "/from 'firebase\/storage'/a\\
import { smartUploadBytes } from '@/lib/firebase/smartUpload';" "$FILE"
  else
    # uploadBytes might be imported indirectly (e.g., from a config file)
    # Add import at the top of the file, after the first import block
    sed -i.bak "1,/^import/{ /^import/a\\
import { smartUploadBytes } from '@/lib/firebase/smartUpload';
}" "$FILE"
  fi

  # ── Replace uploadBytes( calls (but NOT in import lines) ─────────────────

  # This sed command replaces uploadBytes( with smartUploadBytes( 
  # ONLY on lines that do NOT contain "from " (i.e., not import lines)
  sed -i.bak '/from /!s/uploadBytes(/smartUploadBytes(/g' "$FILE"

  # Also handle: await uploadBytes( with extra spacing
  sed -i.bak '/from /!s/await uploadBytes/await smartUploadBytes/g' "$FILE"

  # ── Clean up backup files ────────────────────────────────────────────────
  rm -f "${FILE}.bak"

  # ── Verify the patch ─────────────────────────────────────────────────────
  
  if grep -q "smartUploadBytes" "$FILE"; then
    echo -e "   ${GREEN}✅ Patched successfully${NC}"
    
    # Show what changed
    grep -n "smartUploadBytes" "$FILE" | while read -r line; do
      LINENUM=$(echo "$line" | cut -d: -f1)
      echo -e "   ${GREEN}  Line $LINENUM:${NC} $(echo "$line" | cut -d: -f2- | xargs)"
    done
  else
    echo -e "   ${RED}⚠️  Patch may have failed — verify manually${NC}"
  fi

  PATCHED=$((PATCHED + 1))
  echo ""
done

# ── Summary ────────────────────────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$DRY_RUN" = "1" ]; then
  echo -e "${YELLOW}🔍 DRY RUN COMPLETE${NC}"
  echo -e "   ${PATCHED} file(s) would be patched"
  echo -e "   ${SKIPPED} file(s) already patched"
  echo ""
  echo -e "   Run without DRY_RUN=1 to apply changes."
else
  echo -e "${GREEN}✅ PATCH COMPLETE${NC}"
  echo -e "   ${GREEN}${PATCHED}${NC} file(s) patched"
  echo -e "   ${YELLOW}${SKIPPED}${NC} file(s) skipped (already patched)"
  echo ""
  echo -e "   ${BLUE}Next steps:${NC}"
  echo -e "   1. Run ${YELLOW}npm run build${NC} to verify no errors"
  echo -e "   2. Test an image upload in the vendor dashboard"
  echo -e "   3. Check Firebase Storage — new uploads should be smaller"
  echo ""
  echo -e "   ${BLUE}Rollback:${NC}"
  echo -e "   git checkout -- src/"
fi

echo ""
