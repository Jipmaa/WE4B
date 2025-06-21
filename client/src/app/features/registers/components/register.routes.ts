import {Routes} from '@angular/router';
import { Register } from '@/features/registers/components/register/register';
import { RegisterCourseunits } from '@/features/registers/components/register-courseunits/register-courseunits';

export const registersRoutes: Routes = [

  {
    path: '',
    component: Register,
  },

  {
    path: 'courseunits',
    component: RegisterCourseunits,
  }

]
