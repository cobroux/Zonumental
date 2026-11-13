import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Forme, ZnTampon, tailleCentre } from './tampon';

@Component({
  imports: [ZnTampon],
  template: `
    <zn-tampon [forme]="forme" encre="rare" [contenu]="contenu" etiquette="Tour A. N°001, rare" />
    <zn-tampon [forme]="forme" [contenu]="contenu" [decoratif]="true" />
  `,
})
class Hote {
  forme: Forme = 'cercle';
  contenu = { haut: 'PARIS · TOUR A. · N°001 ·', centre: 'RARE', bas: '12·10·26' };
}

describe('ZnTampon', () => {
  async function rendre(forme: Forme) {
    const fixture = TestBed.createComponent(Hote);
    fixture.componentInstance.forme = forme;
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it.each(['cercle', 'rectangle', 'octogone', 'ovale'] as const)(
    '%s : un SVG à encre, texte dedans',
    async (forme) => {
      const svg = (await rendre(forme)).querySelector('svg')!;
      expect(svg.classList.contains('zn-encre')).toBe(true);
      expect(svg.querySelector('text')).not.toBeNull();
      expect(svg.querySelectorAll('circle, rect, polygon, ellipse').length).toBeGreaterThanOrEqual(
        2,
      );
    },
  );

  it('porte un nom accessible qui contient le texte visible (2.5.3)', async () => {
    const svg = (await rendre('cercle')).querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('N°001');
  });

  it('décoratif : masqué aux lecteurs d écran', async () => {
    const svg = (await rendre('cercle')).querySelectorAll('svg')[1];
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.hasAttribute('role')).toBe(false);
  });

  it('id de textPath unique par instance et référencé', async () => {
    const el = await rendre('cercle');
    const ids = [...el.querySelectorAll('path[id]')].map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
    el.querySelectorAll('textPath').forEach((t) =>
      expect(ids).toContain(t.getAttribute('href')!.slice(1)),
    );
  });

  it('aucune couleur en dur : tout en currentColor', async () => {
    const html = (await rendre('rectangle')).innerHTML;
    expect(html).toContain('currentColor');
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
  });

  it('le corps du texte central reste entre 9 et le maximum de la forme', () => {
    expect(tailleCentre('rectangle', 'PARIS')).toBe(27);
    expect(tailleCentre('cercle', 'LÉGENDAIRE')).toBeLessThan(15);
    expect(tailleCentre('ovale', 'A'.repeat(80))).toBe(9);
  });
});
