import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../../core/api/api-configuration';
import { Reinitialisation } from './reinitialisation';

const URL = '/api/compte/mot-de-passe/reinitialisation';

describe('Reinitialisation', () => {
  let fixture: ComponentFixture<Reinitialisation>;
  let http: HttpTestingController;
  let router: Router;
  const racine = () => fixture.nativeElement as HTMLElement;
  const champ = () => racine().querySelector<HTMLInputElement>('[name="motDePasse"]')!;
  const message = () => racine().querySelector('zn-message');
  const saisir = (v: string) => {
    champ().value = v;
    champ().dispatchEvent(new Event('input'));
  };
  const soumettre = async () => {
    racine()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  const apres = async () => {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };
  const echec = async (status: number, code: string) => {
    saisir('chat-bleu-47-lune');
    await soumettre();
    http.expectOne(URL).flush(JSON.stringify({ code, status }), { status, statusText: '' });
    await apres();
  };

  async function ouvrir(jeton: string | null = 'J123') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(''),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(jeton ? { jeton } : {}) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Location), 'replaceState').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(Reinitialisation);
    await fixture.whenStable();
  }

  it('champ accessible, retire le jeton de l’URL', async () => {
    await ouvrir();
    expect(TestBed.inject(Location).replaceState).toHaveBeenCalledWith(
      '/reinitialiser-mot-de-passe',
    );
    expect(racine().querySelector(`label[for="${champ().id}"]`)).toBeTruthy();
    expect(champ().getAttribute('autocomplete')).toBe('new-password');
    expect(racine().textContent).toContain('Afficher');
  });

  it('moins de 12 caractères : erreur, focus, aucun envoi', async () => {
    await ouvrir();
    saisir('court');
    await soumettre();
    await apres();
    expect(racine().textContent).toContain('au moins 12 caractères');
    expect(document.activeElement).toBe(champ());
    http.expectNone(URL);
  });

  it('plus de 128 caractères : erreur, aucun envoi', async () => {
    await ouvrir();
    saisir('a'.repeat(129));
    await soumettre();
    await apres();
    expect(racine().textContent).toContain('128 caractères au plus');
    http.expectNone(URL);
  });

  it('204 : envoie jeton et mot de passe, redirige vers la connexion avec le message de succès', async () => {
    await ouvrir();
    saisir('chat-bleu-47-lune');
    await soumettre();
    const req = http.expectOne(URL);
    expect(req.request.body).toEqual({ jeton: 'J123', nouveauMotDePasse: 'chat-bleu-47-lune' });
    req.flush(null, { status: 204, statusText: '' });
    await apres();
    expect(router.navigate).toHaveBeenCalledWith(['/connexion'], {
      queryParams: { reinitialise: 1 },
    });
  });

  it.each([
    [400, 'jeton-invalide', "n'est plus valide"],
    [409, 'jeton-deja-utilise', 'déjà servi'],
    [410, 'jeton-expire', 'a expiré'],
  ])('%i %s : message clair, focus, lien pour redemander', async (status, code, texte) => {
    await ouvrir();
    await echec(status, code);
    expect(message()?.textContent).toContain(texte);
    expect(message()?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(message());
    expect(racine().querySelector('form')).toBeNull();
    expect(racine().querySelector('a[href="/mot-de-passe-oublie"]')).toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('400 validation : erreur sur le champ', async () => {
    await ouvrir();
    await echec(400, 'validation');
    expect(champ().getAttribute('aria-invalid')).toBe('true');
  });

  it('erreur serveur : message générique, formulaire conservé', async () => {
    await ouvrir();
    await echec(500, 'erreur');
    expect(message()?.textContent).toContain('Une erreur est survenue');
    expect(racine().querySelector('form')).toBeTruthy();
  });

  it('sans jeton dans l’URL : lien invalide, pas de formulaire', async () => {
    await ouvrir(null);
    expect(message()?.textContent).toContain("n'est plus valide");
    expect(racine().querySelector('form')).toBeNull();
  });
});
