import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BatteryComponent } from "../battery/battery.component";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    BatteryComponent
  ],
  exports: [
    BatteryComponent
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class BatteryModule { }
