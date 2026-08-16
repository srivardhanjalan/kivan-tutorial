import { normalizeUrl, isValidProductUrl } from '../productUrl';

describe('normalizeUrl', () => {
  it('prepends https:// when the scheme is missing', () => {
    expect(normalizeUrl('nike.com/air')).toBe('https://nike.com/air');
  });

  it('keeps an existing http(s) scheme (case-insensitive)', () => {
    expect(normalizeUrl('http://nike.com')).toBe('http://nike.com');
    expect(normalizeUrl('HTTPS://nike.com')).toBe('HTTPS://nike.com');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeUrl('  nike.com  ')).toBe('https://nike.com');
  });

  it('returns empty for a blank string', () => {
    expect(normalizeUrl('   ')).toBe('');
  });
});

describe('isValidProductUrl', () => {
  it('accepts a bare dotted host', () => {
    expect(isValidProductUrl('nike.com/air')).toBe(true);
  });

  it('accepts a full https URL', () => {
    expect(isValidProductUrl('https://www.zara.com/p/123')).toBe(true);
  });

  it('rejects a host with no dot', () => {
    expect(isValidProductUrl('hello')).toBe(false);
  });

  it('rejects a non-http scheme', () => {
    expect(isValidProductUrl('about:blank')).toBe(false);
  });

  it('rejects a blank string', () => {
    expect(isValidProductUrl('')).toBe(false);
  });
});
