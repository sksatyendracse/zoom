import { Injectable } from '@angular/core';
import { Device } from "@ionic-native/device/ngx";

import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private blackViewModels: string[] = ['BV6000', 'BV5800', 'BV6800Pro'];

  constructor(private device: Device) {}

  public isBlackView(): boolean {
    return _.includes(this.blackViewModels, this.device.model);
  }
}
