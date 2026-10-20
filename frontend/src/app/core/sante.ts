import { inject, Injectable } from '@angular/core';
import { Api } from './api/api';
import { sante } from './api/fn/sante/sante';

/** État de santé du back, via le client généré (ADR 0014). */
@Injectable({ providedIn: 'root' })
export class Sante {
  private readonly api = inject(Api);

  verifier() {
    return this.api.invoke(sante);
  }
}
