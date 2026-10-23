import { Pipe, PipeTransform } from '@angular/core';

/** Formatta un numero di secondi: 75 -> "1 min 15 s". */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(totalSeconds: number | null | undefined): string {
    if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) return '—';
    const seconds = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    if (hours > 0) return `${hours} h ${minutes} min ${rest} s`;
    if (minutes > 0) return `${minutes} min ${rest} s`;
    return `${rest} s`;
  }
}
