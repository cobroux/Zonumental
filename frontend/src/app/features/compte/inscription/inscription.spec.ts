import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../../core/api/api-configuration';
import { VERSIONS_LEGALES } from '../../../core/legal/versions-legales';
import { Inscription } from './inscription';

describe('Inscription', () => {
  let fixture: ComponentFixture<Inscription>;
  let http: HttpTestingController;
  const racine = () => fixture.nativeElement as HTMLElement;
  const champ = (nom: string) => racine().querySelector<HTMLInputElement>(`[name="${nom}"]`)!;
  const saisir = (nom: string, valeur: string) => {
    champ(nom).value = valeur;
    champ(nom).dispatchEvent(new Event('input'));
  };
  const cocher = (nom: string) => champ(nom).click();
  const soumettre = async () => {
    racine()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  // Le client généré rend une promesse : on laisse passer ses microtâches avant de relire le DOM.
  const apres = async () => {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };

  async function etape2() {
    saisir('pseudo', 'Marco_75');
    saisir('email', 'marco@exemple.fr');
    saisir('motDePasse', 'chat-bleu-47-lune');
    await soumettre();
  }
  function remplirEtape2(cgu = true) {
    saisir('jour', '1');
    saisir('mois', '1');
    saisir('annee', '2000');
    if (cgu) cocher('cgu');
  }
  async function repondre(status: number, corps: object) {
    await fixture.whenStable();
    http
      .expectOne('/api/compte/inscription')
      .flush(JSON.stringify(corps), { status, statusText: '' });
    await apres();
  }
  const probleme = (code: string, status: number, extra = {}) => ({
    code,
    status,
    title: '',
    type: '',
    ...extra,
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('')],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Inscription);
    await fixture.whenStable();
  });

  it('étape 1 : refuse un mot de passe de 11 caractères, erreur liée au champ, focus', async () => {
    saisir('pseudo', 'Marco_75');
    saisir('email', 'marco@exemple.fr');
    saisir('motDePasse', 'Abc123!xyz_');
    await soumettre();

    const mdp = champ('motDePasse');
    expect(racine().textContent).toContain('Étape 1 sur 2');
    expect(mdp.getAttribute('aria-invalid')).toBe('true');
    const erreurId = mdp.getAttribute('aria-describedby')!.split(' ').pop()!;
    expect(racine().querySelector(`#${erreurId}`)?.textContent).toContain('12 caractères');
    expect(document.activeElement).toBe(mdp);
  });

  it('étape 1 valide : passe à l’étape 2 sans appel réseau', async () => {
    await etape2();
    expect(racine().textContent).toContain('Étape 2 sur 2');
    http.verify();
  });

  it('cases facultatives décochées par défaut, CGU avec un lien vers chaque page', async () => {
    await etape2();
    expect(champ('classement').checked).toBe(false);
    expect(champ('emails').checked).toBe(false);
    const liens = [...racine().querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(liens).toEqual(['/cgu', '/confidentialite']);
  });

  it('envoi impossible sans CGU : erreur sur la case, focus, aucune requête', async () => {
    await etape2();
    remplirEtape2(false);
    await soumettre();
    expect(champ('cgu').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(champ('cgu'));
    http.verify();
  });

  it('envoie le contrat avec les versions légales, puis affiche la confirmation', async () => {
    await etape2();
    remplirEtape2();
    cocher('emails');
    await soumettre();

    const req = http.expectOne('/api/compte/inscription');
    expect(req.request.body).toEqual({
      pseudo: 'Marco_75',
      email: 'marco@exemple.fr',
      motDePasse: 'chat-bleu-47-lune',
      dateNaissance: '2000-01-01',
      consentements: {
        cgu: true,
        confidentialite: true,
        versionCgu: VERSIONS_LEGALES.cgu.version,
        versionConfidentialite: VERSIONS_LEGALES.confidentialite.version,
        classement: false,
        emails: true,
      },
    });
    req.flush('', { status: 202, statusText: 'Accepted' });
    await apres();
    expect(racine().querySelector('[role="status"]')?.textContent).toContain('marco@exemple.fr');
    expect(racine().querySelector('form')).toBeNull();
  });

  describe('erreurs du serveur', () => {
    beforeEach(async () => {
      await etape2();
      remplirEtape2();
      await soumettre();
    });

    it('409 pseudo-deja-pris : retour à l’étape 1, message sur le pseudo, focus', async () => {
      await repondre(409, probleme('pseudo-deja-pris', 409));
      expect(champ('pseudo').getAttribute('aria-invalid')).toBe('true');
      expect(racine().textContent).toContain('Ce pseudo est déjà pris, choisis-en un autre');
      expect(document.activeElement).toBe(champ('pseudo'));
    });

    it('422 age-minimum : message sur la date, lié aux trois champs', async () => {
      await repondre(422, probleme('age-minimum', 422));
      expect(racine().querySelector('#naissance-erreur')?.textContent).toContain('au moins 15 ans');
      for (const n of ['jour', 'mois', 'annee'])
        expect(champ(n).getAttribute('aria-describedby')).toBe('naissance-erreur');
      expect(document.activeElement).toBe(champ('jour'));
    });

    it('422 consentement-obligatoire : message sur la case CGU', async () => {
      await repondre(422, probleme('consentement-obligatoire', 422));
      expect(champ('cgu').getAttribute('aria-describedby')).toBe('cgu-erreur');
      expect(document.activeElement).toBe(champ('cgu'));
    });

    it('409 version-texte-obsolete : message global et bouton de rechargement', async () => {
      await repondre(409, probleme('version-texte-obsolete', 409));
      expect(racine().querySelector('[role="alert"]')?.textContent).toContain(
        'conditions ont changé',
      );
      expect(racine().textContent).toContain('Recharger la page');
    });

    it('400 validation : un message par champ depuis erreurs[].code', async () => {
      await repondre(
        400,
        probleme('validation', 400, {
          erreurs: [
            { champ: 'motDePasse', code: 'trop-court' },
            { champ: 'email', code: 'format' },
          ],
        }),
      );
      expect(racine().textContent).toContain('au moins 12 caractères');
      expect(champ('email').getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(champ('email'));
    });

    it('panne réseau : message global', async () => {
      await fixture.whenStable();
      http.expectOne('/api/compte/inscription').error(new ProgressEvent('error'));
      await apres();
      expect(racine().querySelector('[role="alert"]')?.textContent).toContain('Pas de connexion');
    });
  });
});
