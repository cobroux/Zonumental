import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideApiConfiguration } from '../api/api-configuration';
import { jetonInterceptor } from './jeton.interceptor';
import { Session } from './session';

const RENOUV = '/api/auth/renouvellement';
const jeton = (j: string) => ({ jetonAcces: j, expireDans: 900 });
const apres = () => new Promise((r) => setTimeout(r));

describe('Session et intercepteur', () => {
  let http: HttpTestingController;
  let session: Session;
  let client: HttpClient;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jetonInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration(''),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(Session);
    client = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  async function connecter(j = 'A') {
    const p = session.connecter('a@b.fr', 'x');
    http.expectOne('/api/auth/connexion').flush(jeton(j));
    await p;
  }

  it('la connexion garde le jeton en mémoire, sans aucun stockage navigateur', async () => {
    await connecter();
    expect(session.jeton()).toBe('A');
    expect(session.connecte()).toBe(true);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('le renouvellement réussi met le jeton, un 401 laisse la session anonyme', async () => {
    let p = session.renouveler();
    http.expectOne(RENOUV).flush(jeton('B'));
    expect(await p).toBe(true);
    expect(session.jeton()).toBe('B');
    p = session.renouveler();
    http.expectOne(RENOUV).flush({ code: 'session-expiree' }, { status: 401, statusText: '' });
    expect(await p).toBe(false);
    expect(session.connecte()).toBe(false);
  });

  it('la déconnexion appelle l’API puis vide le jeton, même si l’appel échoue', async () => {
    await connecter();
    const p = session.deconnecter();
    http.expectOne('/api/auth/deconnexion').flush(null, { status: 204, statusText: '' });
    await p;
    expect(session.jeton()).toBeNull();
    await connecter();
    const q = session.deconnecter().catch(() => undefined);
    http.expectOne('/api/auth/deconnexion').error(new ProgressEvent('error'));
    await q;
    expect(session.connecte()).toBe(false);
  });

  it('Bearer seulement sur /api/ hors /api/auth/, rien vers une autre origine', async () => {
    await connecter();
    client.get('/api/compte/moi').subscribe();
    client.get('/api/auth/deconnexion').subscribe();
    client.get('https://autre.example/api/compte/moi').subscribe();
    client.get('//autre.example/api/x').subscribe();
    expect(http.expectOne('/api/compte/moi').request.headers.get('Authorization')).toBe('Bearer A');
    expect(http.expectOne('/api/auth/deconnexion').request.headers.has('Authorization')).toBe(
      false,
    );
    expect(
      http.expectOne('https://autre.example/api/compte/moi').request.headers.has('Authorization'),
    ).toBe(false);
    expect(http.expectOne('//autre.example/api/x').request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('401 : un seul renouvellement pour plusieurs requêtes, puis chacune est rejouée', async () => {
    await connecter();
    const ok: string[] = [];
    for (const u of ['/api/a', '/api/b', '/api/c'])
      client.get<string>(u).subscribe((v) => ok.push(v));
    for (const r of http.match(() => true))
      r.flush({ code: 'session-expiree' }, { status: 401, statusText: '' });
    await apres();
    http.expectOne(RENOUV).flush(jeton('B'));
    await apres();
    const rejeux = http.match((r) => r.url.startsWith('/api/') && !r.url.startsWith('/api/auth'));
    expect(rejeux).toHaveLength(3);
    for (const r of rejeux) {
      expect(r.request.headers.get('Authorization')).toBe('Bearer B');
      r.flush(r.request.url);
    }
    expect(ok.sort()).toEqual(['/api/a', '/api/b', '/api/c']);
  });

  it('une requête déjà en vol pendant un renouvellement est rejouée sans en relancer un autre', async () => {
    await connecter();
    client.get('/api/a').subscribe();
    client.get('/api/b').subscribe();
    const [a, b] = http.match(() => true);
    a.flush({}, { status: 401, statusText: '' });
    await apres();
    http.expectOne(RENOUV).flush(jeton('B'));
    await apres();
    b.flush({}, { status: 401, statusText: '' });
    await apres();
    const rejeux = http.match('/api/b');
    expect(rejeux[0].request.headers.get('Authorization')).toBe('Bearer B');
    http.match('/api/a').forEach((r) => r.flush({}));
    rejeux.forEach((r) => r.flush({}));
  });

  it('401 sans Bearer (route publique) : remonte telle quelle, aucun renouvellement', async () => {
    let erreur: unknown;
    client.get('/api/public').subscribe({ error: (e) => (erreur = e) });
    http.expectOne('/api/public').flush({}, { status: 401, statusText: '' });
    await apres();
    expect((erreur as { status: number }).status).toBe(401);
    http.expectNone(RENOUV);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('renouvellement refusé : session vidée, navigation vers /connexion et erreur transmise', async () => {
    await connecter();
    let erreur: unknown;
    client.get('/api/a').subscribe({ error: (e) => (erreur = e) });
    http.expectOne('/api/a').flush({}, { status: 401, statusText: '' });
    await apres();
    http.expectOne(RENOUV).flush({}, { status: 401, statusText: '' });
    await apres();
    expect(session.connecte()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/connexion'], expect.anything());
    expect((erreur as { status: number }).status).toBe(401);
  });

  it('un 403 ou 500 ne déclenche aucun renouvellement', async () => {
    await connecter();
    client.get('/api/a').subscribe({ error: () => undefined });
    http.expectOne('/api/a').flush({}, { status: 500, statusText: '' });
    await apres();
    http.expectNone(RENOUV);
  });
});
