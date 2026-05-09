#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# patch-apply.sh — register the new admin route + sidebar link
#
# Run from ~/workspace:
#   bash migrations/patch-apply.sh
#
# What this script does:
#   1. Adds an import for AdminLandingSettings at the top of App.tsx
#   2. Adds a <Route> for /admin/landing-settings in the route list
#   3. Adds a sidebar link in layout.tsx in the System group, just after
#      the existing "إدارة المحتوى" link
#
# All edits are idempotent: running the script twice does NOT duplicate lines.
# Each block is only inserted if a sentinel check fails.
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="${HOME}/workspace"
APP_TSX="${ROOT}/artifacts/kidspeak/src/App.tsx"
LAYOUT="${ROOT}/artifacts/kidspeak/src/components/layout.tsx"

if [ ! -f "$APP_TSX" ]; then
  echo "ERROR: $APP_TSX not found"; exit 1
fi
if [ ! -f "$LAYOUT" ]; then
  echo "ERROR: $LAYOUT not found"; exit 1
fi

# ── 1. Add import in App.tsx ────────────────────────────────────────────────
if grep -q "AdminLandingSettings" "$APP_TSX"; then
  echo "✓ App.tsx import already present — skipping"
else
  # Insert after the WebContentPage import line
  if grep -q 'from "@/pages/admin/web-content"' "$APP_TSX"; then
    sed -i '/from "@\/pages\/admin\/web-content";/a import AdminLandingSettings from "@/pages/admin/landing-settings";' "$APP_TSX"
    echo "✓ Added App.tsx import"
  else
    echo "✗ Could not find anchor for App.tsx import — please add manually:"
    echo '  import AdminLandingSettings from "@/pages/admin/landing-settings";'
    exit 1
  fi
fi

# ── 2. Add <Route> in App.tsx ───────────────────────────────────────────────
if grep -q '"/admin/landing-settings"' "$APP_TSX"; then
  echo "✓ App.tsx route already present — skipping"
else
  if grep -q '<Route path="/admin/web-content">' "$APP_TSX"; then
    # Insert a new Route block right after the web-content Route block.
    # We match the closing </Route> line on the line after the web-content open tag.
    python3 <<'PY'
import re
path = "${ROOT}/artifacts/kidspeak/src/App.tsx".replace("${ROOT}", __import__("os").path.expanduser("~/workspace"))
with open(path) as f:
    src = f.read()

# Find the web-content Route block (handles either single-line or multi-line forms)
pattern = re.compile(
    r'(\s*<Route path="/admin/web-content">\s*\n[^<]*<WebContentPage\s*/>\s*\n\s*</Route>)',
    re.MULTILINE,
)
new_block = '''
      <Route path="/admin/landing-settings">
        <AdminLandingSettings />
      </Route>'''

m = pattern.search(src)
if m:
    src = src[:m.end()] + new_block + src[m.end():]
    with open(path, 'w') as f:
        f.write(src)
    print("✓ Added App.tsx route")
else:
    # Fallback: try a simpler match
    simple = re.compile(r'(<Route path="/admin/web-content">.*?</Route>)', re.DOTALL)
    m2 = simple.search(src)
    if m2:
        src = src[:m2.end()] + new_block + src[m2.end():]
        with open(path, 'w') as f:
            f.write(src)
        print("✓ Added App.tsx route (fallback match)")
    else:
        print("✗ Could not locate web-content Route block — add manually:")
        print(new_block)
        exit(1)
PY
  else
    echo "✗ Could not find web-content Route — please add manually:"
    echo '      <Route path="/admin/landing-settings">'
    echo '        <AdminLandingSettings />'
    echo '      </Route>'
    exit 1
  fi
fi

# ── 3. Add sidebar link in layout.tsx ───────────────────────────────────────
if grep -q '/admin/landing-settings' "$LAYOUT"; then
  echo "✓ layout.tsx sidebar link already present — skipping"
else
  python3 <<'PY'
import os, re
path = os.path.expanduser("~/workspace/artifacts/kidspeak/src/components/layout.tsx")
with open(path) as f:
    src = f.read()

# Insert a new line right after the web-content sidebar entry
needle = '{ href: "/admin/web-content",           label: isRTL ? "إدارة المحتوى" : "Web Content", icon: Globe, permission: "web_content" },'
new_line = '\n        { href: "/admin/landing-settings",      label: isRTL ? "إعدادات صفحة الهبوط" : "Landing settings", icon: Globe, permission: "web_content" },'

if needle in src:
    src = src.replace(needle, needle + new_line, 1)
    with open(path, 'w') as f:
        f.write(src)
    print("✓ Added layout.tsx sidebar link")
else:
    # Fallback: try a looser pattern
    pattern = re.compile(r'(\{\s*href:\s*"/admin/web-content"[^}]*\},)')
    m = pattern.search(src)
    if m:
        src = src[:m.end()] + new_line + src[m.end():]
        with open(path, 'w') as f:
            f.write(src)
        print("✓ Added layout.tsx sidebar link (fallback match)")
    else:
        print("✗ Could not find web-content sidebar entry — add manually:")
        print(new_line)
        exit(1)
PY
fi

echo ""
echo "All patches applied. Now run:"
echo "  cd ~/workspace && pnpm typecheck"
echo "  rm -rf artifacts/kidspeak/dist && pnpm -C artifacts/kidspeak build"
echo "  Stop ← Run ← Publish"
