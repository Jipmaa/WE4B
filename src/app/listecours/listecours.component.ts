import { Component, OnInit } from '@angular/core';
import { Ue } from '../models/ue';
import { UeService } from '../services/ue.service';

@Component({
  selector: 'app-listecours',
  templateUrl: './listecours.component.html',
  styleUrls: ['./listecours.component.css']
})
export class ListecoursComponent implements OnInit {

  UeArray !: Ue[]
  
  constructor(public servUe : UeService) { 
    this.servUe.get_ue().subscribe(
      data => {
         console.log(data);
        this.UeArray = data
      }
    )
  }

  ngOnInit(): void {
    
  }

}
