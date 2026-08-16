import formatEventDate, { eventDateChip } from '../formatEventDate';

describe('formatEventDate', () => {
  it('formats a valid ISO date', () => {
    expect(formatEventDate('2026-08-12T12:00:00')).toBe('Aug 12, 2026');
  });

  it('reads null as "Date TBD"', () => {
    expect(formatEventDate(null)).toBe('Date TBD');
  });

  it('reads an unparseable value as "Date TBD"', () => {
    expect(formatEventDate('not-a-date')).toBe('Date TBD');
  });
});

describe('eventDateChip', () => {
  it('splits a valid date into an uppercase month and a day', () => {
    expect(eventDateChip('2026-08-12T12:00:00')).toEqual({ month: 'AUG', day: '12' });
  });

  it('reads null as a TBD chip with no day', () => {
    expect(eventDateChip(null)).toEqual({ month: 'TBD', day: '' });
  });

  it('reads an unparseable value as a TBD chip', () => {
    expect(eventDateChip('nope')).toEqual({ month: 'TBD', day: '' });
  });
});
