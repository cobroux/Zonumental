import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../../core/api/api-configuration';
import { MotDePasseOublie } from './mot-de-passe-oublie';

const URL = '/api/compte/mot-de-passe/oubli';

describe('MotDePasseOublie', () => {
  let fixture: ComponentFixture<MotDePasseOublie>;
  let http: HttpTestingController;
  const racine = () => fixture.nativeElement as HTMLElement;
  const champ = () => racine().querySelector<HTMLInputElement>('[name="email"]')!;
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

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(''),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MotDePasseOublie);
    await fixture.whenStable();
  });

  it('champ e-mail libellé, autocomplete email', () => {
    expect(racine().querySelector('h1')?.textContent).toBe('Mot de passe oublié');
    expect(racine().querySelector(`label[for="${champ().id}"]`)).toBeTruthy();
    expect(champ().getAttribute('autocomplete')).toBe('email');
  });

  it('e-mail vide : erreur liée au champ, focus, aucun envoi', async () => {
    await soumettre();
    await apres();
    expect(champ().getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(champ());
    http.expectNone(URL);
  });

  it('202 : message de confirmation neutre, focalisé, formulaire retiré', async () => {
    saisir(' marco@exemple.fr ');
    await soumettre();
    const req = http.expectOne(URL);
    expect(req.request.body).toEqual({ email: 'marco@exemple.fr' });
    req.flush(null, { status: 202, statusText: '' });
    await apres();
    expect(message()?.textContent).toContain('Si un carnet existe');
    expect(document.activeElement).toBe(message());
    expect(racine().querySelector('form')).toBeNull();
    expect(racine().querySelector('a[href="/connexion"]')).toBeTruthy();
  });

  it('400 validation : erreur sur le champ', async () => {
    saisir('nimporte');
    await soumettre();
    http
      .expectOne(URL)
      .flush(JSON.stringify({ code: 'validation', status: 400 }), { status: 400, statusText: '' });
    await apres();
    expect(champ().getAttribute('aria-invalid')).toBe('true');
    expect(racine().textContent).toContain('adresse e-mail valide');
  });

  it('erreur serveur : message annoncé, formulaire conservé', async () => {
    saisir('a@b.fr');
    await soumettre();
    http.expectOne(URL).flush('', { status: 500, statusText: '' });
    await apres();
    expect(message()?.getAttribute('role')).toBe('alert');
    expect(champ().value).toBe('a@b.fr');
  });
});
