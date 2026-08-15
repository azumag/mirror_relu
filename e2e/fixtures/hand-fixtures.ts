import type { Point3D } from "../../src/core/types.js";

/** Code-generated hand fixture; no image or video asset is used. */
export function emptyHandLandmarks(): Point3D[] {
  return Array.from({ length: 21 }, () => ({ x: 0.9, y: 0.9, z: 0 }));
}
