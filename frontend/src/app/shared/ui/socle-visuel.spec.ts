import { TestBed } from '@angular/core/testing';
import { ZnBandeau } from './bandeau';
import { ZnMedaille } from './medaille';
import { ZnPlanche } from './planche';

describe('ZnBandeau', () => {
  async function rendre(entrees: Record<string, unknown>) {
    const fixture = TestBed.createComponent(ZnBandeau);
    for (const [k, v] of Object.entries(entrees)) fixture.componentRef.setInput(k, v);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('titre le carnet avec le pseudo et masque le sceau Z', async () => {
    const el = await rendre({ pseudo: '@lea', tampons: 3 });
    expect(el.querySelector('h1')?.textContent).toContain('Carnet de @lea');
    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toContain('3');
    expect(el.textContent).toContain('tampons');
  });

  it('jour 0 : message d accueil, ni légendaires ni villes', async () => {
    const el = await rendre({ pseudo: '@lea' });
    expect(el.textContent).toContain('ton carnet commence ici');
    expect(el.querySelectorAll('li')).toHaveLength(1);
  });

  it('affiche légendaires et villes, avec lecture vocale complète', async () => {
    const el = await rendre({
      pseudo: '@lea',
      tampons: 41,
      legendaires: 6,
      villes: 4,
      totalVilles: 10,
    });
    expect(el.textContent).toContain('légendaires');
    expect([...el.querySelectorAll('.zn-sr')].at(-1)?.textContent).toContain('sur 10 villes');
  });
});

describe('ZnPlanche', () => {
  it('titre la section et projette les cellules dans une liste', async () => {
    const fixture = TestBed.createComponent(ZnPlanche);
    fixture.componentRef.setInput('titre', 'Paris, page 1 sur 4');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const section = el.querySelector('section')!;
    expect(el.querySelector(`#${section.getAttribute('aria-labelledby')}`)?.textContent).toBe(
      'Paris, page 1 sur 4',
    );
    expect(el.querySelector('.calque > ul')).not.toBeNull();
    expect(el.querySelector('.aere')).toBeNull();
    fixture.componentRef.setInput('aere', true);
    await fixture.whenStable();
    expect(el.querySelector('ul.aere')).not.toBeNull();
  });
});

describe('ZnMedaille', () => {
  async function rendre(entrees: Record<string, unknown>) {
    const fixture = TestBed.createComponent(ZnMedaille);
    for (const [k, v] of Object.entries(entrees)) fixture.componentRef.setInput(k, v);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('obtenue : SVG à encre nommé, classe sceau', async () => {
    const el = await rendre({ nom: 'Explorateur', texte: '10', rotation: -4 });
    const svg = el.querySelector('.sceau')!;
    expect(svg.classList.contains('zn-encre')).toBe(true);
    expect(svg.getAttribute('aria-label')).toBe('Succès obtenu : Explorateur');
  });

  it('en cours : progression dite en toutes lettres', async () => {
    const el = await rendre({ nom: 'Globe-trotteur', etat: 'en-cours', valeur: 2, seuil: 3 });
    expect(el.querySelector('[role=img]')?.getAttribute('aria-label')).toBe(
      'Succès en cours : Globe-trotteur, 2 sur 3',
    );
  });

  it('à découvrir : « ? » sans révéler le critère', async () => {
    const el = await rendre({ nom: 'Noctambule', etat: 'a-decouvrir' });
    expect(el.querySelector('[role=img]')?.getAttribute('aria-label')).toBe(
      'Succès à découvrir : Noctambule',
    );
    expect(el.textContent).toContain('?');
  });
});
