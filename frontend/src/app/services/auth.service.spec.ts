import { TestBed } from '@angular/core/testing';
import { fakeJwt } from '../testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  it('should be created and start unauthenticated', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.username()).toBeNull();
  });

  it('should detect malformed tokens', () => {
    expect(service.verifyToken('malformed')).toBe(false);
    expect(service.verifyToken('a.b')).toBe(false);
    expect(service.verifyToken('a.!!!.c')).toBe(false);
    expect(service.verifyToken(null)).toBe(false);
  });

  it('should detect expired tokens', () => {
    expect(service.verifyToken(fakeJwt(-60))).toBe(false);
  });

  it('should accept well-formed, non-expired tokens', () => {
    expect(service.verifyToken(fakeJwt(3600))).toBe(true);
  });

  it('should store the session and expose the username', () => {
    const token = fakeJwt(3600);
    service.setSession(token, 'gerry');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.username()).toBe('gerry');
    expect(service.token()).toBe(token);
    expect(localStorage.getItem('wikiblank.token')).toBe(token);
  });

  it('should clear the session on logout', () => {
    service.setSession(fakeJwt(3600), 'gerry');
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('wikiblank.token')).toBeNull();
    expect(localStorage.getItem('wikiblank.user')).toBeNull();
  });

  it('should close the session when the stored token has expired', () => {
    service.setSession(fakeJwt(-10), 'gerry');
    expect(service.isUserAuthenticated()).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should restore a valid session from localStorage and discard an expired one', () => {
    localStorage.setItem('wikiblank.token', fakeJwt(3600));
    localStorage.setItem('wikiblank.user', 'gerry');
    TestBed.resetTestingModule();
    expect(TestBed.inject(AuthService).username()).toBe('gerry');

    localStorage.setItem('wikiblank.token', fakeJwt(-10));
    TestBed.resetTestingModule();
    const restored = TestBed.inject(AuthService);
    expect(restored.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('wikiblank.token')).toBeNull();
  });
});
