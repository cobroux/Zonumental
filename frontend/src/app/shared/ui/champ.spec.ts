import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ZnChamp, ZnSaisie } from './champ';

@Component({
  imports: [ZnChamp, ZnSaisie],
  template: `
    <zn-champ label="Pseudo" [aide]="aide" [erreur]="erreur" [motDePasse]="motDePasse">
      <input znSaisie name="pseudo" />
    </zn-champ>
  `,
})
class Hote {
  aide: string | null = 'Entre 3 et 20 caractères';
  erreur: string | null = null;
  motDePasse = false;
}

async function rendre(config: Partial<Hote> = {}) {
  const fixture = TestBed.createComponent(Hote);
  Object.assign(fixture.componentInstance, config);
  await fixture.whenStable();
  const racine = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    racine,
    input: racine.querySelector('input') as HTMLInputElement,
    label: racine.querySelector('label') as HTMLLabelElement,
  };
}

describe('ZnChamp', () => {
  it('lie le libellé visible au champ (for / id)', async () => {
    const { input, label } = await rendre();
    expect(input.id).toBeTruthy();
    expect(label.htmlFor).toBe(input.id);
    expect(label.textContent).toContain('Pseudo');
  });

  it("relie l'aide au champ par aria-describedby", async () => {
    const { input, racine } = await rendre();
    const aide = racine.querySelector('.zn-champ__aide') as HTMLElement;
    expect(input.getAttribute('aria-describedby')).toBe(aide.id);
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it("en erreur : aria-invalid, aria-describedby vers l'erreur, icône ET texte", async () => {
    const { input, racine } = await rendre({ erreur: 'Ce pseudo est déjà pris' });
    const erreur = racine.querySelector('.zn-champ__erreur') as HTMLElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(erreur.id);
    expect(erreur.querySelector('zn-icone svg')).not.toBeNull();
    expect(erreur.textContent).toContain('Erreur');
    expect(erreur.textContent).toContain('Ce pseudo est déjà pris');
  });

  it('deux champs ont des identifiants distincts', async () => {
    const a = await rendre();
    const b = await rendre();
    expect(a.input.id).not.toBe(b.input.id);
  });

  it('variante mot de passe : bouton Afficher / Masquer', async () => {
    const { input, racine, fixture } = await rendre({ motDePasse: true });
    const bouton = racine.querySelector('button') as HTMLButtonElement;
    expect(input.type).toBe('password');
    expect(bouton.textContent?.trim()).toBe('Afficher');
    expect(bouton.getAttribute('aria-controls')).toBe(input.id);
    bouton.click();
    await fixture.whenStable();
    expect(input.type).toBe('text');
    expect(bouton.textContent?.trim()).toBe('Masquer');
  });

  it("sans variante mot de passe, pas de bouton et le type d'origine est conservé", async () => {
    const { input, racine } = await rendre();
    expect(racine.querySelector('button')).toBeNull();
    expect(input.type).toBe('text');
  });
});
