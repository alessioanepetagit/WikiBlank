import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('should format seconds, minutes and hours', () => {
    expect(pipe.transform(0)).toBe('0 s');
    expect(pipe.transform(75)).toBe('1 min 15 s');
    expect(pipe.transform(3725)).toBe('1 h 2 min 5 s');
  });

  it('should show a dash when the duration is unknown', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });
});
