import type { BehaviorEvent, BehaviorId } from "./types.js";

const EVENTS_KEY = "mirror-relu:events:v1";
const MAX_EVENTS = 200;

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

export function loadEvents(): BehaviorEvent[] {
  if (!storageAvailable()) return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const events = JSON.parse(raw) as BehaviorEvent[];
    return Array.isArray(events) ? events.slice(0, MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

export function appendEvents(current: BehaviorEvent[], incoming: BehaviorEvent[]): BehaviorEvent[] {
  if (incoming.length === 0) return current;
  const next = [...incoming, ...current].slice(0, MAX_EVENTS);
  if (storageAvailable()) localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  return next;
}

export function clearEvents(): BehaviorEvent[] {
  if (storageAvailable()) localStorage.removeItem(EVENTS_KEY);
  return [];
}

export function countToday(events: BehaviorEvent[]): Record<BehaviorId, number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const counts: Record<BehaviorId, number> = { mouth: 0, faceTouch: 0, eyeAlignment: 0 };

  for (const event of events) {
    if (new Date(event.occurredAt).getTime() >= start.getTime()) counts[event.behavior] += 1;
  }
  return counts;
}

export function exportPayload(
  events: BehaviorEvent[],
  settings: unknown,
  calibration: unknown,
): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "Mirror Re:lu",
      schemaVersion: 1,
      settings,
      calibration,
      events,
    },
    null,
    2,
  );
}
