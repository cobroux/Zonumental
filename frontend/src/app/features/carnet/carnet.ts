import { ChangeDetectionStrategy, Component } from '@angular/core';

// Coquille : l'écran arrive avec r1-capturer-37.
@Component({
  selector: 'app-carnet',
  template: '<h1>Mon carnet</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Carnet {}
