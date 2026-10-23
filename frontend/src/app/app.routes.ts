import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { GamePage } from './pages/game/game.page';
import { GamesPage } from './pages/games/games.page';
import { HomePage } from './pages/home/home.page';
import { LoginPage } from './pages/login/login.page';
import { NotFoundPage } from './pages/not-found/not-found.page';
import { PlayPage } from './pages/play/play.page';
import { RankingsPage } from './pages/rankings/rankings.page';
import { RegisterPage } from './pages/register/register.page';

const TITLE = 'WikiBlank';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomePage, title: TITLE },
  { path: 'login', component: LoginPage, title: `Accedi | ${TITLE}` },
  { path: 'register', component: RegisterPage, title: `Registrati | ${TITLE}` },
  { path: 'games', component: GamesPage, title: `Partite concluse | ${TITLE}` },
  { path: 'games/:id', component: GamePage, title: `Partita | ${TITLE}` },
  { path: 'play', component: PlayPage, title: `Gioca | ${TITLE}`, canActivate: [authGuard] },
  { path: 'rankings', component: RankingsPage, title: `Classifica | ${TITLE}` },
  { path: '**', component: NotFoundPage, title: `Pagina non trovata | ${TITLE}` },
];
