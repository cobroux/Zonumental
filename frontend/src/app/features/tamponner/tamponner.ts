import { ChangeDetectionStrategy, Component } from '@angular/core';

// Coquille : la liste Tamponner arrive avec r1-capturer-9.
@Component({
  selector: 'app-tamponner',
  template: '<h1>Tamponner</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tamponner {}
