import { TestBed } from '@angular/core/testing';
import { ZnIcone } from './icone';

describe('ZnIcone', () => {
  it('référence le sprite et reste décorative (le libellé porte le sens)', async () => {
    const fixture = TestBed.createComponent(ZnIcone);
    fixture.componentRef.setInput('nom', 'succes');
    await fixture.whenStable();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.querySelector('use')?.getAttribute('href')).toBe('/icons.svg#succes');
  });
});
