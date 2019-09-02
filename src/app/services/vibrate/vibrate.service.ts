import { Injectable, OnDestroy } from '@angular/core';

import { BackgroundService } from '../background/background.service';
import { Vibration } from '@ionic-native/vibration/ngx';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Device } from '@ionic-native/device/ngx';

declare const cordova: any;

@Injectable({
  providedIn: 'root'
})
export class VibrateService implements OnDestroy {

  private onResumeSubscription: Subscription;

  constructor(
    private background: BackgroundService,
    private platform: Platform,
    private vibration: Vibration,
    private device: Device
  ) {
    this.onResumeSubscription = this.platform.resume.subscribe(() => {
      this.stop();
    });
  }

  ngOnDestroy() {
    this.onResumeSubscription && this.onResumeSubscription.unsubscribe();
  }

  public vibrateAlert(duration: any, frequency: number = 0): void {
    const doVibrate: () => void = () => {
      this.vibration.vibrate(duration);
    };

    this.clearTimer();

    if (this.background.inBackground && frequency) {
      doVibrate();
    } else {
      this.vibration.vibrate(duration);
    }
  }

  public stop() {
    this.clearTimer();
    if (this.device.platform !== 'iOS') {
      this.vibration.vibrate(0);
    }
  }

  private clearTimer(): void {
    
  }
}
