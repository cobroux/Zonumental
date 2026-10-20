import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideApiConfiguration } from '../../../core/api/api-configuration';
import { VerificationEmail } from './verification-email';

const VERIF = '/api/compte/email/verification';
const RENVOI = '/api/compte/email/verification/renvoi';

describe('VerificationEmail', () => {
  let fixture: ComponentFixture<VerificationEmail>;
  let http: HttpTestingController;
  const racine = () => fixture.nativeElement as HTMLElement;
  const apres = async () => {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };

  async function ouvrir(params: Record<string, string> = { jeton: 'abc' }) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(''),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(params) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Location), 'replaceState');
    fixture = TestBed.createComponent(VerificationEmail);
    await fixture.whenStable();
  }
  const repondre = async (status: number, corps = '') => {
    http.expectOne(VERIF).flush(corps, { status, statusText: '' });
    await apres();
  };
  const probleme = (code: string, status: number) =>
    JSON.stringify({ code, status, title: '', type: '' });
  const soumettre = async (adresse: string) => {
    const champ = racine().querySelector<HTMLInputElement>('input[name="email"]')!;
    champ.value = adresse;
    champ.dispatchEvent(new Event('input'));
    racine()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  it('affiche un chargement accessible, poste le jeton une seule fois et le retire de l’URL', async () => {
    await ouvrir();
    expect(racine().querySelector('[role="status"]')?.textContent).toContain('Vérification');
    expect(racine().querySelectorAll('h1')).toHaveLength(1);
    expect(http.expectOne(VERIF).request.body).toEqual({ jeton: 'abc' });
    expect(TestBed.inject(Location).replaceState).toHaveBeenCalledWith('/verifier-email');
    fixture.detectChanges();
    http.expectNone(VERIF);
  });

  it('204 : e-mail confirmé, focus sur le message', async () => {
    await ouvrir();
    await repondre(204);
    const m = racine().querySelector('zn-message')!;
    expect(m.textContent).toContain('E-mail confirmé');
    expect(m.getAttribute('role')).toBe('status');
    expect(document.activeElement).toBe(m);
    expect(racine().querySelector('form')).toBeNull();
  });

  it('409 jeton-deja-utilise : lien déjà utilisé, sans renvoi', async () => {
    await ouvrir();
    await repondre(409, probleme('jeton-deja-utilise', 409));
    expect(racine().querySelector('zn-message')?.textContent).toContain('déjà servi');
    expect(racine().querySelector('form')).toBeNull();
  });

  it('410 jeton-expire : lien expiré avec formulaire de renvoi', async () => {
    await ouvrir();
    await repondre(410, probleme('jeton-expire', 410));
    const m = racine().querySelector('zn-message')!;
    expect(m.textContent).toContain('expiré');
    expect(m.getAttribute('role')).toBe('alert');
    expect(racine().querySelector('form input[type="email"]')).toBeTruthy();
  });

  it('400 jeton-invalide : lien invalide avec formulaire de renvoi', async () => {
    await ouvrir();
    await repondre(400, probleme('jeton-invalide', 400));
    expect(racine().querySelector('zn-message')?.textContent).toContain('plus valide');
    expect(racine().querySelector('form')).toBeTruthy();
  });

  it('erreur réseau : message générique, sans renvoi', async () => {
    await ouvrir();
    http.expectOne(VERIF).error(new ProgressEvent('error'));
    await apres();
    expect(racine().querySelector('zn-message')?.textContent).toContain('Une erreur est survenue');
    expect(racine().querySelector('form')).toBeNull();
  });

  it('sans jeton dans l’URL : lien invalide, aucun appel', async () => {
    await ouvrir({});
    await apres();
    http.expectNone(VERIF);
    expect(racine().querySelector('zn-message')?.textContent).toContain('plus valide');
    expect(racine().querySelector('form')).toBeTruthy();
  });

  it('renvoi : poste l’e-mail et affiche le message neutre après 202', async () => {
    await ouvrir();
    await repondre(410, probleme('jeton-expire', 410));
    await soumettre(' marco@exemple.fr ');
    const req = http.expectOne(RENVOI);
    expect(req.request.body).toEqual({ email: 'marco@exemple.fr' });
    req.flush('', { status: 202, statusText: '' });
    await apres();
    const m = racine().querySelectorAll('zn-message');
    expect(m[m.length - 1].textContent).toContain(
      'Si un carnet existe pour cette adresse, un nouveau lien vient de partir',
    );
    expect(racine().querySelector('form')).toBeNull();
  });

  it('renvoi : e-mail vide refusé sans appel, erreur liée au champ', async () => {
    await ouvrir({});
    await soumettre('');
    await apres();
    http.expectNone(RENVOI);
    expect(racine().querySelector('input[name="email"]')?.getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('renvoi : erreur réseau affichée, formulaire conservé', async () => {
    await ouvrir({});
    await soumettre('marco@exemple.fr');
    http.expectOne(RENVOI).error(new ProgressEvent('error'));
    await apres();
    expect(racine().querySelector('form')).toBeTruthy();
    expect(racine().textContent).toContain('Une erreur est survenue');
  });
});
