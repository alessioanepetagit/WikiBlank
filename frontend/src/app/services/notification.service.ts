import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: number;
  type: NotificationType;
  text: string;
}

/** Messaggi di feedback globali (mostrati dal componente NotificationsComponent). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  readonly notifications = signal<Notification[]>([]);

  show(type: NotificationType, text: string, durationMs = 6000): void {
    const id = this.nextId++;
    this.notifications.update((list) => [...list, { id, type, text }]);
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(text: string): void {
    this.show('success', text);
  }
  error(text: string): void {
    this.show('error', text);
  }
  info(text: string): void {
    this.show('info', text);
  }

  dismiss(id: number): void {
    this.notifications.update((list) => list.filter((n) => n.id !== id));
  }
}
