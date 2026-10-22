import { ChangeDetectionStrategy, Component } from '@angular/core';

// Coquille : l'écran arrive avec r1-capturer-36.
@Component({
  selector: 'app-explorer',
  template: '<h1>Explorer</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Explorer {}
