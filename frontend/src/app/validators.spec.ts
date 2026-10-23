import { FormControl } from '@angular/forms';
import { notBlank } from './validators';

describe('notBlank', () => {
  it('should reject strings made only of whitespace', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ blank: true });
    expect(notBlank(new FormControl('\t\n'))).toEqual({ blank: true });
  });

  it('should accept real content and leave the empty case to Validators.required', () => {
    expect(notBlank(new FormControl('Vesuvio'))).toBeNull();
    expect(notBlank(new FormControl(' Vesuvio '))).toBeNull();
    expect(notBlank(new FormControl(''))).toBeNull();
  });
});
