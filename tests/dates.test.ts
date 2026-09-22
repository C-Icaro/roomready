import { afterEach, describe, expect, it, vi } from "vitest";
import { daysUntil } from "../src/lib/rooms";

afterEach(() => vi.useRealTimers());
describe("calendar-day countdown", () => {
  it("does not add a phantom day before noon", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 22, 1, 30));
    expect(daysUntil("2026-10-13")).toBe(21);
    expect(daysUntil("2026-09-22")).toBe(0);
    expect(daysUntil("2026-09-21")).toBe(0);
  });
  it("keeps the same calendar count throughout the day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 22, 23, 59));
    expect(daysUntil("2026-10-13")).toBe(21);
  });
});
