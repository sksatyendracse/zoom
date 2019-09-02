import { Injectable } from '@angular/core';
import { CommsService } from "../comms/comms.service";
import { NotificationService } from '../notification/notification.service';
import { UserdataService } from '../userdata/userdata.service';
import { SubscriberService } from '../subscriber/subscriber.service';
import { GpslocationService } from '../gpslocation/gpslocation.service';
import { MessageService } from "../messages/message.service";
import { Observer, Subject } from "rxjs/Rx";
import { NavigationService } from "../navigation/navigation.service";
import { LoadingService } from "../loading/loading.service";
import { DeviceService } from '../device/device.service';
import { BackgroundService } from '../background/background.service';
import { UserService } from '../user/user.service';
import { Events } from '@ionic/angular';
import { Storage } from '@ionic/storage';


const POSITION_AGE_MAX = 10;
const POSITION_TIMEOUT = 5;

export interface IRequirement {
  type: string;
  typeID?: string;
  data?: any;
  compliant?: boolean;
  badge?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppService {

  constructor(public commsService: CommsService,
    private location: GpslocationService,
    private subscriber: SubscriberService,
    private userData: UserdataService,
    private notify: NotificationService,
    private messageService: MessageService,
    private navigationService: NavigationService,
    private loadingService: LoadingService,
    private deviceService: DeviceService,
    private background: BackgroundService,
    private userService: UserService,
    private events: Events,
    private storageIonic: Storage
    
  ) {}


  private scanStarted: boolean = false;
  private _scanTimer: number = null;
  private SCAN_INTERVAL: number = 3000;

  public servicesStarted: boolean = false;

  private inBackground = this.background.inBackground;

  logBeacons: boolean = false;
  logUpdates: boolean = false;
  sendUpdates: boolean = true;
  sendingUpdate: number = null;

  // information about logged in user
  // userInformation is populated bu the auth service
  userInformation: any = {};
  userPushToken = null;
  prefs: any = {};

  initialized: boolean = false;
  lastRefresh = null;
  locationSelected = null;
  subscriberSelected = null;
  uploading: boolean = false;
  initializing: boolean = false;
  notificationTimer: any = null;
  imageObjectList: any = [];
  observationID: any = null;
  batLevel = null;
  authenticating: boolean = false;
  safetyMessage: string = "";
  safetyMessageTime: number = 0;
  NOTIFICATION_MORATORIUM_TIME: number = 30000;
  lastCompliance;
  sharedUserSelected = null;
  sharedTeamSelected: number = 0;
  SIGNIN_UPDATE_DELAY: number = 10000;
  updateDelay = null;

  GEAR_THRESHOLD = -105;
  activeGear = {};
  overriddenGear = {};
  lastPosition = null;
  certInfo = {};
  gpsEnabled = null;

  public readonly onSignout: Subject<void> = new Subject<void>();

  doSignin(observer?: Observer<boolean>) {
    if (this.notificationTimer) {
      window.clearTimeout(this.notificationTimer);
      this.notificationTimer = null;
    }
    this.notificationTimer = window.setTimeout(this.clearNotificationTimer, this.NOTIFICATION_MORATORIUM_TIME);
    this.lastCompliance = null;
    
  }

  private goToAfterSignIn(url: string, observer: Observer<boolean>): void {
    observer && observer.next(true);
    this.loadingService.disable();
    if(url != '/select-site-location'){
      let userId = this.userData.userID;
      this.storageIonic.get('carouselItem'+userId).then((val) => {
        if(val != null){
          this.navigationService.navigate(['/site-awareness-landing/preparing']);
        } else{
          this.navigationService.navigate(['/app-carousel']);
        }
      });
    } else{
      this.navigationService.navigate([url]);
    }
    
  }

  setupNoAuthHandler() {
    this.commsService.noAuthHandler = (err) => {
      this.handleNoAuth(err);
    }
  }

  handleNoAuth(err: any) {
    if (err && err.reqStatus) {
      if (err.reqStatus === "NoAuth") {
        // the user is no longer authenticated
        console.log("Backend reported user has no authentication");
        this.doSignout("/signedout");
      }
    }
  }

  /**
   *
   * @param target page to route to when done signing out
   *
   * Handles stopping services and telling the backend we are logged out
   */
  doSignout(target: string = "/login") {
    this.stopServices();
    this.prefs = {};
    this.userService.clearCaches();
    if (target === "/login" || target === "/pluggedIn" || target === "/signedout") {
      this.commsService.noAuthHandler = null;
      this.sendSignout().then(() => {
        this.onSignout.next();
        this.events.publish('ccs:signedOut');
        if (this.locationSelected) {
          // on direct connections we are picking a location.  Clear it
          this.subscriber.subInfo.locationID = null;
          this.locationSelected = null;
        }
        if (this.subscriberSelected) {
          // on direct connections we are also picking the subscriber
          this.subscriber.subInfo.subscriberID = null;
          this.subscriberSelected = null;
        }
        this.userData.clear();
        this.subscriber.clear();
        this.commsService.reset();
        if (!this.commsService.usingGateway) {
          this.commsService.serviceURL = null;
          this.commsService.tryBackend()
            .then((URL) => {
              // it succeeded!
              this.navigationService.navigate([target]);
            })
            .catch((err) => {
              this.navigationService.navigate(['/backendFailed']);
            });
        } else {
          this.navigationService.navigate([target]);
        }
        this.loadingService.disable();
      })
      .catch((err) => {
        // signout failed somehow.   bail anyway
        this.onSignout.next();
        this.events.publish('ccs:signedOut');
        if (this.locationSelected) {
          // on direct connections we are picking a location.  Clear it
          this.subscriber.subInfo.locationID = null;
          this.locationSelected = null;
        }
        if (this.subscriberSelected) {
          // on direct connections we are also picking the subscriber
          this.subscriber.subInfo.subscriberID = null;
          this.subscriberSelected = null;
        }
        this.userData.clear();
        this.subscriber.clear();
        this.commsService.reset();
        if (!this.commsService.usingGateway) {
          this.commsService.serviceURL = null;
          this.commsService.tryBackend()
            .then((URL) => {
              // it succeeded!
              this.navigationService.navigate([target]);
            })
            .catch((err) => {
                this.navigationService.navigate(['/backendFailed']);
            });
        } else {
          this.navigationService.navigate([target]);
        }
        this.loadingService.disable();
      });
    } else {
      if (this.locationSelected) {
        // on direct connections we are picking a location.  Clear it
        this.subscriber.subInfo.locationID = null;
        this.locationSelected = null;
      }
      if (!this.commsService.usingGateway) {
        this.subscriber.subInfo.subscriberID = null;
      }
      this.userData.clear();
      this.subscriber.clear()
      this.commsService.reset();
      this.commsService.noAuthHandler = null;
      this.navigationService.navigate([target]);
      this.loadingService.disable();
      this.events.publish('ccs:signedOut');
    }
    this.notify.clearAll();
  }

  watchForPlug() {
    
  }
  /**
   * call this from site-awareness to ensure everything is running.  We don't do this until
   * AFTER we know which site the user is at
   */
  startServices() {
    if (!this.servicesStarted) {
      this.watchForPlug();
      if (this.userData.userType !== 'observation') {
        // get the messages
        this.messageService.startPolling();
      } 
      this.servicesStarted = true;
    }
  }

  stopServices() {
    if (this.servicesStarted) {
      console.log("stopping services");
      this.scanStarted = false;

      // also, on blackview, turn off bluetooth
      if (this.deviceService.isBlackView()) {
        // just to keep it from wedging
       
      }

      this.messageService.stopPolling();
      this.commsService.clearRequests();
      this.servicesStarted = false;
    }
  }

  /**
   * determineLocation - figure out which subscriber location a user is at
   *
   * Use GPS coordinates to pick the most likely location.  If there is more than one
   * candidate location, show a menu so the user can pick.
   *
   */
  public determineLocation() {
    return new Promise((resolve, reject) => {
      this.location.get()
        .then((pos) => {
          var eData = {
            cmd: 'getNearbyLocations',
            token: this.userData.Token,
            location: "-,-",
            subscriberID: this.subscriber.subInfo.subscriberID
          };
          if (pos && pos.coords) {
            eData.location = pos.coords.latitude + "," + pos.coords.longitude;
          }
          this.commsService.sendMessage(eData, false, false)
            .then((response) => {
              // okay the server said something.
              if (response.reqStatus === "OK") {
                if (response.result.hasOwnProperty('locations') && Array.isArray(response.result.locations)) {
                  if (response.result.locations.length === 1) {
                    // there is only one matching location - awesome!
                    this.subscriber.subInfo.locationID = this.locationSelected = response.result.locations[0].locationID;
                    resolve(this.subscriber.subInfo.locationID);
                  }
                  else {
                    reject("location not found");
                  }
                }
                else {
                  reject("location not found");
                }
              }
              else {
                reject("location not found");
              }
            })
            .catch((err) => {
              reject("location not found");
            });
        })
        .catch((err) => {
          reject("location not found");
        });
    });

  }


  clearNotificationTimer() {
    this.notificationTimer = null;
  }

  sendSignout() {
    console.log("Signing out");
    var msg = {
      cmd: 'logout',
      location: "-,-"
    };
    return this.commsService.sendMessage(msg, false, false);
  }
}
