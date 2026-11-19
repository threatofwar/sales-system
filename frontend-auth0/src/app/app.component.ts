import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'angular-app';

  private readonly redirectSubscription: Subscription;

  constructor(auth: AuthService, router: Router) {
    this.redirectSubscription = auth.appState$.subscribe((appState) => {
      void router.navigateByUrl(appState?.target ?? '/dashboard');
    });
  }

  ngOnDestroy(): void {
    this.redirectSubscription.unsubscribe();
  }
}
