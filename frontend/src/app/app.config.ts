import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideApiConfiguration } from './core/api/api-configuration';
import { jetonInterceptor } from './core/session/jeton.interceptor';
import { Session } from './core/session/session';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([jetonInterceptor])),
    // Restaure la session avant la première navigation ; un échec donne une session anonyme (ADR 0013).
    provideAppInitializer(() => inject(Session).renouveler()),
    // '' et non '/' : le client génère sinon //api/..., une URL relative au protocole.
    provideApiConfiguration(''),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
