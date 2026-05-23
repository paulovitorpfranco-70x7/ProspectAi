import { PhoneFormatPipe } from './phone-format.pipe';

describe('PhoneFormatPipe', () => {
  const pipe = new PhoneFormatPipe();

  it('should format 11-digit phone as "(21) 99999-0001"', () => {
    expect(pipe.transform('21999990001')).toBe('(21) 99999-0001');
  });

  it('should format 10-digit phone as "(21) 9999-0001"', () => {
    expect(pipe.transform('2199990001')).toBe('(21) 9999-0001');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(pipe.transform('')).toBe('');
  });
});
