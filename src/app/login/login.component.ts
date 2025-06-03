import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  TogglePass(icone: any) {
    var field = document.getElementById("exampleInputPassword1") as HTMLInputElement;
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