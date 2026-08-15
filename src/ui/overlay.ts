import type { BehaviorMetrics, Point3D, VisionFrame } from "../core/types.js";

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54,
  103, 67, 109, 10,
];
const OUTER_LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144, 33];
const LEFT_EYE = [362, 385, 387, 263, 373, 380, 362];
const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

interface DrawArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function fitArea(canvasWidth: number, canvasHeight: number, videoWidth: number, videoHeight: number): DrawArea {
  const videoAspect = videoWidth / Math.max(videoHeight, 1);
  const canvasAspect = canvasWidth / Math.max(canvasHeight, 1);

  if (videoAspect > canvasAspect) {
    const height = canvasWidth / videoAspect;
    return { x: 0, y: (canvasHeight - height) / 2, width: canvasWidth, height };
  }

  const width = canvasHeight * videoAspect;
  return { x: (canvasWidth - width) / 2, y: 0, width, height: canvasHeight };
}

function drawPath(
  context: CanvasRenderingContext2D,
  landmarks: Point3D[],
  indices: number[],
  area: DrawArea,
  strokeStyle: string,
  lineWidth: number,
): void {
  context.beginPath();
  let started = false;

  for (const index of indices) {
    const point = landmarks[index];
    if (!point) continue;
    const x = area.x + point.x * area.width;
    const y = area.y + point.y * area.height;
    if (!started) {
      context.moveTo(x, y);
      started = true;
    } else {
      context.lineTo(x, y);
    }
  }

  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
}

function cssColor(canvas: HTMLCanvasElement, name: string, fallback: string): string {
  return getComputedStyle(canvas).getPropertyValue(name).trim() || fallback;
}

export function clearOverlay(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  context?.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  frame: VisionFrame,
  metrics: BehaviorMetrics,
  enabled: boolean,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  const ratio = window.devicePixelRatio || 1;
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  const targetWidth = Math.max(1, Math.round(displayWidth * ratio));
  const targetHeight = Math.max(1, Math.round(displayHeight * ratio));
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, displayWidth, displayHeight);
  if (!enabled || video.videoWidth === 0 || !frame.face) return;

  const area = fitArea(displayWidth, displayHeight, video.videoWidth, video.videoHeight);
  const faceColor = cssColor(canvas, "--overlay-face", "#79d7c6");
  const focusColor = cssColor(canvas, "--overlay-focus", "#f0c96a");
  const handColor = cssColor(canvas, "--overlay-hand", "#ff8f8f");

  const face = frame.face.landmarks;
  drawPath(context, face, FACE_OVAL, area, faceColor, 1.6);
  drawPath(context, face, OUTER_LIPS, area, metrics.mouthOpenRatio > 0.1 ? focusColor : faceColor, 2);
  drawPath(context, face, RIGHT_EYE, area, faceColor, 1.4);
  drawPath(context, face, LEFT_EYE, area, faceColor, 1.4);

  for (const irisIndex of [468, 473]) {
    const iris = face[irisIndex];
    if (!iris) continue;
    context.beginPath();
    context.arc(area.x + iris.x * area.width, area.y + iris.y * area.height, 3.5, 0, Math.PI * 2);
    context.fillStyle = focusColor;
    context.fill();
  }

  for (const hand of frame.hands) {
    context.beginPath();
    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = hand[startIndex];
      const end = hand[endIndex];
      if (!start || !end) continue;
      context.moveTo(area.x + start.x * area.width, area.y + start.y * area.height);
      context.lineTo(area.x + end.x * area.width, area.y + end.y * area.height);
    }
    context.strokeStyle = handColor;
    context.lineWidth = 1.4;
    context.stroke();
  }

  if (metrics.contactPoint) {
    context.beginPath();
    context.arc(
      area.x + metrics.contactPoint.x * area.width,
      area.y + metrics.contactPoint.y * area.height,
      10,
      0,
      Math.PI * 2,
    );
    context.strokeStyle = handColor;
    context.lineWidth = 2.5;
    context.stroke();
  }
}
