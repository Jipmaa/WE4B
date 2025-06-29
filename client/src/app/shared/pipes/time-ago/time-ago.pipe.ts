import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true,
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: Date | string): string {
    if (!value) {
      return '';
    }

    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return 'maintenant';
    }

    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return rtf.format(-minutes, 'minute');
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return rtf.format(-hours, 'hour');
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return rtf.format(-days, 'day');
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return rtf.format(-weeks, 'week');
    }

    const months = Math.floor(days / 30); // Approximation
    if (months < 12) {
      return rtf.format(-months, 'month');
    }

    const years = Math.floor(days / 365); // Approximation
    return rtf.format(-years, 'year');
  }
}
