import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../../core/api/api-configuration';
import { VerifieTonEmail } from './verifie-ton-email';

describe('VerifieTonEmail', () => {
  let fixture: ComponentFixture<VerifieTonEmail>;
  let http: HttpTestingController;
  const racine = () => fixture.nativeElement as HTMLElement;
  const bouton = () => racine().querySelector<HTMLButtonElement>('.pied button')!;
  const apres = async () => {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };

  function configurer() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(''),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }
  async function ouvrir(email?: string) {
    configurer();
    history.replaceState(email ? { email } : null, '');
    fixture = TestBed.createComponent(VerifieTonEmail);
    await fixture.whenStable();
  }

  afterEach(() => history.replaceState(null, ''));

  it('affiche l’adresse saisie, un titre, le renvoi et le lien vers la connexion', async () => {
    await ouvrir('marco@exemple.fr');
    expect(racine().querySelector('h1')?.textContent).toContain('Vérifie ton e-mail');
    expect(racine().textContent).toContain('marco@exemple.fr');
    expect(bouton()).toBeTruthy();
    expect(racine().querySelector('a[href="/connexion"]')).toBeTruthy();
  });

  it('lit l’adresse dans l’état de navigation en cours', async () => {
    configurer();
    vi.spyOn(TestBed.inject(Router), 'currentNavigation').mockReturnValue({
      extras: { state: { email: 'nav@exemple.fr' } },
    } as never);
    fixture = TestBed.createComponent(VerifieTonEmail);
    await fixture.whenStable();
    expect(racine().textContent).toContain('nav@exemple.fr');
  });

  it('sans adresse (rechargement) : pas de renvoi, on propose la connexion', async () => {
    await ouvrir();
    expect(racine().querySelector('.pied button')).toBeNull();
    expect(racine().querySelector('a[href="/connexion"]')).toBeTruthy();
  });

  it('renvoi : aria-busy pendant l’envoi, puis résultat annoncé et focalisé', async () => {
    await ouvrir('marco@exemple.fr');
    bouton().click();
    await fixture.whenStable();
    expect(bouton().getAttribute('aria-busy')).toBe('true');
    const req = http.expectOne('/api/compte/email/verification/renvoi');
    expect(req.request.body).toEqual({ email: 'marco@exemple.fr' });
    req.flush('', { status: 202, statusText: 'Accepted' });
    await apres();
    const m = racine().querySelector('zn-message[role="status"]')!;
    expect(m.textContent).toContain('nouveau lien');
    expect(document.activeElement).toBe(m);
    expect(bouton().getAttribute('aria-busy')).toBeNull();
  });

  it('429 : message de patience, bouton réutilisable', async () => {
    await ouvrir('marco@exemple.fr');
    bouton().click();
    await fixture.whenStable();
    http
      .expectOne('/api/compte/email/verification/renvoi')
      .flush('{}', { status: 429, statusText: '' });
    await apres();
    const m = racine().querySelector('zn-message[role="alert"]')!;
    expect(m.textContent).toContain('une minute');
    expect(bouton().disabled).toBe(false);
  });

  it('autre erreur : message générique', async () => {
    await ouvrir('marco@exemple.fr');
    bouton().click();
    await fixture.whenStable();
    http
      .expectOne('/api/compte/email/verification/renvoi')
      .flush('{}', { status: 500, statusText: '' });
    await apres();
    expect(racine().querySelector('zn-message[role="alert"]')?.textContent).toContain('erreur');
  });
});
