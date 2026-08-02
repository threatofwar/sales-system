import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './search-box.component.html'
})
export class SearchBoxComponent {

  @Input() placeholder = 'Search...';

  searchTerm = '';

}