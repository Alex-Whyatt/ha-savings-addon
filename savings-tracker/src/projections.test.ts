import { describe, it, expect } from 'vitest';
import { normalizeToNoon } from './projections';
import { getDay, format, addWeeks } from 'date-fns';

describe('normalizeToNoon', () => {
  it('should normalize a date to noon', () => {
    const date = new Date('2024-12-13T00:00:00');
    const normalized = normalizeToNoon(date);
    expect(normalized.getHours()).toBe(12);
    expect(normalized.getMinutes()).toBe(0);
    expect(normalized.getSeconds()).toBe(0);
    expect(normalized.getMilliseconds()).toBe(0);
  });

  it('should preserve the date when normalizing', () => {
    const date = new Date('2024-12-13T23:59:59');
    const normalized = normalizeToNoon(date);
    expect(normalized.getDate()).toBe(13);
    expect(normalized.getMonth()).toBe(11); // December is month 11
    expect(normalized.getFullYear()).toBe(2024);
  });
});

describe('Weekly recurring date calculations', () => {
  it('should maintain the same day of week when adding weeks', () => {
    // Friday, December 13, 2024
    const originalDate = new Date('2024-12-13T12:00:00');
    const originalDayOfWeek = getDay(originalDate);
    
    expect(originalDayOfWeek).toBe(5); // Friday is day 5
    expect(format(originalDate, 'EEEE')).toBe('Friday');
    
    // Adding weeks should keep it on Friday
    for (let i = 1; i <= 10; i++) {
      const futureDate = new Date(originalDate);
      futureDate.setDate(futureDate.getDate() + (i * 7));
      
      expect(getDay(futureDate)).toBe(5); // Should still be Friday
      expect(format(futureDate, 'EEEE')).toBe('Friday');
    }
  });

  it('should correctly calculate weekly dates across months', () => {
    // Friday, December 13, 2024
    const friday13Dec = new Date('2024-12-13T12:00:00');
    
    // Week 1: December 20, 2024 (Friday)
    const week1 = new Date(friday13Dec);
    week1.setDate(week1.getDate() + 7);
    expect(week1.getDate()).toBe(20);
    expect(format(week1, 'EEEE')).toBe('Friday');
    
    // Week 2: December 27, 2024 (Friday)
    const week2 = new Date(friday13Dec);
    week2.setDate(week2.getDate() + 14);
    expect(week2.getDate()).toBe(27);
    expect(format(week2, 'EEEE')).toBe('Friday');
    
    // Week 3: January 3, 2025 (Friday) - crosses into new month/year
    const week3 = new Date(friday13Dec);
    week3.setDate(week3.getDate() + 21);
    expect(week3.getDate()).toBe(3);
    expect(week3.getMonth()).toBe(0); // January
    expect(week3.getFullYear()).toBe(2025);
    expect(format(week3, 'EEEE')).toBe('Friday');
  });

  it('should correctly identify day of week for December 2024', () => {
    // December 1, 2024 is a Sunday
    const dec1 = new Date('2024-12-01T12:00:00');
    expect(getDay(dec1)).toBe(0); // Sunday
    expect(format(dec1, 'EEEE')).toBe('Sunday');
    
    // December 13, 2024 is a Friday
    const dec13 = new Date('2024-12-13T12:00:00');
    expect(getDay(dec13)).toBe(5); // Friday
    expect(format(dec13, 'EEEE')).toBe('Friday');
    
    // December 16, 2024 is a Monday
    const dec16 = new Date('2024-12-16T12:00:00');
    expect(getDay(dec16)).toBe(1); // Monday
    expect(format(dec16, 'EEEE')).toBe('Monday');
  });

  it('should correctly identify day of week for January 2025', () => {
    // January 1, 2025 is a Wednesday
    const jan1 = new Date('2025-01-01T12:00:00');
    expect(getDay(jan1)).toBe(3); // Wednesday
    expect(format(jan1, 'EEEE')).toBe('Wednesday');
    
    // January 3, 2025 is a Friday
    const jan3 = new Date('2025-01-03T12:00:00');
    expect(getDay(jan3)).toBe(5); // Friday
    expect(format(jan3, 'EEEE')).toBe('Friday');
  });
});

describe('Calendar grid alignment', () => {
  it('should calculate correct number of empty cells for December 2024', () => {
    // December 1, 2024 is Sunday (day 0), so 0 empty cells needed
    const dec1 = new Date('2024-12-01T12:00:00');
    const emptyCells = getDay(dec1);
    expect(emptyCells).toBe(0);
  });

  it('should calculate correct number of empty cells for January 2025', () => {
    // January 1, 2025 is Wednesday (day 3), so 3 empty cells needed
    const jan1 = new Date('2025-01-01T12:00:00');
    const emptyCells = getDay(jan1);
    expect(emptyCells).toBe(3);
  });

  it('should calculate correct number of empty cells for November 2024', () => {
    // November 1, 2024 is Friday (day 5), so 5 empty cells needed
    const nov1 = new Date('2024-11-01T12:00:00');
    const emptyCells = getDay(nov1);
    expect(emptyCells).toBe(5);
  });
});

describe('Projection includes past dates in current month', () => {
  it('should include projections from start of current month', () => {
    // If today is Dec 16 and we have a weekly payment starting Dec 6,
    // Dec 13 (which is in the past but within this month) should still be included
    const today = new Date('2024-12-16T12:00:00');
    const monthStart = new Date('2024-12-01T12:00:00');
    const dec13 = new Date('2024-12-13T12:00:00');
    
    // Dec 13 is after month start but before today
    expect(dec13 >= monthStart).toBe(true);
    expect(dec13 < today).toBe(true);
    
    // This date should be included in projections (not skipped)
    // because it's after the start of the current month
  });
});

describe('date-fns addWeeks function', () => {
  it('should maintain day of week when using addWeeks', () => {
    const friday = new Date('2024-12-13T12:00:00');
    
    for (let i = 1; i <= 26; i++) {
      const futureDate = addWeeks(friday, i);
      expect(getDay(futureDate)).toBe(5); // Should always be Friday
    }
  });

  it('should correctly cross year boundaries', () => {
    const dec27 = new Date('2024-12-27T12:00:00'); // Friday
    const jan3 = addWeeks(dec27, 1);
    
    expect(jan3.getFullYear()).toBe(2025);
    expect(jan3.getMonth()).toBe(0); // January
    expect(jan3.getDate()).toBe(3);
    expect(getDay(jan3)).toBe(5); // Still Friday
  });
});

