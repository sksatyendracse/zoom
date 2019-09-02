import { Injectable } from '@angular/core';
import { CommsService } from '../comms/comms.service';
import { Geolocation, Geoposition } from '@ionic-native/geolocation/ngx';

@Injectable({
  providedIn: 'root'
})
export class GpslocationService {

  private POSITION_AGE_MAX: number = 60;
  private POSITION_TIMEOUT: number = 5;
  private lastPosition: Geoposition

  constructor(
    private commsService: CommsService,
    private geolocation: Geolocation
  ) { }

  public get(): Promise<any> {
    return new Promise(resolve => {
      if (this.commsService.usingGateway) {
        // getLocation should always return nothing when we are
        // connected to a gateway
        resolve(null);
      } else {
        this.geolocation.getCurrentPosition({
          maximumAge: this.POSITION_AGE_MAX * 1000,
          timeout: this.POSITION_TIMEOUT * 1000,
          enableHighAccuracy: true
        })
          .then(pos => {
            this.lastPosition = pos;
            resolve(pos);
          })
          .catch(e => {
            console.log("Position update failed: " + e);
            this.lastPosition = null;
            resolve(null);
          });
      }
    });
  }
}
