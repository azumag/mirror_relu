import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(root, "public", "mediapipe");
const wasmOutput = join(outputRoot, "wasm");
const modelOutput = join(outputRoot, "models");

const models = [
  {
    name: "face_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    expectedSize: 3_758_596,
  },
  {
    name: "hand_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    expectedSize: 7_819_105,
  },
];

async function findPackageRoot() {
  let current = dirname(fileURLToPath(import.meta.resolve("@mediapipe/tasks-vision")));

  for (let depth = 0; depth < 6; depth += 1) {
    try {
      const candidate = join(current, "wasm");
      if ((await stat(candidate)).isDirectory()) {
        return current;
      }
    } catch {
      // Keep walking toward the package root.
    }
    current = dirname(current);
  }

  throw new Error("@mediapipe/tasks-vision の wasm ディレクトリを見つけられませんでした。");
}

async function copyWasmAssets() {
  const packageRoot = await findPackageRoot();
  const source = join(packageRoot, "wasm");
  await mkdir(wasmOutput, { recursive: true });

  const files = await readdir(source, { withFileTypes: true });
  const copied = [];

  for (const entry of files) {
    if (!entry.isFile()) continue;
    await copyFile(join(source, entry.name), join(wasmOutput, entry.name));
    copied.push(entry.name);
  }

  if (copied.length === 0) {
    throw new Error("MediaPipe WASMアセットが空です。");
  }

  return copied.sort();
}

async function sha256(path) {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

async function downloadModel(model) {
  const destination = join(modelOutput, model.name);

  try {
    const current = await stat(destination);
    if (current.size === model.expectedSize) {
      return {
        name: model.name,
        url: model.url,
        size: current.size,
        sha256: await sha256(destination),
        reused: true,
      };
    }
  } catch {
    // Download below.
  }

  console.log(`Downloading ${model.name}...`);
  const response = await fetch(model.url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${model.name} の取得に失敗しました: HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== model.expectedSize) {
    throw new Error(
      `${model.name} のサイズが想定と異なります: ${bytes.byteLength} != ${model.expectedSize}`,
    );
  }

  const temporary = `${destination}.download`;
  await writeFile(temporary, bytes);
  await rename(temporary, destination);

  return {
    name: model.name,
    url: model.url,
    size: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    reused: false,
  };
}

await Promise.all([mkdir(wasmOutput, { recursive: true }), mkdir(modelOutput, { recursive: true })]);

const wasmFiles = await copyWasmAssets();
const modelFiles = [];
for (const model of models) {
  modelFiles.push(await downloadModel(model));
}

const manifest = {
  generatedAt: new Date().toISOString(),
  package: "@mediapipe/tasks-vision@1.0.0",
  wasmFiles,
  models: modelFiles.map(({ reused: _reused, ...model }) => model),
};

await writeFile(
  join(outputRoot, "asset-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log("MediaPipe assets are ready.");
