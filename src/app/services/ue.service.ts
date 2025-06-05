import { Injectable } from '@angular/core';
import { Ue } from '../models/ue';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class UeService {

  private apiUrl = 'http://localhost:3000/ues';

  constructor(public http: HttpClient) { }

  get_ue(): Observable<Ue[]> {
      return this.http.get<Ue[]>(this.apiUrl);
    }
}
