import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Device } from '@ionic-native/device/ngx';
import { Router } from "@angular/router";
import { HeaderService, IRecognizedHeaderConfig } from "../../services/header/header.service";
import { Subscription } from "rxjs/Rx";
import { NavigationService } from "../../services/navigation/navigation.service";

import * as _ from 'lodash';
import * as moment from 'moment';
import { DeviceService } from '../../services/device/device.service';
import { UtilsService } from '../../services/utils/utils.service';
import { trigger, transition, animate, style, state } from '@angular/animations'
import { Location } from '@angular/common';
import { TimeAdjustService } from '../../services/timeAdjust/time-adjust.service';

export interface IHeaderConfig {
  title?: string;
  hideBackButton?: boolean;
  disableBackButton?: boolean;
  hideMenu?: boolean;
  disableMenu?: boolean;
  showTime?: boolean;
  showMainLogo?: boolean;
  onBack?: () => void;
  isBackToMain?: boolean;
  showBatteryLevel?: boolean;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {

  public currentTime: string;
  public timeIsAvailable: boolean = this.device.isBlackView();

  @Input('config') set input(config: IHeaderConfig) {
    if (config) {
      setTimeout(() => {
        Object.assign(this.config, config);
        this.headerService.set(this.config);
      });
    }
  }

  public config: IHeaderConfig = {};

  private headerSubscription: Subscription;
  private currentUrl: string;

  constructor(
    private router: Router,
    private headerService: HeaderService,
    private navigationService: NavigationService,
    private device: DeviceService,
    private location: Location,
    private utils: UtilsService,
    private timeAdjust: TimeAdjustService

  ) {}

  ngOnInit() {
    this.config = _.clone(this.headerService.getCurrentConfig());
    this.currentUrl = this.router.url;

    this.headerSubscription = this.headerService.onChanges().subscribe((config: IRecognizedHeaderConfig) => {
      if (this.currentUrl === config.url) {
        if (!this.config) {
          this.config = _.clone(config.config);
        }

        this.headerService.set(this.config);
      }
    });

    this.startTimer();
  }

  ngOnDestroy() {
    this.headerSubscription && this.headerSubscription.unsubscribe();
    
  }

  public goToSettings(): void {
    this.navigationService.navigate(['menu']);
  }

  public back(): void {
    if (this.config && this.config.onBack) {
      this.config.onBack();
    } else {
      if (this.config.isBackToMain) {
        this.navigationService.backRoot(this.navigationService.getRootState());
      } else {
        this.navigationService.back();
      }
    }
  }

  private startTimer(): void {
    if (this.config.showTime && this.timeIsAvailable) {
      
      this.currentTime = this.utils.timeFormat(this.timeAdjust.currentTime());
    }
  }
}
