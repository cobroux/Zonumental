import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ZnMessage } from '../../../shared/ui/message';

type Issue = 'refus' | 'indisponible';

const RAYON_M = 150; // RG-021 / RG-032 : rayon de capture par défaut

/**
 * Explication avant la demande système (RG-036, RG-027). En R0 on demande seulement
 * l'autorisation : la position reçue est ignorée, jamais stockée ni envoyée.
 */
@Component({
  selector: 'app-localisation',
  imports: [ZnMessage],
  templateUrl: './localisation.html',
  styleUrl: './localisation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Localisation {
  private readonly routeur = inject(Router);
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  // Même transmission que l'écran suivant : état de navigation, jamais l'URL.
  private readonly email: string | null =
    (this.routeur.currentNavigation()?.extras.state ?? history.state)?.email ?? null;

  protected readonly rayon = RAYON_M;
  protected readonly issue = signal<Issue | null>(null);

  protected autoriser() {
    if (this.issue()) return this.suite();
    if (!navigator.geolocation) return this.annoncer('indisponible');
    navigator.geolocation.getCurrentPosition(
      () => this.suite(), // position volontairement ignorée
      () => this.annoncer('refus'),
      { maximumAge: Infinity, timeout: 30000 },
    );
  }

  protected passer() {
    this.annoncer('refus');
  }

  private suite() {
    return this.routeur.navigate(['/inscription/verifie-ton-email'], {
      state: { email: this.email },
    });
  }

  private annoncer(issue: Issue) {
    this.issue.set(issue);
    afterNextRender(() => this.hote.querySelector<HTMLElement>('zn-message')?.focus(), {
      injector: this.injector,
    });
  }
}
