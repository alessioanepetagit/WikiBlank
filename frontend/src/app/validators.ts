import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Rifiuta i valori composti solo da spazi (Validators.required li accetterebbe). */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.length > 0 && control.value.trim().length === 0
    ? { blank: true }
    : null;
}
