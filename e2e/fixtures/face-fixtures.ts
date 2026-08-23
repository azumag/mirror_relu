import type { Point3D } from "../../src/core/types.js";

/** Shared landmark shape used by the compiled E2E fixture source. */
export function emptyFaceLandmarks(): Point3D[] {
  return Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
}
