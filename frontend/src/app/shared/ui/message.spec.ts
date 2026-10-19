import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ZnMessage } from './message';

@Component({
  imports: [ZnMessage],
  template: `<zn-message [type]="type">Pseudo déjà pris</zn-message>`,
})
class Hote {
  type: 'erreur' | 'succes' | 'info' = 'erreur';
}

async function rendre(type: 'erreur' | 'succes' | 'info') {
  const fixture = TestBed.createComponent(Hote);
  fixture.componentInstance.type = type;
  await fixture.whenStable();
  return fixture.nativeElement.querySelector('zn-message') as HTMLElement;
}

describe('ZnMessage', () => {
  it.each(['erreur', 'succes', 'info'] as const)(
    'un message %s porte une icône ET un texte (jamais la couleur seule)',
    async (type) => {
      const el = await rendre(type);
      expect(el.querySelector('zn-icone svg')).not.toBeNull();
      expect(el.querySelector('.zn-message__etiquette')?.textContent?.trim()).toBeTruthy();
      expect(el.textContent).toContain('Pseudo déjà pris');
    },
  );

  it("l'erreur est annoncée tout de suite (alert), le reste poliment (status)", async () => {
    expect((await rendre('erreur')).getAttribute('role')).toBe('alert');
    expect((await rendre('succes')).getAttribute('role')).toBe('status');
    expect((await rendre('info')).getAttribute('role')).toBe('status');
  });
});
