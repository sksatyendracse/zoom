import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { HeaderModule } from "../header/header.module";
import { NetworkHandlerComponent } from './network-handler.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: NetworkHandlerComponent
      }
    ]),
    HeaderModule
  ],
  declarations: [NetworkHandlerComponent]
})
export class NetworkHandlerModule {}
