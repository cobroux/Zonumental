import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DesignSystem } from './design-system';

async function rendre() {
  const fixture = TestBed.createComponent(DesignSystem);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('Page /design-system', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('a un seul h1 et des sections titrées pour la navigation', async () => {
    const { el } = await rendre();
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    const sections = el.querySelectorAll('section[aria-labelledby]');
    expect(sections.length).toBeGreaterThanOrEqual(6);
    sections.forEach((s) => {
      const titre = el.querySelector(`#${s.getAttribute('aria-labelledby')}`);
      expect(titre?.tagName).toBe('H2');
    });
  });

  it('montre le bouton dans tous ses états : repos, désactivé, occupé, 3 variantes', async () => {
    const { el } = await rendre();
    const boutons = el.querySelectorAll('[znBouton]');
    const variantes = new Set([...boutons].map((b) => b.getAttribute('znBouton') || 'principal'));
    expect(variantes).toEqual(new Set(['principal', 'secondaire', 'danger']));
    expect(el.querySelector('[znBouton][disabled]')).not.toBeNull();
    const occupe = el.querySelector('[znBouton][aria-busy="true"]');
    expect(occupe?.textContent?.trim()).toBeTruthy(); // libellé conservé
    expect(el.querySelector('a[znBouton]')).not.toBeNull();
  });

  it('montre le champ au repos, en erreur, mot de passe et désactivé', async () => {
    const { el } = await rendre();
    expect(el.querySelectorAll('input[znSaisie]').length).toBeGreaterThanOrEqual(4);
    expect(el.querySelector('input[znSaisie][aria-invalid="true"]')).not.toBeNull();
    expect(el.querySelector('input[znSaisie]:disabled')).not.toBeNull();
    expect(el.querySelector('zn-champ button')).not.toBeNull();
  });

  it('chaque contrôle a un nom accessible visible', async () => {
    const { el } = await rendre();
    el.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      const label = el.querySelector(`label[for="${input.id}"]`) ?? input.closest('label');
      expect(label?.textContent?.trim(), input.outerHTML).toBeTruthy();
    });
  });

  it('interrupteur : role=switch ; case à cocher native', async () => {
    const { el } = await rendre();
    const interrupteur = el.querySelector('input[znInterrupteur]');
    expect(interrupteur?.getAttribute('role')).toBe('switch');
    expect(interrupteur?.getAttribute('type')).toBe('checkbox');
    expect(el.querySelector('input[znCase]')?.getAttribute('type')).toBe('checkbox');
  });

  it('les messages d erreur, de succès et d information ont icône ET texte', async () => {
    const { el } = await rendre();
    const messages = el.querySelectorAll('zn-message');
    expect(new Set([...messages].map((m) => m.getAttribute('data-type')))).toEqual(
      new Set(['erreur', 'succes', 'info']),
    );
    messages.forEach((m) => {
      expect(m.querySelector('svg')).not.toBeNull();
      expect(m.textContent?.trim().length).toBeGreaterThan(10);
    });
  });

  it('les navigations sont nommées ; l exemple montre le lien courant', async () => {
    const { el } = await rendre();
    const navs = el.querySelectorAll('nav');
    expect(navs.length).toBeGreaterThanOrEqual(2);
    navs.forEach((nav) => expect(nav.getAttribute('aria-label')).toBeTruthy());
    expect(el.querySelector('nav a[aria-current="page"]')).not.toBeNull();
  });

  it('montre le bouton principal et le lien secondaire de l écran Bienvenue', async () => {
    const { el } = await rendre();
    const exemple = el.querySelector('.bienvenue') as HTMLElement;
    expect(exemple.querySelector('a[znBouton=""]')?.textContent).toContain('Commencer');
    expect(exemple.querySelector('a[znBouton="secondaire"]')?.textContent).toContain(
      "J'ai déjà un carnet",
    );
  });

  it('montre le groupe « TES CHOIX » avec des cases natives et leur statut écrit', async () => {
    const { el } = await rendre();
    const groupe = [...el.querySelectorAll('fieldset')].find((f) =>
      f.querySelector('legend')?.textContent?.includes('Tes choix'),
    );
    expect(groupe?.querySelectorAll('input[znCase]')).toHaveLength(3);
    expect(groupe?.textContent).toContain('Obligatoire');
    expect(groupe?.textContent).toContain('Facultatif');
  });

  it('les pastilles de rareté écrivent toujours le mot', async () => {
    const { el } = await rendre();
    const mots = [...el.querySelectorAll('[znRarete]')].map((p) => p.textContent?.trim());
    expect(mots).toEqual(['Commun', 'Rare', 'Légendaire']);
  });

  it('l en-tête garde la ligne ZNM sans rosette', async () => {
    const { el } = await rendre();
    expect(el.querySelector('.entete__mrz')?.textContent).toContain('ZNM');
  });

  it('les couleurs de la page viennent des tokens, pas de styles en ligne', async () => {
    const { el } = await rendre();
    expect(el.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
