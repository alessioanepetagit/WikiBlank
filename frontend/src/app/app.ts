import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { NotificationsComponent } from './components/notifications/notifications.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, NotificationsComponent],
  template: `
    <app-navbar />
    <app-notifications />
    <main class="container" id="main-content">
      <router-outlet />
    </main>
    <footer class="footer">
      <p>WikiBlank · Progetto di Tecnologie Web 2025/26 · Università degli Studi di Napoli Federico II</p>
    </footer>
  `,
})
export class App {}
