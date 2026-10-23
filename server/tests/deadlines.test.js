import { describe, it, expect } from 'vitest';
import deadlinesModule from '../utils/deadlines.js';
const {
  hoursUntil,
  calculateRiskLevel,
  calculateCompletionProbability
} = deadlinesModule;
import geminiModule from '../utils/gemini.js';
const { extractJson } = geminiModule;

const now = new Date('2026-01-01T12:00:00.000Z');
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 3600000);

describe('deadline calculations', () => {
  it('computes hours until a deadline', () => {
    expect(hoursUntil(hoursFromNow(2), now)).toBe(2);
    expect(hoursUntil(null, now)).toBe(Infinity);
  });

  it('assigns risk levels by remaining time', () => {
    expect(calculateRiskLevel(null, now)).toBe('low');
    expect(calculateRiskLevel(hoursFromNow(-1), now)).toBe('critical');
    expect(calculateRiskLevel(hoursFromNow(0.5), now)).toBe('critical');
    expect(calculateRiskLevel(hoursFromNow(3), now)).toBe('high');
    expect(calculateRiskLevel(hoursFromNow(12), now)).toBe('medium');
    expect(calculateRiskLevel(hoursFromNow(48), now)).toBe('low');
  });

  it('assigns completion probability bands', () => {
    expect(calculateCompletionProbability(null, now)).toBe(100);
    expect(calculateCompletionProbability(hoursFromNow(-1), now)).toBe(0);
    expect(calculateCompletionProbability(hoursFromNow(0.5), now)).toBe(10);
    expect(calculateCompletionProbability(hoursFromNow(3), now)).toBe(25);
    expect(calculateCompletionProbability(hoursFromNow(12), now)).toBe(50);
    expect(calculateCompletionProbability(hoursFromNow(48), now)).toBe(75);
    expect(calculateCompletionProbability(hoursFromNow(100), now)).toBe(95);
  });
});

describe('Gemini JSON extraction', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses fenced JSON', () => {
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it('extracts JSON embedded in prose', () => {
    expect(extractJson('Here you go: {"a":3, "b":[1,2]} Thanks')).toEqual({ a: 3, b: [1, 2] });
  });

  it('throws on non-JSON', () => {
    expect(() => extractJson('not json')).toThrow();
  });
});
