import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZnTampon } from '../../../shared/ui/tampon';

/** Premier écran du visiteur (RG-001, maquette O1) : un seul job, entrer dans l'appli. */
@Component({
  selector: 'app-bienvenue',
  imports: [RouterLink, ZnTampon],
  templateUrl: './bienvenue.html',
  styleUrl: './bienvenue.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bienvenue {}
