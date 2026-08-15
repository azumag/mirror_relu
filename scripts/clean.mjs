import { rm } from "node:fs/promises";

await Promise.all(
  ["dist", ".test-dist", "src-tauri/target"].map((path) =>
    rm(path, { recursive: true, force: true }),
  ),
);
