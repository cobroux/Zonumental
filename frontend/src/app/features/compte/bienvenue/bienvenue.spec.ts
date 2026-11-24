import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Bienvenue } from './bienvenue';

describe('Bienvenue', () => {
  it('un seul job : titre, accroche, tampon, Commencer et J’ai déjà un carnet', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(Bienvenue);
    await f.whenStable();
    const r = f.nativeElement as HTMLElement;
    expect(r.querySelector('h1')?.textContent).toBe('Zonumental');
    expect(r.textContent).toContain(
      'Va voir les monuments de France. Chaque visite imprime un tampon dans ton carnet.',
    );
    const tampon = r.querySelector('[role="img"]');
    expect(tampon?.getAttribute('aria-label')).toContain('118 monuments à tamponner');
    expect(tampon?.textContent).toContain('118 MONUMENTS À TAMPONNER');
    expect(r.querySelector('zn-tampon svg')?.classList).toContain('zn-encre');
    expect(r.querySelector('a[href="/inscription"]')?.textContent).toContain('Commencer');
    const lien = r.querySelector('a[href="/connexion"]');
    expect(lien?.textContent).toContain('J’ai déjà un carnet');
    expect(lien?.hasAttribute('znBouton')).toBe(false);
    expect(r.querySelector('.visuel')?.getAttribute('aria-hidden')).toBe('true');
    expect(r.querySelector('.visuel img.photo')?.getAttribute('src')).toBe(
      'accueil/tour-eiffel.jpg',
    );
    expect(r.textContent).toContain('Photo : Benh Lieu Song, domaine public');
    expect(r.querySelector('.visuel linearGradient')).not.toBeNull();
    expect(r.querySelector('.grain rect')?.getAttribute('filter')).toBe('url(#zn-papier)');
    expect(r.querySelectorAll('img')).toHaveLength(1); // la photo du domaine public, décorative
  });
});
