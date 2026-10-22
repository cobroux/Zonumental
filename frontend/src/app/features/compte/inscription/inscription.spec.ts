import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../../core/api/api-configuration';
import { VERSIONS_LEGALES } from '../../../core/legal/versions-legales';
import { Router } from '@angular/router';
import { Inscription } from './inscription';

describe('Inscription', () => {
  let fixture: ComponentFixture<Inscription>;
  let http: HttpTestingController;
  let navigation: ReturnType<typeof vi.spyOn>;
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

  function remplir(cgu = true) {
    saisir('pseudo', 'Marco_75');
    saisir('email', 'marco@exemple.fr');
    saisir('motDePasse', 'chat-bleu-47-lune');
    saisir('dateNaissance', '01 / 01 / 2000');
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
    navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Inscription);
    await fixture.whenStable();
  });

  it('consentements facultatifs décochés par défaut, CGU aussi', () => {
    for (const n of ['cgu', 'classement', 'emails']) expect(champ(n).checked).toBe(false);
  });

  it('tient sur un seul écran : en-tête étape 1 / 2, retour de 44 px, titre de la maquette', () => {
    expect(racine().querySelector('header')?.textContent).toContain('Étape 1 / 2');
    expect(racine().querySelector('header button')?.getAttribute('aria-label')).toBe('Retour');
    expect(racine().querySelector('h1')?.textContent).toBe('Crée ton carnet d’explorateur');
    for (const n of ['pseudo', 'email', 'motDePasse', 'dateNaissance', 'cgu'])
      expect(champ(n)).toBeTruthy();
    expect(racine().querySelectorAll('form')).toHaveLength(1);
  });

  it('date de naissance : un seul champ texte numérique, indices et placeholders de la maquette', () => {
    const d = champ('dateNaissance');
    expect(d.type).toBe('text');
    expect(d.getAttribute('inputmode')).toBe('numeric');
    expect(d.getAttribute('autocomplete')).toBe('bday');
    expect(d.placeholder).toBe('JJ / MM / AAAA');
    expect(champ('pseudo').placeholder).toBe('ex. explorateur75');
    expect(champ('email').placeholder).toBe('toi@exemple.fr');
    const aides = [...racine().querySelectorAll('.zn-champ__aide')].map((a) => a.textContent);
    expect(aides).toEqual([
      'visible seulement si tu l’acceptes',
      'pour retrouver ton carnet',
      '12 caractères minimum',
      '15 ans minimum',
    ]);
  });

  it('une case obligatoire (CGU + confidentialité) puis deux facultatives décochées, dans « Tes choix »', () => {
    const groupe = racine().querySelector('fieldset')!;
    expect(groupe.querySelector('legend')?.textContent).toContain('Tes choix');
    const noms = [...groupe.querySelectorAll('input')].map((i) => i.name);
    expect(noms).toEqual(['cgu', 'classement', 'emails']);
    expect(champ('cgu').checked).toBe(false);
    expect(champ('classement').checked).toBe(false);
    expect(champ('emails').checked).toBe(false);
    expect(groupe.textContent).toContain('Obligatoire');
    expect(groupe.textContent).toContain('Recevoir les nouveaux défis par e-mail.');
    const liens = [...groupe.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(liens).toEqual(['/cgu', '/confidentialite']);
  });

  it('bouton « Créer mon carnet » suivi de la mention sur les données', () => {
    expect(racine().querySelector('button[type="submit"]')?.textContent).toContain(
      'Créer mon carnet',
    );
    expect(racine().textContent).toContain(
      'Export ou suppression de tes données à tout moment depuis Profil. Hébergé dans l’UE.',
    );
  });

  it('la flèche retour revient à l’écran précédent', () => {
    const retour = vi.spyOn(TestBed.inject(Location), 'back').mockReturnValue(undefined);
    racine().querySelector<HTMLButtonElement>('header button')!.click();
    expect(retour).toHaveBeenCalled();
  });

  it('refuse un mot de passe de 11 caractères : erreur liée au champ, focus', async () => {
    remplir();
    saisir('motDePasse', 'Abc123!xyz_');
    await soumettre();

    const mdp = champ('motDePasse');
    expect(mdp.getAttribute('aria-invalid')).toBe('true');
    const erreurId = mdp.getAttribute('aria-describedby')!.split(' ').pop()!;
    expect(racine().querySelector(`#${erreurId}`)?.textContent).toContain('12 caractères');
    expect(document.activeElement).toBe(mdp);
    http.verify();
  });

  it('envoi impossible sans CGU : erreur sur la case, focus, aucune requête', async () => {
    remplir(false);
    await soumettre();
    expect(champ('cgu').getAttribute('aria-invalid')).toBe('true');
    expect(champ('cgu').getAttribute('aria-describedby')).toBe('cgu-erreur');
    expect(document.activeElement).toBe(champ('cgu'));
    http.verify();
  });

  it('date invalide : erreur liée au champ, focus sur la première erreur du formulaire', async () => {
    remplir();
    saisir('dateNaissance', '31/02/2000');
    saisir('email', 'pas-un-mail');
    await soumettre();
    expect(champ('dateNaissance').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(champ('email'));
    http.verify();
  });

  it('envoie le contrat avec les versions légales, puis affiche la confirmation', async () => {
    remplir();
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
    expect(navigation).toHaveBeenCalledWith(['/inscription/verifie-ton-email'], {
      state: { email: 'marco@exemple.fr' },
    });
  });

  describe('erreurs du serveur', () => {
    beforeEach(async () => {
      remplir();
      await soumettre();
    });

    it('409 pseudo-deja-pris : message sur le pseudo, focus', async () => {
      await repondre(409, probleme('pseudo-deja-pris', 409));
      expect(champ('pseudo').getAttribute('aria-invalid')).toBe('true');
      expect(racine().textContent).toContain('Ce pseudo est déjà pris, choisis-en un autre');
      expect(document.activeElement).toBe(champ('pseudo'));
    });

    it('422 age-minimum : message sur la date, lié au champ', async () => {
      await repondre(422, probleme('age-minimum', 422));
      const d = champ('dateNaissance');
      expect(racine().textContent).toContain('au moins 15 ans pour créer');
      expect(d.getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(d);
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
