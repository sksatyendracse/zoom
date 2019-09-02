import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DataTablesModule } from 'angular-datatables';
import { ReactiveFormsModule } from '@angular/forms';

import { HeaderModule } from "../header/header.module";
import { LoginComponent } from './login.component';
import { BatteryModule } from "../battery/battery.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DataTablesModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: LoginComponent
      }
    ]),
    HeaderModule,
    BatteryModule
  ],
  declarations: [LoginComponent]
})
export class AuthModule {}
