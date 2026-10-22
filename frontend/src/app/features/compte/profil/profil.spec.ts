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
    expect(a('/profil/export')).toBeNull();
    expect(racine().textContent).toContain('Compte et réglages, dans un fichier .zip');
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
    expect(recharger).toHaveBeenCalledWith('/bienvenue');
  });

  describe('export', () => {
    const bouton = () => racine().querySelector<HTMLButtonElement>('button.lien')!;
    let clic: ReturnType<typeof vi.spyOn>;
    let noms: string[];
    beforeEach(() => {
      noms = [];
      URL.createObjectURL = vi.fn(() => 'blob:x');
      URL.revokeObjectURL = vi.fn();
      clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        noms.push(this.download);
      });
    });
    afterEach(() => clic.mockRestore());

    it("télécharge le zip sous le nom de Content-Disposition, puis révoque l'URL", async () => {
      await ouvrir();
      bouton().click();
      await fixture.whenStable();
      expect(bouton().getAttribute('aria-busy')).toBe('true');
      const req = http.expectOne('/api/compte/export');
      expect(req.request.method).toBe('GET');
      req.flush(new Blob(['zip']), {
        headers: {
          'Content-Disposition': 'attachment; filename="zonumental-export-2026-10-21.zip"',
        },
      });
      await apres();
      expect(noms).toEqual(['zonumental-export-2026-10-21.zip']);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
      expect(bouton().getAttribute('aria-busy')).toBeNull();
    });

    it("nom par défaut daté du jour sans l'en-tête", async () => {
      await ouvrir();
      bouton().click();
      await fixture.whenStable();
      http.expectOne('/api/compte/export').flush(new Blob(['zip']));
      await apres();
      expect(noms).toEqual([`zonumental-export-${new Date().toISOString().slice(0, 10)}.zip`]);
    });

    it('pas de double envoi pendant le téléchargement', async () => {
      await ouvrir();
      bouton().click();
      bouton().click();
      await fixture.whenStable();
      const reqs = http.match('/api/compte/export');
      expect(reqs).toHaveLength(1);
      reqs[0].flush(new Blob(['zip']));
    });

    it('échec : message annoncé, aucun téléchargement', async () => {
      await ouvrir();
      bouton().click();
      await fixture.whenStable();
      http.expectOne('/api/compte/export').flush(new Blob([]), { status: 500, statusText: '' });
      await apres();
      const m = racine().querySelector('zn-message')!;
      expect(m.getAttribute('role')).toBe('alert');
      expect(document.activeElement).toBe(m);
      expect(noms).toEqual([]);
    });
  });
});
