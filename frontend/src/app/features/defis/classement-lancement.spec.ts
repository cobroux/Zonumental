import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClassementLancement } from './classement-lancement';

const URL = '/api/classement/villes/75056/lancement';
const lancement = (over: object = {}) => ({
  ville: { codeInsee: '75056', nom: 'Paris' },
  seuil: 50,
  explorateurs: 23,
  ouvert: false,
  consentementClassement: true,
  moi: { tampons: 3 },
  ...over,
});

async function rendre(corps?: object | { status: number }) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(ClassementLancement);
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  if (corps) {
    const req = http.expectOne(URL);
    if ('status' in corps) req.flush(null, { status: corps.status, statusText: 'x' });
    else req.flush(corps);
    await f.whenStable();
    f.detectChanges();
  }
  return { http, f, el };
}

const inviter = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button.inviter')!;

describe('classement : état de lancement', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('chargement : annonce vocale, pas de contenu', async () => {
    const { el } = await rendre();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Chargement');
  });

  it('titre ville, compteur n / 50, barre de progression avec rôle et valeurs', async () => {
    const { el } = await rendre(lancement());
    expect(el.querySelector('h3')?.textContent).toBe(
      "Le classement de Paris s'ouvre à 50 explorateurs",
    );
    expect(el.textContent).toContain('23 / 50');
    const barre = el.querySelector('[role="progressbar"]')!;
    expect(barre.getAttribute('aria-valuenow')).toBe('23');
    expect(barre.getAttribute('aria-valuemin')).toBe('0');
    expect(barre.getAttribute('aria-valuemax')).toBe('50');
    expect(barre.getAttribute('aria-label')).toBe('Explorateurs de Paris');
    expect(barre.getAttribute('aria-valuetext')).toBe('23 sur 50');
    expect(el.querySelector('zn-bientot-etat')).toBeNull();
  });

  it('ligne « Toi · N tampons », sans niveau ni quartier (Q-35), place libre statique', async () => {
    const { el } = await rendre(lancement());
    const toi = el.querySelector('.toi')!;
    expect(toi.textContent).toContain('Toi');
    expect(toi.textContent).toContain('3 tampons');
    expect(el.textContent).not.toMatch(/Niveau|quartier/i);
    expect(el.textContent).toContain('Une place libre pour un ami');
  });

  it.each([
    [0, '0 tampon'],
    [1, '1 tampon'],
  ])('singulier : %i -> %s', async (n, texte) => {
    const { el } = await rendre(lancement({ moi: { tampons: n } }));
    expect(el.querySelector('.toi')?.textContent).toContain(texte);
    expect(el.querySelector('.toi')?.textContent).not.toContain('tampons');
  });

  it('sans consentement : « Toi » non classé et mention de confidentialité', async () => {
    const { el } = await rendre(lancement({ consentementClassement: false }));
    expect(el.querySelector('.toi')?.textContent).toContain('Non classé');
    expect(el.textContent).toContain(
      'Ton pseudo n’apparaît dans un classement que si tu l’acceptes.',
    );
  });

  it('avec consentement : pas de « Non classé »', async () => {
    const { el } = await rendre(lancement());
    expect(el.querySelector('.toi')?.textContent).not.toContain('Non classé');
  });

  it('ouvert = true avant defis-2 : reste « Bientôt » (D6)', async () => {
    const { el } = await rendre(lancement({ ouvert: true, explorateurs: 50 }));
    expect(el.querySelector('zn-bientot-etat')?.textContent).toContain('Classement : bientôt');
    expect(el.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('erreur : message et Réessayer relit l’endpoint', async () => {
    const { el, http, f } = await rendre({ status: 404 });
    expect(el.querySelector('zn-message')?.textContent).toContain('Classement indisponible');
    el.querySelector<HTMLButtonElement>('zn-message button')!.click();
    TestBed.tick();
    http.expectOne(URL).flush(lancement());
    await f.whenStable();
    f.detectChanges();
    expect(el.textContent).toContain('23 / 50');
  });

  it('Inviter : partage natif du lien public de l’appli', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    const { el } = await rendre(lancement());
    expect(inviter(el).textContent?.trim()).toBe('Inviter des amis');
    inviter(el).click();
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: location.origin }));
  });

  it('Inviter : annulation du partage sans message', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'));
    vi.stubGlobal('navigator', { share });
    const { el, f } = await rendre(lancement());
    inviter(el).click();
    await f.whenStable();
    f.detectChanges();
    expect(el.querySelector('.retour-inviter')?.textContent ?? '').toBe('');
  });

  it('Inviter : repli copie du lien, annoncé', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { el, f } = await rendre(lancement());
    inviter(el).click();
    await f.whenStable();
    f.detectChanges();
    expect(writeText).toHaveBeenCalledWith(location.origin);
    expect(el.querySelector('.retour-inviter')?.textContent).toBe('Lien copié');
    expect(el.querySelector('.retour-inviter')?.getAttribute('role')).toBe('status');
  });

  it('Inviter : ni partage ni copie, le lien est affiché', async () => {
    vi.stubGlobal('navigator', {});
    const { el, f } = await rendre(lancement());
    inviter(el).click();
    await f.whenStable();
    f.detectChanges();
    expect(el.querySelector('.retour-inviter')?.textContent).toContain(location.origin);
  });

  it('aucun UUID dans le rendu', async () => {
    const { el } = await rendre(lancement());
    expect(el.innerHTML).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});
