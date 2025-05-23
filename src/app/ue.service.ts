import { Injectable } from '@angular/core';
import { Ue } from './models/ue';

@Injectable({
  providedIn: 'root'
})
export class UeService {

  UeArray !: Ue[]
  path :  string = "./assets/we4.jpg"

  constructor() { }

  get_ue( ) :  Ue[] {
    // we suppose that it gets data from the backend 
    this.UeArray = []
    this.UeArray.push(new Ue(1, 58, 'Technologies web', 'CS', 'WE4', this.path,))
    this.UeArray.push(new Ue(2, 40, 'Android Development', 'CS', 'SY43', this.path,))
    this.UeArray.push(new Ue(3, 30, 'Systèmes d\'Information', 'CS', 'SI40', this.path,))
    this.UeArray.push(new Ue(4, 10, 'Sémiologie du son', 'QC', 'SI02', this.path,))
    this.UeArray.push(new Ue(4, 10, 'English', 'EC', 'LE05', this.path,))

    return this.UeArray
  }
}
