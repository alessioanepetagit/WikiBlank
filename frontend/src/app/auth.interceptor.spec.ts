import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { API_URL } from './config';
import { AuthService } from './services/auth.service';
import { fakeJwt } from './testing';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  it('should add the Bearer token to requests to the API', () => {
    const token = fakeJwt(3600);
    auth.setSession(token, 'gerry');
    http.get(`${API_URL}/games`).subscribe();
    const req = controller.expectOne(`${API_URL}/games`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
  });

  it('should not send the token to other origins', () => {
    auth.setSession(fakeJwt(3600), 'gerry');
    http.get('https://example.org/data').subscribe();
    const req = controller.expectOne('https://example.org/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should log the user out when the API answers 401 to an authenticated request', () => {
    auth.setSession(fakeJwt(3600), 'gerry');
    http.get(`${API_URL}/games`).subscribe({ error: () => undefined });
    controller.expectOne(`${API_URL}/games`).flush({ code: 401 }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
  });
});
