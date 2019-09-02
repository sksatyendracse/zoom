import { Injectable } from '@angular/core';
import { Router, RoutesRecognized, ActivatedRouteSnapshot } from "@angular/router";
import { IHeaderConfig } from "../../modules/header/header.component";

import { Observable, Observer } from "rxjs/Rx";
import * as _ from 'lodash';

export interface IRecognizedHeaderConfig {
  config: IHeaderConfig;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class HeaderService {

  private routerHeaderObservable: Observable<IRecognizedHeaderConfig>;
  private currentConfig: IHeaderConfig;

  constructor(private router: Router) {
    this.routerHeaderObservable = new Observable<IRecognizedHeaderConfig>((observer: Observer<IRecognizedHeaderConfig>) => {
      this.router.events
        .filter(event => event instanceof RoutesRecognized)
        .map((event: RoutesRecognized) => {
          return {
            config: this.getConfigFromRoute(event),
            url: event.url
          };
        })
        .subscribe((headerConfig: IRecognizedHeaderConfig) => {
          this.currentConfig = headerConfig.config;
          observer.next(headerConfig);
        });
    }).share();

    this.routerHeaderObservable.subscribe();
  }

  public onChanges(): Observable<IRecognizedHeaderConfig> {
    return this.routerHeaderObservable;
  }

  public getCurrentConfig(): IHeaderConfig {
    return _.clone(this.currentConfig)
  }

  public set(config: IHeaderConfig): void {
    Object.assign(this.currentConfig, config);
  }

  private getConfigFromRoute(route: RoutesRecognized): IHeaderConfig {
    let config: IHeaderConfig = {};
    let firstChild: ActivatedRouteSnapshot = route.state.root.firstChild;

    while (firstChild) {
      if (firstChild.data && firstChild.data.headerConfig) {
        Object.assign(config, firstChild.data.headerConfig);
      }
      firstChild = firstChild.firstChild || null;
    }

    return config;
  }
}
