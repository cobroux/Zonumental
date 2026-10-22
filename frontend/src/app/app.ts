import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ZnNavigation } from './shared/ui/navigation';

@Component({
  imports: [RouterOutlet, ZnNavigation],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  /** Les pages connectées déclarent `data: { navigation: true }` ; onboarding, légal et caméra s'abstiennent. */
  protected readonly navigation = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let r = this.router.routerState.snapshot.root;
        while (r.firstChild) r = r.firstChild;
        return r.data['navigation'] === true;
      }),
    ),
    { initialValue: false },
  );
}
