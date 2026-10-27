import { describe, expect, it } from 'vitest';
import { example, optimized, quadratic, scheduleCost, seededInput } from './algorithms';

describe('teaching trace and manual schedules', () => {
  it('derives completion times and per-batch costs from the sample', () => {
    const run = scheduleCost(example, [2, 3]);
    expect(run.cost).toBe(153n);
    expect(run.groups).toEqual([[1, 2], [3], [4, 5]]);
    expect(run.completion).toEqual([5n, 5n, 10n, 14n, 14n]);
    expect(run.contributions).toEqual([15n, 10n, 30n, 42n, 56n]);
    expect(run.finishTime).toBe(14n);
  });
  it('changes cost when a boundary changes', () => {
    expect(scheduleCost(example, []).cost).toBeGreaterThan(153n);
    expect(scheduleCost(example, [2,3,3,0,5]).cost).toBe(153n);
  });
  it('replays actual historical candidates at each hull query', () => {
    const result = optimized(example);
    for (const frame of result.hullSteps) {
      expect(frame.queryLines.every(line => line.j < frame.i)).toBe(true);
      expect(frame.values).toEqual(frame.queryLines.map(line => line.m * frame.x + line.b));
      expect(frame.value).toBe(frame.values.reduce((minimum, value) => value < minimum ? value : minimum));
      expect(frame.queryLines.some(line => line.j === frame.chosen)).toBe(true);
    }
  });
  it('never brings an evicted hull state back into the active queue', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const removed = new Set<number>();
      let checks = 0;
      for (const frame of optimized(seededInput(seed, 24)).hullSteps) {
        expect(frame.queryLines.every(line => !removed.has(line.j))).toBe(true);
        for (const state of [...frame.poppedFront, ...frame.removed]) removed.add(state);
        expect(frame.lines.every(line => !removed.has(line.j))).toBe(true);
        expect(frame.checks).toBeGreaterThan(checks);
        checks = frame.checks;
      }
    }
  });
  it('keeps large calculations free of animation frames', () => {
    const input = seededInput(817, 240);
    const slow = quadratic(input);
    const fast = optimized(input);
    expect(slow.steps).toHaveLength(0);
    expect(fast.hullSteps).toHaveLength(0);
    expect(slow.cost).toBe(fast.cost);
  });
  it('reproduces seeded datasets', () => {
    expect(seededInput(2026, 12)).toEqual(seededInput(2026, 12));
    expect(seededInput(2026, 12)).not.toEqual(seededInput(2027, 12));
  });
});
