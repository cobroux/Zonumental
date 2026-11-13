import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Collection } from './collection';

const pris = '2026-01-01T00:00:00Z';
const mon = (numero: number, captureeLe: string | null, type = 'TOUR') => ({
  numero,
  nom: `Monument secret ${numero}`,
  captureeLe,
  type,
  rarete: 'COMMUN',
  ville: { codeInsee: '75056', nom: 'Paris' },
});
const coll = (code: string, nom: string, mons: { numero: number; capture: boolean }[]) => ({
  code,
  nom,
  total: mons.length,
  captures: mons.filter((x) => x.capture).length,
  complete: mons.every((x) => x.capture),
  monuments: mons.map((x) => ({ ...x, nom: `Monument secret ${x.numero}` })),
});
/** `n` monuments dont les `captures` premiers sont tamponnés. */
const paris = (n: number, captures: number) => {
  const liste = Array.from({ length: n }, (_, i) => ({ numero: i + 1, capture: i < captures }));
  return {
    catalogue: liste.map((x) =>
      mon(x.numero, x.capture ? pris : null, x.numero === 2 ? 'PONT' : 'TOUR'),
    ),
    collections: [coll('PARIS', 'Tout Paris', liste)],
  };
};

async function rendre(code: string, donnees: { catalogue: object[]; collections: object[] }) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(Collection);
  f.componentRef.setInput('code', code);
  document.body.append(f.nativeElement);
  f.detectChanges();
  http.expectOne('/api/progression/collections').flush(donnees.collections);
  http.expectOne('/api/catalogue/monuments').flush(donnees.catalogue);
  await new Promise((r) => setTimeout(r));
  TestBed.tick();
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement };
}
const cases = (el: HTMLElement) => [...el.querySelectorAll<HTMLAnchorElement>('ul.grille a')];
const bouton = (el: HTMLElement, nom: string) =>
  el.querySelector(`nav.pages button[aria-label="${nom}"]`) as HTMLButtonElement;

describe('Collection (détail)', () => {
  it('28 monuments, 8 tampons : planche dense paginée à 12, étiquette PAGE 1 / 3', async () => {
    const { f, el } = await rendre('PARIS', paris(28, 8));
    expect(el.querySelector('h1')?.textContent).toBe('Tout Paris');
    expect(el.querySelector('.bilan')?.textContent).toBe('8 monuments sur 28 · 29 %');
    expect(cases(el).length).toBe(12);
    expect(el.querySelector('.etiquette')?.textContent).toBe('Page 1 / 3 — Tout Paris');
    expect(el.querySelectorAll('.puces span').length).toBe(3);
    bouton(el, 'Page suivante').click();
    bouton(el, 'Page suivante').click();
    f.detectChanges();
    expect(cases(el).length).toBe(4);
    expect(bouton(el, 'Page suivante').getAttribute('aria-disabled')).toBe('true');
    expect(el.querySelector('.etiquette')?.textContent).toBe('Page 3 / 3 — Tout Paris');
  });

  it('moins de 6 tampons au total : planche aérée, 6 par page', async () => {
    const { el } = await rendre('PARIS', paris(28, 2));
    expect(cases(el).length).toBe(6);
    expect(el.querySelector('ul.grille')?.classList.contains('aere')).toBe(true);
  });

  it('case capturée : lien fiche, tampon nommé ; non capturée : silhouette, jamais le nom (RG-042)', async () => {
    const { el } = await rendre('PARIS', paris(5, 1));
    const [prise, vide] = cases(el);
    expect(prise.getAttribute('href')).toBe('/monument/1');
    expect(prise.querySelector('zn-tampon')).not.toBeNull();
    expect(vide.getAttribute('href')).toBe('/monument/2');
    expect(vide.getAttribute('aria-label')).toBe('N°002, à découvrir');
    expect(vide.querySelector('svg.silhouette path')?.getAttribute('d')).toContain('M2 12h44');
    expect(vide.textContent).toContain('N°002');
    expect(el.querySelector('ul.grille')?.textContent).not.toContain('Monument secret 2');
  });

  it('terminée : sceau « Collection complète, 3 sur 3 » en sapin, texte contenu', async () => {
    const { el } = await rendre('PARIS', paris(3, 3));
    const sceau = el.querySelector('zn-tampon.complete-tampon')!;
    expect(sceau.getAttribute('data-encre')).toBe('legendaire');
    expect(sceau.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Collection complète, 3 sur 3',
    );
    expect(sceau.textContent).toContain('3 / 3');
    expect(sceau.textContent).toContain('COMPLÈTE');
  });

  it('en cours : pas de sceau', async () => {
    const { el } = await rendre('PARIS', paris(3, 1));
    expect(el.querySelector('zn-tampon.complete-tampon')).toBeNull();
  });

  it('code inconnu ou collection sans capture : message, lien de retour, focus sur le h1', async () => {
    const { el } = await rendre('LYON', paris(3, 0));
    const h1 = el.querySelector('h1')!;
    expect(h1.textContent).toContain('n’existe pas ou n’est pas encore ouverte');
    expect(el.querySelector('a[href="/carnet/collections"]:not(.retour)')?.textContent).toContain(
      'Retour aux collections',
    );
    expect(document.activeElement).toBe(h1);
  });

  it('erreur : alerte « Collection indisponible » et Réessayer', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(Collection);
    f.componentRef.setInput('code', 'PARIS');
    f.detectChanges();
    http.expectOne('/api/progression/collections').flush(null, { status: 500, statusText: 'x' });
    http.expectOne('/api/catalogue/monuments').flush([]);
    await new Promise((r) => setTimeout(r));
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Collection indisponible');
    (el.querySelector('zn-message button') as HTMLButtonElement).click();
    f.detectChanges();
    http.expectOne('/api/progression/collections');
  });
});
