import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Localisation } from './localisation';

describe('Localisation', () => {
  let fixture: ComponentFixture<Localisation>;
  let navigation: ReturnType<typeof vi.fn>;
  const racine = () => fixture.nativeElement as HTMLElement;
  const autoriser = () => racine().querySelector<HTMLButtonElement>('.pied button')!;
  const passer = () => racine().querySelector<HTMLButtonElement>('.passer')!;
  const apres = async () => {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };

  /** `reponse` simule le système ; absent = API de géolocalisation indisponible. */
  async function ouvrir(
    reponse?: 'accepte' | 'refuse' | 'attente' | 'delai',
    email: string | null = 'marco@exemple.fr',
  ) {
    const getCurrentPosition = vi.fn((ok: PositionCallback, ko: PositionErrorCallback) => {
      if (reponse === 'attente') return;
      if (reponse === 'accepte')
        ok({ coords: { latitude: 48.85, longitude: 2.29 } } as GeolocationPosition);
      else ko({ code: reponse === 'delai' ? 3 : 1 } as GeolocationPositionError);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: reponse ? { getCurrentPosition } : undefined,
      configurable: true,
    });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;
    history.replaceState(email ? { email } : null, '');
    fixture = TestBed.createComponent(Localisation);
    await fixture.whenStable();
    return getCurrentPosition;
  }

  afterEach(() => {
    history.replaceState(null, '');
    Reflect.deleteProperty(navigator, 'geolocation');
  });

  it('explique les 3 engagements avant toute demande système', async () => {
    const demande = await ouvrir('accepte');
    expect(racine().querySelector('h1')?.textContent).toContain('sur place');
    expect(racine().textContent).toContain('Étape 2 / 2');
    expect(racine().querySelectorAll('.engagements li').length).toBe(3);
    expect(racine().querySelector('svg[role="img"] title')?.textContent).toContain('150');
    expect(demande).not.toHaveBeenCalled();
  });

  it('Autoriser : déclenche la demande système puis passe à la vérification, sans garder la position', async () => {
    const demande = await ouvrir('accepte');
    autoriser().click();
    await apres();
    expect(demande).toHaveBeenCalledTimes(1);
    expect(navigation).toHaveBeenCalledWith(['/inscription/verifie-ton-email'], {
      state: { email: 'marco@exemple.fr' },
    });
    expect(JSON.stringify(navigation.mock.calls)).not.toContain('48.85');
    expect(localStorage.length).toBe(0);
  });

  it('refus système : pas de blocage, message annoncé avec la marche à suivre', async () => {
    await ouvrir('refuse');
    autoriser().click();
    await apres();
    const msg = racine().querySelector('zn-message')!;
    expect(msg.getAttribute('role')).toBe('status');
    expect(msg.textContent).toContain('réglages');
    expect(navigation).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(msg);
    expect(autoriser().textContent).toContain('Continuer');
    autoriser().click();
    await apres();
    expect(navigation).toHaveBeenCalledWith(['/inscription/verifie-ton-email'], {
      state: { email: 'marco@exemple.fr' },
    });
  });

  it('Passer : aucune demande système, même message', async () => {
    const demande = await ouvrir('accepte');
    passer().click();
    await apres();
    expect(demande).not.toHaveBeenCalled();
    expect(racine().querySelector('zn-message')?.textContent).toContain('réglages');
  });

  it('géolocalisation indisponible : message, pas d’erreur', async () => {
    await ouvrir();
    autoriser().click();
    await apres();
    expect(racine().querySelector('zn-message')?.textContent).toContain('pas disponible');
  });

  it('double clic : une seule demande système', async () => {
    const demande = await ouvrir('attente');
    autoriser().click();
    autoriser().click();
    await apres();
    expect(demande).toHaveBeenCalledTimes(1);
  });

  it('pendant l’attente : aria-busy et libellé dédié, bouton non désactivé', async () => {
    await ouvrir('attente');
    autoriser().click();
    await apres();
    expect(autoriser().getAttribute('aria-busy')).toBe('true');
    expect(autoriser().textContent).toContain('En attente de ta réponse');
    expect(autoriser().disabled).toBe(false);
  });

  it('invite ignorée (délai dépassé) : message neutre, distinct du refus', async () => {
    await ouvrir('delai');
    autoriser().click();
    await apres();
    const texte = racine().querySelector('zn-message')?.textContent;
    expect(texte).toContain('Pas de réponse');
    expect(texte).not.toContain('Pas de souci');
    expect(autoriser().getAttribute('aria-busy')).toBeNull();
    expect(autoriser().textContent).toContain('Continuer');
  });

  it('sans adresse (rechargement) : la suite reste possible', async () => {
    await ouvrir('refuse', null);
    passer().click();
    await apres();
    autoriser().click();
    await apres();
    expect(navigation).toHaveBeenCalledWith(['/inscription/verifie-ton-email'], {
      state: { email: null },
    });
  });
});
