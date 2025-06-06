import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-userform',
  templateUrl: './userform.component.html',
  styleUrls: ['./userform.component.css']
})
export class UserformComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  TogglePass(icone: any) {
    var field = document.getElementById("inputPassword") as HTMLInputElement;
    if (field) {
      console.log("Champ de mot de passe trouvé :", field);
      if (field.type === "password") {
        icone.name = "eye-outline";
        field.type = "text";
      } else {
        icone.name = "eye-off-outline";
        field.type = "password";
      }
    }
  }
}
