import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../../core/api/api-configuration';
import { Session } from '../../../core/session/session';
import { Profil } from './profil';

describe('Profil', () => {
  let fixture: ComponentFixture<Profil>;
  let http: HttpTestingController;
  const racine = () => fixture.nativeElement as HTMLElement;
  const interrupteur = (i: number) =>
    racine().querySelectorAll<HTMLInputElement>('input[role="switch"]')[i];
  const apres = async () => {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };

  async function ouvrir(classement = true, emails = false) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(''),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Profil);
    await fixture.whenStable();
    http
      .expectOne('/api/compte/moi')
      .flush({ id: '1', email: 'a@b.fr', emailVerifie: true, pseudo: 'marco' });
    http.expectOne('/api/compte/consentements').flush({ classement, emails });
    await apres();
  }
  const cliquer = async (i: number) => {
    interrupteur(i).click();
    await fixture.whenStable();
  };

  it('affiche le pseudo, la section Confidentialité et les deux interrupteurs nommés', async () => {
    await ouvrir(true, false);
    expect(racine().querySelector('h1')?.textContent).toContain('marco');
    expect(interrupteur(0).checked).toBe(true);
    expect(interrupteur(1).checked).toBe(false);
    for (const [i, nom] of [
      [0, 'Apparaître dans les classements'],
      [1, 'E-mails des nouveaux défis'],
    ] as const) {
      expect(interrupteur(i).getAttribute('aria-checked')).toBe(String(i === 0));
      const lib = racine().querySelector(`#${interrupteur(i).getAttribute('aria-labelledby')}`);
      expect(lib?.textContent).toContain(nom);
    }
  });

  it('bascule e-mails : enregistrée tout de suite avec les deux valeurs, sans bouton Enregistrer', async () => {
    await ouvrir(true, false);
    await cliquer(1);
    expect(interrupteur(1).checked).toBe(true);
    const req = http.expectOne('/api/compte/consentements');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ classement: true, emails: true });
    req.flush({ classement: true, emails: true });
    await apres();
    expect(interrupteur(1).getAttribute('aria-checked')).toBe('true');
    expect(racine().textContent).not.toMatch(/enregistrer/i);
  });

  it('échec : retour arrière et message d’erreur annoncé', async () => {
    await ouvrir(true, false);
    await cliquer(1);
    http.expectOne('/api/compte/consentements').flush('', { status: 500, statusText: '' });
    await apres();
    expect(interrupteur(1).checked).toBe(false);
    expect(racine().querySelector('zn-message')?.getAttribute('role')).toBe('alert');
  });

  it('pas de double envoi pendant un enregistrement', async () => {
    await ouvrir(true, false);
    await cliquer(1);
    await cliquer(0);
    expect(interrupteur(0).checked).toBe(true);
    const reqs = http.match('/api/compte/consentements');
    expect(reqs).toHaveLength(1);
    reqs[0].flush({ classement: true, emails: true });
  });

  it('Mes données, liens légaux et déconnexion', async () => {
    await ouvrir();
    const a = (h: string) => racine().querySelector(`a[href="${h}"]`);
    expect(a('/profil/export')?.textContent).toContain('Exporter mes données');
    expect(a('/profil/suppression')?.textContent).toContain('Supprimer mon compte');
    const nav = racine().querySelector('nav[aria-label="Informations légales"]')!;
    for (const h of ['/cgu', '/confidentialite', '/mentions-legales'])
      expect(nav.querySelector(`a[href="${h}"]`)).toBeTruthy();

    const session = TestBed.inject(Session);
    const deco = vi.spyOn(session, 'deconnecter').mockResolvedValue();
    const recharger = vi
      .spyOn(fixture.componentInstance as unknown as { recharger(u: string): void }, 'recharger')
      .mockImplementation(() => undefined);
    [...racine().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Se déconnecter'))!
      .click();
    await apres();
    expect(deco).toHaveBeenCalled();
    expect(recharger).toHaveBeenCalledWith('/connexion');
  });
});
