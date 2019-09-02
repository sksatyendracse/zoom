import { Injectable } from '@angular/core'; import { Platform } from '@ionic/angular';
import { NavController, } from '@ionic/angular';
import { NavigationEnd, Router } from '@angular/router';
import { HeaderService } from "../header/header.service";
import { IHeaderConfig } from "../../modules/header/header.component";

import { filter } from 'rxjs/operators';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  private history: NavigationEnd[] = [];
  private isBack: boolean = false;
  private rootState: string = 'site-awareness-landing';
  private isMainPageInitialized: boolean = false;

  private mainPages: string[] = [
    '/site-awareness-landing',
    '/login',
    '/select-site-location',
    '/network-handler',
    '/observationSubmitted/',
    '/textMessageModal',
    '/coachingSubmitComplete',
    '/complimentSubmitComplete',
    '/escalateComplete/',
    '/securedArea',
    '/selectObserverUser',
    '/no-network'
  ];

  /**
   * Ensure the topPages list is the collection all pages that, when navigated to, clear out the history list
   */
  private topPages: string[] = [
    '/site-awareness-landing',
    '/menu/site-management',
    '/login',
    '/select-site-location',
    '/newObservation',
    '/observationMenu',
    '/communications',
    '/menu/profile',
    '/menu/settings',
    '/menu/signout',
    '/selectObserverUser',
    '/no-network'
  ];

  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    private router: Router,
    private headerService: HeaderService
  ) {}

  public init(): void {
    if (this.platform.is('android')) {
      this.platform.backButton.subscribeWithPriority(100,() => {
        const headerConfig: IHeaderConfig = this.headerService.getCurrentConfig();

        if (headerConfig && headerConfig.onBack) {
          headerConfig.onBack();
        } else if (_.get(headerConfig, 'disableBackButton')) {
          // do nothing
          return;
        } else {
          if (headerConfig.isBackToMain && this.isMainPageInitialized) {
            this.backRoot(this.getRootState());
          } else {
            this.back();
          }
        }
      });
    }

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((url: NavigationEnd) => {
        if (_.find(this.topPages, (page) => url.url.includes(page)) && this.isMainPageInitialized) {
          // this is a top page - reset the stack
          this.history = [ url ];
          // it doesn't matter if we went "back" to this page or not
          this.isBack = false;
        } else {
          this.isBack ? this.history.pop() : this.history.push(url);
          this.isBack = false;
        }

        if (url.url.includes(this.getRootState())) {
          this.isMainPageInitialized = true;
        }

        if (url.url.includes('login')) {
          this.isMainPageInitialized = false;
        }
      });
  }

  public back(isValid?: boolean): void {
    if (this.isBackValid() || isValid) {
      this.isBack = true;
      this.navCtrl.back( {animated: false});
    }
  }

  public backRoot(url: string): void {
    this.history = [];
    this.navCtrl.navigateBack(url, {animated: false});
  }

  public navigate(url: any[], params?: any): Promise<null> {
    return new Promise((resolve: () => void) => {

      this.router.navigate(url, params).then(() => {
        resolve();
      });
    });
  }

  public getRootState(): string {
    return this.rootState;
  }

  private isBackValid(): boolean {
    let isValid: boolean = true;
    let history: NavigationEnd[] = _.clone(this.history);
    let currentState: NavigationEnd = history.pop();

    if (currentState && _.find(this.mainPages, (page) => currentState.url.includes(page))) {
      isValid = false;
    }

    return isValid;
  }
}
