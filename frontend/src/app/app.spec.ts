import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';

@Component({ template: 'x' })
class Page {}

describe('App', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'explorer', component: Page, data: { navigation: true } },
          { path: 'connexion', component: Page },
        ]),
      ],
    }),
  );

  it('héberge le routeur sans contenu de démonstration', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).not.toBeNull();
    expect(el.textContent?.trim()).toBe('');
  });

  it('la barre de navigation n’apparaît que sur les pages qui la demandent', async () => {
    const fixture = TestBed.createComponent(App);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/connexion');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('zn-navigation')).toBeNull();
    await harness.navigateByUrl('/explorer');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('zn-navigation')).not.toBeNull();
  });
});
