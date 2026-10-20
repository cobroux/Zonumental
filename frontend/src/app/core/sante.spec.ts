import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideApiConfiguration } from './api/api-configuration';
import { Sante } from './sante';

describe('Sante', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('')],
    }),
  );

  it('appelle GET /api/health via le client généré', async () => {
    const http = TestBed.inject(HttpTestingController);
    const reponse = TestBed.inject(Sante).verifier();

    const req = http.expectOne('/api/health');
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'UP' });

    expect(await reponse).toEqual({ status: 'UP' });
    http.verify();
  });
});
