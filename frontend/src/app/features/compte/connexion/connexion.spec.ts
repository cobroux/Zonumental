import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../../core/api/api-configuration';
import { Session } from '../../../core/session/session';
import { Connexion } from './connexion';

const URL = '/api/auth/connexion';

describe('Connexion', () => {
  let fixture: ComponentFixture<Connexion>;
  let http: HttpTestingController;
  let router: Router;
  const racine = () => fixture.nativeElement as HTMLElement;
  const champ = (nom: string) => racine().querySelector<HTMLInputElement>(`[name="${nom}"]`)!;
  const saisir = (nom: string, valeur: string) => {
    champ(nom).value = valeur;
    champ(nom).dispatchEvent(new Event('input'));
  };
  const apres = async () => {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };
  const soumettre = async () => {
    racine()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  const message = () => racine().querySelector('zn-message');

  async function ouvrir(params: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(''),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(params) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Connexion);
    await fixture.whenStable();
  }
  async function envoyer(status = 200, corps: object = {}, headers = {}) {
    saisir('email', ' marco@exemple.fr ');
    saisir('motDePasse', 'chat-bleu-47-lune');
    await soumettre();
    http.expectOne(URL).flush(JSON.stringify(corps), { status, statusText: '', headers });
    await apres();
  }

  it('champs accessibles : libellés, autocomplete, bouton Afficher, retour 44 px, lien inscription', async () => {
    await ouvrir();
    expect(racine().querySelector('h1')?.textContent).toBe('Retrouve ton carnet');
    expect(racine().querySelector('header button')?.getAttribute('aria-label')).toBe('Retour');
    expect(champ('email').getAttribute('autocomplete')).toBe('username');
    expect(champ('motDePasse').getAttribute('autocomplete')).toBe('current-password');
    for (const n of ['email', 'motDePasse'])
      expect(racine().querySelector(`label[for="${champ(n).id}"]`)).toBeTruthy();
    expect(racine().textContent).toContain('Afficher');
    expect(racine().querySelector('a[href="/inscription"]')).toBeTruthy();
  });

  it('retour : revient en arrière dans l’historique', async () => {
    await ouvrir();
    const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);
    racine().querySelector<HTMLButtonElement>('header button')!.click();
    expect(back).toHaveBeenCalled();
  });

  it('champs vides : erreurs liées aux champs, focus sur le premier, aucun envoi', async () => {
    await ouvrir();
    await soumettre();
    await apres();
    expect(racine().textContent).toContain('Saisis ton adresse e-mail.');
    expect(racine().textContent).toContain('Saisis ton mot de passe.');
    expect(champ('email').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(champ('email'));
    http.expectNone(URL);
  });

  it('succès : jeton en mémoire, e-mail rogné envoyé, navigation vers / par défaut', async () => {
    await ouvrir();
    saisir('email', ' marco@exemple.fr ');
    saisir('motDePasse', 'chat-bleu-47-lune');
    await soumettre();
    const req = http.expectOne(URL);
    expect(req.request.body).toEqual({
      email: 'marco@exemple.fr',
      motDePasse: 'chat-bleu-47-lune',
    });
    req.flush({ jetonAcces: 'J', expireDans: 900 });
    await apres();
    expect(TestBed.inject(Session).jeton()).toBe('J');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(champ('motDePasse').value).toBe('');
  });

  it('succès avec ?retour=/profil : retourne à la page demandée', async () => {
    await ouvrir({ retour: '/profil' });
    await envoyer(200, { jetonAcces: 'J', expireDans: 900 });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/profil');
  });

  it('?retour=//evil.com est refusé : retour à /', async () => {
    await ouvrir({ retour: '//evil.com' });
    await envoyer(200, { jetonAcces: 'J', expireDans: 900 });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('401 identifiants-invalides : message annoncé (role=alert), focus dessus, pas de navigation', async () => {
    await ouvrir();
    await envoyer(401, { code: 'identifiants-invalides', status: 401 });
    expect(message()?.textContent).toContain('E-mail ou mot de passe incorrect');
    expect(message()?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(message());
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(TestBed.inject(Session).connecte()).toBe(false);
  });

  it('400 validation : message générique', async () => {
    await ouvrir();
    await envoyer(400, { code: 'validation', status: 400 });
    expect(message()?.textContent).toContain('Vérifie ton e-mail et ton mot de passe');
  });

  it('409 suppression-en-cours : affiche la date de suppression définitive', async () => {
    await ouvrir();
    await envoyer(409, {
      code: 'suppression-en-cours',
      status: 409,
      suppressionDefinitiveLe: '2026-11-19T10:00:00Z',
    });
    expect(message()?.textContent).toContain('supprimé le 19 novembre 2026');
  });

  it('429 connexion-bloquee : minutes arrondies au supérieur depuis Retry-After', async () => {
    await ouvrir();
    await envoyer(429, { code: 'connexion-bloquee', status: 429 }, { 'Retry-After': '841' });
    expect(message()?.textContent).toContain('Réessaie dans 15 min');
  });

  it('erreur réseau : message de connexion perdue, formulaire conservé', async () => {
    await ouvrir();
    saisir('email', 'a@b.fr');
    saisir('motDePasse', 'x');
    await soumettre();
    http.expectOne(URL).error(new ProgressEvent('error'));
    await apres();
    expect(message()?.textContent).toContain('Pas de connexion');
    expect(champ('email').value).toBe('a@b.fr');
  });

  it('pas de double envoi pendant la requête, bouton aria-busy', async () => {
    await ouvrir();
    saisir('email', 'a@b.fr');
    saisir('motDePasse', 'x');
    await soumettre();
    await soumettre();
    expect(racine().querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true');
    http.expectOne(URL).flush({ jetonAcces: 'J', expireDans: 900 });
    await apres();
  });
});
