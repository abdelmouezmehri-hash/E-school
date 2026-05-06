import { readFileSync } from "node:fs";

const app = readFileSync(
  new URL("../../artifacts/kidspeak/src/App.tsx", import.meta.url),
  "utf8",
);
const routeRegex = /<Route\s+path="(\/admin\/[^"]+)"[\s\S]*?<\/Route>/g;
const missing = [];
for (const match of app.matchAll(routeRegex)) {
  const block = match[0];
  if (!block.includes("<ProtectedRoute")) {
    missing.push(match[1]);
  }
}
if (missing.length) {
  console.error(`Admin routes missing ProtectedRoute: ${missing.join(", ")}`);
  process.exit(1);
}
console.log("All /admin/* routes use ProtectedRoute");
