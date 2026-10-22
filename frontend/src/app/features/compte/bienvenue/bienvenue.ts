import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Premier écran du visiteur (RG-001, maquette O1) : un seul job, entrer dans l'appli. */
@Component({
  selector: 'app-bienvenue',
  imports: [RouterLink],
  templateUrl: './bienvenue.html',
  styleUrl: './bienvenue.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bienvenue {}
