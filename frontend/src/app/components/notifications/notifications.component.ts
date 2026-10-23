import { Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  template: `
    <div class="notifications" aria-live="polite">
      @for (n of service.notifications(); track n.id) {
        <div class="notification notification-{{ n.type }}" [attr.role]="n.type === 'error' ? 'alert' : 'status'">
          <span>{{ n.text }}</span>
          <button type="button" class="notification-close" aria-label="Chiudi messaggio" (click)="service.dismiss(n.id)">
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class NotificationsComponent {
  protected readonly service = inject(NotificationService);
}
