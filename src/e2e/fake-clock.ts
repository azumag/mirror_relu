const INITIAL_TIME_MS = Date.parse("2026-08-16T00:00:00.000Z");

export class FakeClock {
  private currentMs = INITIAL_TIME_MS;

  nowMs(): number {
    return this.currentMs;
  }

  now(): Date {
    return new Date(this.currentMs);
  }

  advance(milliseconds: number): number {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new Error("テストクロックの進行時間は0以上の有限値で指定してください。");
    }
    this.currentMs += milliseconds;
    return this.currentMs;
  }

  reset(): void {
    this.currentMs = INITIAL_TIME_MS;
  }
}
