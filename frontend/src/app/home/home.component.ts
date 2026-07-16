import { Component, OnInit } from '@angular/core';
import { SessionService } from '../core/session/session.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  constructor(private sessionService: SessionService) {}

  // ngOnInit(): void {
  //   // Check if the user is authenticated
  //   if (this.sessionService.isAuthenticated()) {
  //   } else {
  //     // Redirect to login
  //   }
  // }
}
