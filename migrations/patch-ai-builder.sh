#!/bin/bash
# patch-ai-builder.sh — adds AI Builder routes + sidebar links
set -e
ROOT=~/workspace

echo "=== Step 1: Adding imports to App.tsx ==="
APP="$ROOT/artifacts/kidspeak/src/App.tsx"

# Add imports if not present
if ! grep -q "AdminAiSettings" "$APP"; then
  sed -i '/import AdminLandingSettings/a import AdminAiSettings from "@/pages/admin/ai-settings";\nimport AdminAiBuilder  from "@/pages/admin/ai-builder";\nimport PublicPage       from "@/pages/public-page";' "$APP"
  echo "✓ Imports added"
else
  echo "⚠ Imports already present, skipping"
fi

echo "=== Step 2: Adding routes to App.tsx ==="

# Add admin routes after /admin/landing-settings
if ! grep -q "/admin/ai-settings" "$APP"; then
  sed -i '/<Route path="\/admin\/landing-settings">/,/<\/Route>/{/<\/Route>/a\
      <Route path="/admin/ai-settings">\
        <AdminAiSettings />\
      </Route>\
      <Route path="/admin/ai-builder">\
        <AdminAiBuilder />\
      </Route>
}' "$APP"
  echo "✓ Admin routes added"
else
  echo "⚠ Admin routes already present, skipping"
fi

# Add public page route (catch-all for /lp/:slug and /p/:slug)
if ! grep -q "public-page\|PublicPage" "$APP"; then
  sed -i '/<Route path="\/admin\/ai-builder">/,/<\/Route>/{/<\/Route>/a\
      <Route path="/lp/:slug">\
        <PublicPage />\
      </Route>
}' "$APP"
  echo "✓ Public page route added"
else
  echo "⚠ Public route already present, skipping"
fi

echo "=== Step 3: Adding sidebar links to layout.tsx ==="
LAYOUT="$ROOT/artifacts/kidspeak/src/components/layout.tsx"

if ! grep -q "ai-settings" "$LAYOUT"; then
  sed -i 's|{ href: "/admin/landing-settings",.*permission: "web_content" },|&\n        { href: "/admin/ai-settings",  label: isRTL ? "إعدادات الذكاء الاصطناعي" : "AI Settings",   icon: Settings2, permission: "web_content" },\n        { href: "/admin/ai-builder",   label: isRTL ? "مولّد المحتوى (AI)" : "AI Builder",          icon: Sparkles,  permission: "web_content" },|' "$LAYOUT"
  echo "✓ Sidebar links added"
else
  echo "⚠ Sidebar links already present, skipping"
fi

# Add Sparkles and Settings2 to lucide imports in layout.tsx if missing
if ! grep -q "Sparkles" "$LAYOUT"; then
  sed -i 's/import {/import { Sparkles, Settings2,/' "$LAYOUT"
  echo "✓ Icons import added"
fi

echo ""
echo "=== All patches applied ==="
echo "Run: cd ~/workspace && pnpm typecheck"
