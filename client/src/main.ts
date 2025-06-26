import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from '@/app.config';
import { App } from '@/app';
import {isDevMode} from '@angular/core';

if (isDevMode()) {
  console.log("🏗️ Running in dev mode");
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
