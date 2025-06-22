import { Component, OnInit, Input } from '@angular/core';
import { User } from '@/core/models/user.models';

@Component({
  selector: 'app-admin-page-list',
  imports: [],
  templateUrl: './admin-page-list.html'
})
export class AdminPageList implements OnInit {

  @Input() users !: User

  constructor() {}

  ngOnInit(): void {
  }
}
