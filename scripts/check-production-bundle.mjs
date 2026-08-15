import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const forbidden = [
  "__MIRROR_RELU_E2E__",
  "VITE_E2E_FIXTURES",
  "FakeCameraController",
  "DeterministicVisionClient",
  "vision-initialization-failure",
  "tauri-plugin-wdio",
];

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await javascriptFiles(path)));
    else if (/\.(?:js|css|html)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const files = await javascriptFiles("dist");
const hits = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const value of forbidden) if (content.includes(value)) hits.push(`${file}: ${value}`);
}

if (hits.length > 0) {
  console.error("Production bundle contains E2E-only symbols:");
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log(`Production bundle guard passed (${files.length} generated files inspected).`);
