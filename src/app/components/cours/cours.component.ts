import { Component, Input, OnInit } from '@angular/core';
import { Ue } from '../../models/ue';

@Component({
  selector: 'app-cours',
  templateUrl: './cours.component.html',
  styleUrls: ['./cours.component.css']
})


export class CoursComponent implements OnInit {

  @Input() ue !:  Ue
  
  constructor() {}

  ngOnInit(): void {
  }

}
