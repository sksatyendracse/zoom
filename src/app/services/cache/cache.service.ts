import { Injectable } from '@angular/core';
import { UserService } from '../user/user.service';
import { SubscriberService } from '../subscriber/subscriber.service';
import { SettingsService } from '../settings/settings.service';

@Injectable({
  providedIn: 'root'
})
export class CacheService {

  public lastRefresh: number = 0;

  constructor(
    private userService: UserService,
    private subscriber: SubscriberService,
    private settings: SettingsService
  ) { }

  update(tables?: Array<string>, force?: boolean) {
    if (force === undefined) {
      force = false;
    }
    return new Promise((resolve, reject) => {

      let p = [];

      var didLocations;
      // we need to do an initialize just in case something changed there
      // this has a sideeffect that lastRefresh is updated too
      if (tables && Array.isArray(tables)) {
        console.log("refreshCache indicates that some tables are out of date: " + tables.join(','));
        this.subscriber.initialize().then(() => {
          $.each(tables, (i, theTable) => {
            if ((theTable === "zones" || theTable === "locations") && !didLocations) {
              didLocations = true;
              p.push(this.userService.getLocations());
            }
            if (theTable === "gear") {
              p.push(this.userService.getGear());
            }
            if (theTable === "certifications") {
              p.push(this.userService.getCertifications());
            }
            if (theTable === "message_templates") {
              p.push(this.settings.getAll());
            }
            if (theTable === "groups") {
              p.push(this.userService.getTeams());
            }
            if (theTable === "participants") {
              p.push(this.userService.getAccounts());
            }
          });
          Promise.all(p)
            .then((theResults) => {
              resolve(true);
            });
        }).catch((err) => {
          // route to initfailed
          // utils.showpage('initfailed');
          reject(err);
        });
      } else {
        console.log("refreshCache says we are out of date but did not return a table");
        // the backend we are talking to doesn't have the smarterCache
        // code yet - do the old behavior
        this.subscriber.initialize().then(() => {
          // p.push(settings.updateCaches());
          p.push(this.userService.updateCaches( force ));
          Promise.all(p)
            .then((theResults) => {
              resolve(true);
            });
        })
          .catch((err) => {
            // utils.showpage('initfailed');
            reject(err);
          });
      }
    });

  }
}
