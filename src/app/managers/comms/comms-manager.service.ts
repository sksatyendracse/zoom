import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CommsManager {
  public isReady: boolean = false;

  public isDeviceReady(): boolean {
    return this.isReady;
  }
}
