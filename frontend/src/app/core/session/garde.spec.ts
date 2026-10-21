import { TestBed } from '@angular/core/testing';
import {
  Router,
  UrlTree,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';
import { gardeConnecte } from './garde';
import { Session } from './session';

describe('gardeConnecte', () => {
  const lancer = (url: string) =>
    TestBed.runInInjectionContext(() =>
      gardeConnecte({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as Promise<boolean | UrlTree>;
  const session = (connecte: boolean, renouvelle: boolean) => ({
    provide: Session,
    useValue: { connecte: () => connecte, renouveler: vi.fn().mockResolvedValue(renouvelle) },
  });

  it('connecté : passe sans renouveler', async () => {
    TestBed.configureTestingModule({ providers: [session(true, false)] });
    expect(await lancer('/profil')).toBe(true);
    expect(TestBed.inject(Session).renouveler).not.toHaveBeenCalled();
  });

  it('rechargement de page : renouvelle la session puis passe', async () => {
    TestBed.configureTestingModule({ providers: [session(false, true)] });
    expect(await lancer('/profil')).toBe(true);
  });

  it('non connecté : redirige vers /connexion avec la page demandée', async () => {
    TestBed.configureTestingModule({ providers: [session(false, false)] });
    const r = (await lancer('/profil?x=1')) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(r)).toBe('/connexion?retour=%2Fprofil%3Fx%3D1');
  });
});
