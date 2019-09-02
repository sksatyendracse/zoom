import { Component, OnInit } from '@angular/core';

import { CommsManager } from "../../managers/comms/comms-manager.service";
import { Network} from '@ionic-native/network/ngx';

import { CommsService } from "../../services/comms/comms.service";
import { AppService } from "../../services/app/app.service";
import { StorageService } from "../../services/storage/storage.service";

import { Device } from '@ionic-native/device/ngx';
import { Platform, Events } from '@ionic/angular';
import { CacheService } from '../../services/cache/cache.service';
import { SubscriberService } from '../../services/subscriber/subscriber.service';
import { UserdataService } from '../../services/userdata/userdata.service';
import { NavigationService } from "../../services/navigation/navigation.service";
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { Autostart } from '@ionic-native/autostart/ngx';
import { NotificationService } from '../../services/notification/notification.service';
import { DeviceService } from '../../services/device/device.service';
import { Router } from '@angular/router';

const POSITION_AGE_MAX = 10;
const POSITION_TIMEOUT = 5;

@Component({
  selector: 'app-network-handler',
  templateUrl: './network-handler.component.html',
  styleUrls: ['./network-handler.component.scss']
})
export class NetworkHandlerComponent implements OnInit {
  searching: string = "gateway";

  private handlersInitialized: boolean = false;

  constructor(
    private userData: UserdataService,
    private subscriber: SubscriberService,
    private cache: CacheService,
    private commsManager: CommsManager,
    private commsService: CommsService,
    private appService: AppService,
    private navigationService: NavigationService,
    private device: Device,
    private storageService: StorageService,
    private network: Network,
    private platform: Platform,
    private localNotifications: LocalNotifications,
    private notificationService: NotificationService,
    private autostart: Autostart,
    private deviceService: DeviceService,
    public events: Events,
    private router: Router
  ) { }

  ngOnInit(): void {

    this.platform.ready().then(() => {
      if (this.device.platform !== 'iOS' && this.autostart) {
        if (this.deviceService.isBlackView()) {
          console.log("Enabling autostart mode");
          this.autostart.enable();
        } else {
          this.autostart.disable();
        }
      }
     
      if (this.network.type !== 'none') {
        this.commsService.networkAvailable = true;
      }

      /*
      if (this.diagnostic) {
        this.diagnostic.requestLocationAuthorization("when_in_use").then(ret => {
          console.log("Location success is " + JSON.stringify(ret));
          this.appService.gpsEnabled = true;
        }).catch(err => {
          console.log("Location fail is " + JSON.stringify(err));
          this.appService.gpsEnabled = false;
        });
      }
      */

      if (this.localNotifications) {
        if (this.deviceService.isBlackView()) {
          this.notificationService.canSendNotifications = false;
        } else {
          this.localNotifications.requestPermission()
            .then(result => {
              if (result) {
                this.notificationService.canSendNotifications = true;
              } else {
                this.notificationService.canSendNotifications = false;
              }
            })
        }
      }

    });
  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {
      if (!this.subscriber.initialized) {
        if (this.deviceService.isBlackView()) {
          
        } else {
          this.commsService.initialize({ discoverGateway: true, servicePath: "scripts/corvex.cgi" });
          this.setupNetworkEvents();
          this.handleInitialize();
        }
      }
    });
  }

  handleInitialize() {
    this.commsManager.isReady = false;
    // are we online?
    if (this.network.type !== 'none') {
      if (this.appService.initializing) {
        return;
      }
      this.appService.initializing = true;
      // we have a network
      if (this.network.type === 'wifi') {
        this.searching = 'gateway';
        this.commsService.determineURL(false)
          .then(() => {
            // we are using a gateway
            this.subscriber.initialize().then(() => {
              this.appService.initializing = false;
              this.commsManager.isReady = true;
              this.navigationService.navigate(['/login']);
            })
              .catch((err) => {
                this.appService.initializing = false;
                console.log('sendInitialize failed: ' + err);
                this.navigationService.navigate(['/initFailed']);
              });
          })
          .catch((err) => {
            console.log("couldn't determine gateway URL: " + err);
            this.commsService.serviceURL = null;
            this.searching = 'direct';
            this.commsService.tryBackend()
              .then(() => {
                this.appService.initializing = false;
                this.commsService.networkAvailable = true;
                this.commsManager.isReady = true;
                this.navigationService.navigate(['/login']);
              })
              .catch((err) => {
                // it failed.    go to that page
                this.appService.initializing = false;
                this.navigationService.navigate(['/backendFailed']);
              });
          });
      } else {
        // we are not on wifi... just go direct
        this.commsService.serviceURL = null;
        this.searching = 'direct';
        this.commsService.tryBackend()
          .then(() => {
            this.appService.initializing = false;
            this.commsService.networkAvailable = true;
            this.commsManager.isReady = true;
            this.navigationService.navigate(['/login']);
          })
          .catch((err) => {
            // it failed.    go to that page
            this.appService.initializing = false;
            this.navigationService.navigate(['/backendFailed']);
          });

      }
    } else {
      this.navigationService.navigate(['/no-network']);
    }
  }

  /**
   * figure out what network we are on, and if we can still reach the same subscriber
   *
   * NOTE: a naive assumption here is that if there is NOT a gateway and we were previously
   * connected directly, then we can still connect directly.
   */
  handleNetworkChange() {
    this.commsService.determineURL(true)
      .then(theServer => {
        this.commsManager.isReady = true;
        this.commsService.sendQueue();
        this.navigationService.navigate(['/site-awareness-landing']);
      })
      .catch(err => {
        // we couldn't make an initial determination.  Probably NOT using a gateway.
        // let's try direct!
        this.commsService.serviceURL = null;
        this.searching = 'direct';
        this.commsService.tryBackend()
          .then(theURL => {
            // we have a link to the backend.  we need to get the subscriber connection information
            this.subscriber.setupSubscriberTargets({ subID: this.subscriber.subInfo.subscriberID })
              .then(subID => {
                if (subID) {
                  this.commsManager.isReady = true;
                  this.commsService.sendQueue();
                  this.navigationService.navigate(['/site-awareness-landing']);
                } else {
                  // couldn't reach the old subscriber... just log me out
                  this.appService.doSignout("/signedout");
                }
              })
          })
          .catch(err => {
            console.log("Failed to reach anything!");
            this.navigationService.navigate(['/backendFailed']);
          });
      });
  }

  /**
   * we appear to be on the same network.  Can we just reconnect to the service?
   *
   * if we can't just hit the same service we were hitting before, then fall over to
   * handleNetworkCHange
   */
  handleReconnect() {
    this.commsService.pingServer(this.commsService.serviceHost, this.commsService.servicePath, true)
      .then(success => {
        if (success) {
          this.commsService.sendQueue();
          // only change to the home page if we were on the no-network page
          const r = this.router.url;
          if (r.match(/no-network/)) {
            this.navigationService.navigate(['/site-awareness-landing']);
          } else {
            console.log("network reconnected after short outage - continuing");
          }
        } else {
          this.handleNetworkChange();
        }
      })
      .catch(err => {
        this.handleNetworkChange();
      });
  }

  private goingOnline: boolean = false;
  private goingOffline: boolean = false;

  setupNetworkEvents() {
    if (!this.handlersInitialized) {
      this.events.subscribe('ccs:online', () => {
        console.log("got a ccs connect event");
        // wait a second to stabilize
        if (!this.goingOnline) {
          this.goingOnline = true;
          window.setTimeout(() => {
            let state = this.network.type;
            if (state !== 'none') {
              console.log("Got an online event");
              this.goingOnline = false;
              // if we were not initialized let's do a clean startup
              this.commsService.networkAvailable = true;
              this.goOnline();
            } else {
              this.goingOnline = false;
              this.commsService.networkAvailable = false;
            }
          }, 1000);
        }
      });

      this.events.subscribe('ccs:offline', () => {
        // network down might be ephemeral...
        // how long should we wait?
        if (!this.goingOffline) {
          this.goingOffline = true;
          console.log("got an onDisconnect event");
          this.commsService.networkAvailable = false;
          let timeout = 2000;
          if (this.userData.Token) {
            // we are logged in - be a little more tolerant
            timeout = 30000;
          }
          window.setTimeout(() => {
            // is this still disconnected?
            let state = this.network.type;
            this.goingOffline = false;
            if (state === 'none') {
              this.navigationService.navigate(['/no-network']);
            } else {
              this.commsService.networkAvailable = true;
              this.commsService.sendQueue();
            }
          }, timeout);
        }
      });
      this.handlersInitialized = true;
      this.events.subscribe('ccs:goOnline', doIt => {
        this.goOnline();
      });
    }
  }

  goOnline() {
    if (!this.subscriber.subInfo.subscriberID) {
      // we never got set up
      this.navigationService.navigate(['/network-handler']);
    } else {
      if (this.commsService.usingDirect) {
        // this was a direct connection, try just restarting it
        console.log('going back online and we were connected directly');
        this.handleReconnect();
      } else {
        console.log('going back online and we were talking to a gateway');
        this.commsService.networkChanged()
          .then(changed => {
            if (changed) {
              // it was a gateway and we are on a new network
              // figure out what is happening
              this.handleNetworkChange();
            } else {
              // it was a gateway and we are on the same network
              // just reconnect
              this.handleReconnect();
            }
          });
      }
    }
  }


}
