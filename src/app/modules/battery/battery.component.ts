import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from "rxjs/Rx";

@Component({
  selector: 'app-battery',
  templateUrl: './battery.component.html',
  styleUrls: ['./battery.component.scss']
})
export class BatteryComponent implements OnInit, OnDestroy {


  @Input() hideIfNotLow: boolean = false;

  public batteryLevel: number;
  public batteryImg: string;
  public isShow: boolean = true;
  public isCharging: boolean = false;

  private batteryLevelSubscription: Subscription;

  constructor(
    
  ) {}

  ngOnInit() {
    this.initBatteryStatus();
  }

  ngOnDestroy() {
    this.batteryLevelSubscription && this.batteryLevelSubscription.unsubscribe();
  }

  private initBatteryStatus(): void {
   
  }

  private syncData(): void {
    
  }

  private checkVisibility(): void {
   
  }

}
