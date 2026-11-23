import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ClassementActif } from './classement-actif';

const URL = '/api/classement?portee=VILLE&ville=75056';
const l = (rang: number | null, pseudo: string, over: object = {}) => ({
  rang,
  pseudo,
  score: 9,
  tendance: 0,
  moi: false,
  ...over,
});
const classement = (over: object = {}) => ({
  portee: 'VILLE',
  ville: { codeInsee: '75056', nom: 'Paris' },
  semaineDebutLe: '2026-11-15T23:00:00Z',
  ouvert: true,
  podium: [
    l(1, 'lea_voyage', { score: 18 }),
    l(2, 'tom_pierres', { score: 16, tendance: 1 }),
    l(3, 'camille_b', { score: 15, tendance: -1 }),
  ],
  autourDeMoi: [
    l(11, 'hugo_l', { tendance: 2 }),
    l(12, 'enzo', { moi: true, tendance: 4 }),
    l(13, 'ines_p', { score: 8, tendance: -3 }),
  ],
  ...over,
});

async function rendre(corps?: object | { status: number }) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(ClassementActif);
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
const lignes = (el: HTMLElement) => [...el.querySelectorAll('.lignes li')];
const onglet = (el: HTMLElement, nom: string) =>
  [...el.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
    (b) => b.textContent?.trim() === nom,
  )!;

describe('classement actif', () => {
  it('chargement : annonce vocale', async () => {
    const { el } = await rendre();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Chargement');
  });

  it('onglets Amis (inactif), Ville (Paris) sélectionné, France', async () => {
    const { el } = await rendre(classement());
    expect(el.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'Portée du classement',
    );
    expect(onglet(el, 'Amis').disabled).toBe(true);
    expect(onglet(el, 'Paris').getAttribute('aria-selected')).toBe('true');
    expect(onglet(el, 'France').getAttribute('aria-selected')).toBe('false');
  });

  it('podium, « ··· » (premier rang autour > 4), puis lignes autour de moi', async () => {
    const { el } = await rendre(classement());
    const items = lignes(el);
    expect(items).toHaveLength(7);
    expect(items[0].textContent).toContain('@lea_voyage');
    expect(items[0].textContent).toContain('18 tampons');
    expect(items[3].textContent).toContain('···');
    expect(items[3].getAttribute('aria-hidden')).toBe('true');
    expect(items[4].textContent).toContain('@hugo_l');
  });

  it('pas de « ··· » si autourDeMoi[0].rang <= 4', async () => {
    const { el } = await rendre(
      classement({ autourDeMoi: [l(4, 'a'), l(5, 'enzo', { moi: true })] }),
    );
    expect(el.textContent).not.toContain('···');
  });

  it('ligne « Toi » repérée, sans pseudo ni niveau', async () => {
    const { el } = await rendre(classement());
    const toi = el.querySelector('.lignes li.toi')!;
    expect(toi.textContent).toContain('Toi');
    expect(toi.textContent).not.toContain('enzo');
    expect(el.textContent).not.toMatch(/Niveau|quartier/i);
  });

  it('« Toi » dans le podium : repérée', async () => {
    const { el } = await rendre(
      classement({
        podium: [l(1, 'enzo', { moi: true }), l(2, 'a'), l(3, 'b')],
        autourDeMoi: [],
      }),
    );
    expect(el.querySelectorAll('li.toi')).toHaveLength(1);
    expect(lignes(el)[0].classList).toContain('toi');
  });

  it('tendance : = , +n, −n, null rien', async () => {
    const { el } = await rendre(
      classement({
        podium: [
          l(1, 'a', { tendance: 0 }),
          l(2, 'b', { tendance: 2 }),
          l(3, 'c', { tendance: -1 }),
        ],
        autourDeMoi: [l(4, 'd', { tendance: null }), l(5, 'enzo', { moi: true })],
      }),
    );
    const t = lignes(el).map((li) => li.querySelector('.tendance')?.textContent?.trim() ?? '');
    expect(t.slice(0, 4)).toEqual(['Tendance : =', 'Tendance : +2', 'Tendance : −1', '']);
  });

  it('sans consentement : « Non classé » et lien vers la confidentialité', async () => {
    const { el } = await rendre(
      classement({ autourDeMoi: [l(null, 'enzo', { moi: true, tendance: null, score: 2 })] }),
    );
    const toi = el.querySelector('li.toi')!;
    expect(toi.textContent).toContain('Non classé');
    expect(toi.textContent).toContain('2 tampons');
    expect(el.querySelector('.gap, .lignes li[aria-hidden="true"]')).toBeNull();
    expect(el.querySelector('a[href="/confidentialite"]')?.textContent).toContain(
      'Confidentialité',
    );
    expect(el.textContent).toContain(
      'Ton pseudo n’apparaît dans un classement que si tu l’acceptes.',
    );
  });

  it('avec consentement : mention « jamais sous ton nom »', async () => {
    const { el } = await rendre(classement());
    expect(el.textContent).toContain('Tu apparais sous ton pseudo, jamais sous ton nom.');
  });

  it('France : « Bientôt », sans appel réseau', async () => {
    const { el, f, http } = await rendre(classement());
    onglet(el, 'France').click();
    f.detectChanges();
    expect(onglet(el, 'France').getAttribute('aria-selected')).toBe('true');
    expect(el.querySelector('zn-bientot-etat')?.textContent).toContain('France : bientôt');
    http.verify();
  });

  it('flèche droite : onglet France focalisé', async () => {
    const { el, f } = await rendre(classement());
    onglet(el, 'Paris').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    f.detectChanges();
    expect(onglet(el, 'France').getAttribute('aria-selected')).toBe('true');
  });

  it('erreur : message et Réessayer', async () => {
    const { el, http, f } = await rendre({ status: 500 });
    expect(el.querySelector('zn-message')?.textContent).toContain('Classement indisponible');
    el.querySelector<HTMLButtonElement>('zn-message button')!.click();
    TestBed.tick();
    http.expectOne(URL).flush(classement());
    await f.whenStable();
    f.detectChanges();
    expect(lignes(el)).toHaveLength(7);
  });

  it('aucun UUID dans le rendu', async () => {
    const { el } = await rendre(classement());
    expect(el.innerHTML).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});
