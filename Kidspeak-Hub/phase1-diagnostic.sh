#!/bin/bash
# Phase 1 Diagnostic Script
# Run this in ~/workspace to check if all Phase 1 fixes are applied

echo "=========================================="
echo "Phase 1 Diagnostic Report"
echo "Generated: $(date)"
echo "=========================================="
echo ""

cd ~/workspace

echo "=== 1.2: Teacher can publish news ==="
grep -n '"admin", "teacher"' artifacts/api-server/src/routes/news.ts | head -1
echo ""

echo "=== 1.3: Performance page allowedRoles ==="
grep -n 'path="/performance"' -A 1 artifacts/kidspeak/src/App.tsx
echo ""

echo "=== 1.4: Behavioral page allowedRoles ==="
grep -n 'path="/behavioral"' -A 1 artifacts/kidspeak/src/App.tsx
echo ""

echo "=== 1.5: Evaluations allowedRoles ==="
grep -n 'path="/evaluations"' -A 1 artifacts/kidspeak/src/App.tsx | head -3
echo ""

echo "=== 1.7: My-profile allowedRoles ==="
grep -n 'path="/my-profile"' -A 1 artifacts/kidspeak/src/App.tsx
echo ""

echo "=== 1.8: News in teacher sidebar ==="
echo "Teacher section:"
grep -B 2 -A 10 'role === "teacher"' artifacts/kidspeak/src/components/layout.tsx | grep '/news'
echo ""
echo "Psychologist section:"
grep -B 2 -A 10 'role === "psychologist"' artifacts/kidspeak/src/components/layout.tsx | grep '/news'
echo ""
echo "Accountant section:"
grep -B 2 -A 8 'role === "accountant"' artifacts/kidspeak/src/components/layout.tsx | grep '/news'
echo ""
echo "Creative team section:"
grep -B 2 -A 8 'photographer.*designer.*marketer' artifacts/kidspeak/src/components/layout.tsx | grep '/news'
echo ""

echo "=== Git Status ==="
git status --short
echo ""

echo "=== Last 3 Commits ==="
git log --oneline -3
echo ""

echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
