import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from "rxjs/Rx";
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class BackgroundService implements OnDestroy {

  constructor(
    private platform: Platform
  ) {
    this.onResumeSubscription = platform.resume.subscribe(() => {
      this.inBackground = false;
    });
    this.onPauseSubscription = platform.pause.subscribe(() => {
      this.inBackground = true;
    });
   }

  private onPauseSubscription: Subscription;
  private onResumeSubscription: Subscription;
  public inBackground: boolean = false;

  ngOnDestroy() {
    this.onResumeSubscription && this.onResumeSubscription.unsubscribe();
    this.onPauseSubscription && this.onPauseSubscription.unsubscribe();
  }

}
