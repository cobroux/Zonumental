import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ZnBientotEtat } from './bientot-etat';

@Component({ imports: [ZnBientotEtat], template: `<zn-bientot-etat sujet="Classement" />` })
class Hote {}

describe('zn-bientot-etat', () => {
  it('tampon décoratif + phrase visible qui nomme le sujet', () => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('p')?.textContent?.trim()).toBe(
      'Classement : bientôt disponible. On y travaille.',
    );
  });
});
