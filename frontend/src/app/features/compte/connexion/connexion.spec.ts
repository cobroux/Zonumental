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
  const annuler = () => racine().querySelector<HTMLButtonElement>('button.annuler');

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

  it('lien mot de passe oublié, et message de succès après réinitialisation', async () => {
    await ouvrir({ reinitialise: '1' });
    expect(racine().querySelector('a[href="/mot-de-passe-oublie"]')).toBeTruthy();
    expect(message()?.textContent).toContain('Mot de passe modifié');
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

  it('succès sans page demandée : jeton en mémoire, e-mail rogné envoyé, va sur /profil', async () => {
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
    expect(router.navigateByUrl).toHaveBeenCalledWith('/profil');
  });

  it('succès avec ?retour=/profil : retourne à la page demandée', async () => {
    await ouvrir({ retour: '/profil' });
    await envoyer(200, { jetonAcces: 'J', expireDans: 900 });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/profil');
  });

  it('?retour=//evil.com est refusé : pas de navigation', async () => {
    await ouvrir({ retour: '//evil.com' });
    await envoyer(200, { jetonAcces: 'J', expireDans: 900 });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/profil');
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
    expect(message()?.textContent).toContain('Ton compte sera supprimé le 19 novembre 2026');
    expect(document.activeElement).toBe(message());
    expect(annuler()).toBeTruthy();
  });

  describe('annulation de la suppression', () => {
    const ANNUL = '/api/compte/suppression/annulation';
    const ouvrirEn409 = async (params = {}) => {
      await ouvrir(params);
      await envoyer(409, {
        code: 'suppression-en-cours',
        status: 409,
        suppressionDefinitiveLe: '2026-11-19T10:00:00Z',
      });
    };

    it('200 : rappelle avec les identifiants saisis, connecté, va sur la destination demandée', async () => {
      await ouvrirEn409({ retour: '/profil' });
      annuler()!.click();
      await fixture.whenStable();
      const req = http.expectOne(ANNUL);
      expect(req.request.body).toEqual({
        email: 'marco@exemple.fr',
        motDePasse: 'chat-bleu-47-lune',
      });
      req.flush({ jetonAcces: 'J2', expireDans: 900 });
      await apres();
      expect(TestBed.inject(Session).jeton()).toBe('J2');
      expect(router.navigateByUrl).toHaveBeenCalledWith('/profil');
    });

    it('pas de double envoi, bouton aria-busy', async () => {
      await ouvrirEn409();
      annuler()!.click();
      annuler()!.click();
      await fixture.whenStable();
      expect(annuler()!.getAttribute('aria-busy')).toBe('true');
      http.expectOne(ANNUL).flush({ jetonAcces: 'J', expireDans: 900 });
      await apres();
    });

    it('401 : message d’identifiants, plus de bouton d’annulation', async () => {
      await ouvrirEn409();
      annuler()!.click();
      await fixture.whenStable();
      http.expectOne(ANNUL).flush(JSON.stringify({ code: 'identifiants-invalides', status: 401 }), {
        status: 401,
        statusText: '',
      });
      await apres();
      expect(message()?.textContent).toContain('E-mail ou mot de passe incorrect');
      expect(annuler()).toBeNull();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('429 : minutes depuis Retry-After', async () => {
      await ouvrirEn409();
      annuler()!.click();
      await fixture.whenStable();
      http.expectOne(ANNUL).flush(JSON.stringify({ code: 'connexion-bloquee', status: 429 }), {
        status: 429,
        statusText: '',
        headers: { 'Retry-After': '841' },
      });
      await apres();
      expect(message()?.textContent).toContain('Réessaie dans 15 min');
    });
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
