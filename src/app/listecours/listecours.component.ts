import { Component, OnInit } from '@angular/core';
import { Ue } from '../models/ue';
import { UeService } from '../ue.service';

@Component({
  selector: 'app-listecours',
  templateUrl: './listecours.component.html',
  styleUrls: ['./listecours.component.css']
})
export class ListecoursComponent implements OnInit {

  UeArray !: Ue[]
  
  constructor(public servUe : UeService) { 
    this.UeArray = this.servUe.get_ue()
  }

  ngOnInit(): void {
  }

}
