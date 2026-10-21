import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../../core/api/api-configuration';
import { Session } from '../../../core/session/session';
import { Suppression } from './suppression';

const URL = '/api/compte/suppression';

describe('Suppression', () => {
  let fixture: ComponentFixture<Suppression>;
  let http: HttpTestingController;
  const racine = () => fixture.nativeElement as HTMLElement;
  const bouton = () => racine().querySelector<HTMLButtonElement>('button[znBouton]')!;
  const apres = async () => {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };

  async function ouvrir() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(''),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Suppression);
    await fixture.whenStable();
  }

  it('explique les conséquences et demande une confirmation explicite, sans appel réseau', async () => {
    await ouvrir();
    expect(racine().querySelector('h1')?.textContent).toContain('Supprimer mon compte');
    const texte = racine().textContent!;
    expect(texte).toContain('30 jours');
    expect(texte).toContain('te reconnectant');
    expect(bouton().textContent).toContain('Supprimer définitivement');
    expect(racine().querySelector('a[href="/profil"]')).toBeTruthy();
    http.expectNone(URL);
  });

  it('retour : revient en arrière dans l’historique', async () => {
    await ouvrir();
    const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);
    racine().querySelector<HTMLButtonElement>('header button')!.click();
    expect(back).toHaveBeenCalled();
  });

  it('202 : session vidée sans renouvellement, date en français, lien vers /connexion', async () => {
    await ouvrir();
    const session = TestBed.inject(Session);
    bouton().click();
    await fixture.whenStable();
    expect(bouton().getAttribute('aria-busy')).toBe('true');
    bouton().click(); // pas de double envoi
    http
      .expectOne(URL)
      .flush(
        { suppressionDefinitiveLe: '2026-11-19T12:00:00+02:00' },
        { status: 202, statusText: '' },
      );
    await apres();
    expect(session.connecte()).toBe(false);
    http.expectNone('/api/auth/renouvellement');
    expect(racine().textContent).toContain('19 novembre 2026');
    expect(racine().querySelector('a[href="/connexion"]')).toBeTruthy();
    expect(racine().querySelector('button[znBouton]')).toBeNull();
  });

  it('erreur : message annoncé, focus dessus, on peut réessayer', async () => {
    await ouvrir();
    bouton().click();
    await fixture.whenStable();
    http.expectOne(URL).flush('', { status: 500, statusText: '' });
    await apres();
    const m = racine().querySelector('zn-message')!;
    expect(m.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(m);
    expect(bouton().getAttribute('aria-busy')).toBeNull();
  });
});
