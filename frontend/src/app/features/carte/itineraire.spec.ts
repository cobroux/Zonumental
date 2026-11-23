import { HttpErrorResponse, HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../core/api/api-configuration';
import { Itineraire } from '../../core/api/models/itineraire';
import { CalculItineraire, lienRepli, messageDe, resume } from './itineraire';

const ITI: Itineraire = {
  distanceMetres: 1840,
  dureeSecondes: 1380,
  trace: { type: 'LineString', coordinates: [[2.29, 48.85]] },
  etapes: [{ instruction: 'Vous êtes arrivé.', distanceMetres: 0 }],
};
const echec = (status: number, code?: string, retry?: string) =>
  new HttpErrorResponse({
    status,
    error: code ? JSON.stringify({ code }) : null,
    headers: new HttpHeaders(retry ? { 'Retry-After': retry } : {}),
  });

function service() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('')],
  });
  return { s: TestBed.inject(CalculItineraire), http: TestBed.inject(HttpTestingController) };
}

describe('CalculItineraire', () => {
  afterEach(() => vi.restoreAllMocks());
  it('poste départ et numéro, passe par chargement puis ok', async () => {
    const { s, http } = service();
    const fin = s.calculer(9, { latitude: 48.85, longitude: 2.29, precision: 12 });
    expect(s.etat().statut).toBe('chargement');
    const req = http.expectOne('/api/itineraire');
    expect(req.request.body).toEqual({ depart: { latitude: 48.85, longitude: 2.29 }, numero: 9 });
    req.flush(ITI);
    await fin;
    expect(s.etat()).toEqual({ statut: 'ok', itineraire: ITI });
  });

  it('hors ligne : aucun appel, erreur « Pas de connexion »', async () => {
    const { s, http } = service();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await s.calculer(9, { latitude: 48.85, longitude: 2.29 });
    http.expectNone('/api/itineraire');
    expect(s.etat()).toMatchObject({ statut: 'erreur', texte: 'Pas de connexion.', repli: true });
  });

  it('erreur 503 : état erreur avec repli', async () => {
    const { s, http } = service();
    const fin = s.calculer(9, { latitude: 48.85, longitude: 2.29 });
    http
      .expectOne('/api/itineraire')
      .flush(JSON.stringify({ code: 'indisponible' }), { status: 503, statusText: 'x' });
    await fin;
    expect(s.etat()).toMatchObject({ statut: 'erreur', repli: true });
  });

  it('401 : retour à inactif, rien à afficher', async () => {
    const { s, http } = service();
    const fin = s.calculer(9, { latitude: 48.85, longitude: 2.29 });
    http.expectOne('/api/itineraire').flush(null, { status: 401, statusText: 'x' });
    await fin;
    expect(s.etat().statut).toBe('inactif');
  });
});

describe('messageDe', () => {
  it('400 depart : trop loin, avec repli', () => {
    const e = new HttpErrorResponse({
      status: 400,
      error: JSON.stringify({ code: 'validation', erreurs: [{ champ: 'depart', code: 'format' }] }),
    });
    expect(messageDe(e)).toEqual({
      texte: 'Trop loin pour un trajet à pied (10 km max).',
      repli: true,
    });
  });
  it('404 : monument introuvable', () => {
    expect(messageDe(echec(404, 'introuvable'))?.texte).toBe('Monument introuvable.');
  });
  it('429 : délai du Retry-After, sans repli', () => {
    expect(messageDe(echec(429, 'limite-frequence', '600'))).toEqual({
      texte: 'Limite de calculs atteinte. Réessaie dans 10 min.',
      repli: false,
    });
    expect(messageDe(echec(429, 'limite-frequence', '30'))?.texte).toContain('dans 30 s');
    expect(messageDe(echec(429, 'limite-frequence'))?.texte).toContain('dans un instant');
  });
  it('502 et 503 : même texte, avec repli', () => {
    const a = messageDe(echec(502, 'indisponible'));
    expect(a).toEqual({ texte: 'Itinéraire indisponible pour le moment.', repli: true });
    expect(messageDe(echec(503, 'indisponible'))).toEqual(a);
  });
  it('statut 0 : pas de connexion, avec repli', () => {
    expect(messageDe(echec(0))).toEqual({ texte: 'Pas de connexion.', repli: true });
  });
  it('401 : null', () => expect(messageDe(echec(401, 'non-authentifie'))).toBeNull());
});

describe('resume', () => {
  it('durée et distance', () => {
    expect(resume({ ...ITI })).toBe('23 min · 1,8 km');
  });
  it('moins d’un kilomètre en mètres', () => {
    expect(resume({ ...ITI, distanceMetres: 640, dureeSecondes: 480 })).toBe('8 min · 640 m');
  });
  it('plus d’une heure en h min', () => {
    expect(resume({ ...ITI, dureeSecondes: 4500 })).toBe('1 h 15 min · 1,8 km');
  });
});

describe('lienRepli', () => {
  it('destination seule : coordonnées du monument, départ vide', () => {
    const url = lienRepli({ latitude: 48.8584, longitude: 2.2945 });
    expect(url).toBe(
      'https://www.openstreetmap.org/directions?engine=fossgis_valhalla_foot&route=%3B48.8584%2C2.2945',
    );
  });
});
