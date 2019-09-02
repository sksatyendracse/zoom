import { Injectable } from '@angular/core';

import { CommsService } from "../comms/comms.service";
import { AppService } from "../app/app.service";
import { Device } from '@ionic-native/device/ngx';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { Observable, Observer } from 'rxjs/Rx';
import { NotificationService } from '../notification/notification.service';
import { UserdataService } from '../userdata/userdata.service';
import { SubscriberService } from '../subscriber/subscriber.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  safetyMessages = [
    'About a quarter of workplace injuries are due to overexertion.',
    'Workplace safety programs can reduce injuries by half.',
    'There are nearly 100,000 forklift-related injuries in U.S. workplaces each year.',
    'If you see something that seems unsafe, immediately take steps to protect yourself and those around you.',
    '300,000 people go to the emergency room every year due to eye injuries sustained in the workplace.',
    'Only you can prevent forest fires...and workplace injuries.',
    'Take pride in your safety community every single day.  It starts with you!'
  ];

  notificationTimer;

  constructor(
    private userData: UserdataService,
    private commsService: CommsService,
    private appService: AppService,
    private device: Device,
    private localNotifications : LocalNotifications,
    private notify:NotificationService,
    private subscriber: SubscriberService
  ) {}

  public isUserLogged(): boolean {
    return !!this.userData.Token;
  }

  handleSignin(fData): Observable<boolean> {
    return new Observable<boolean>((observer: Observer<boolean>) => {
      if (this.appService.authenticating || this.userData.Token) {
        console.log("Authentication attempted when already active");
        observer.next(false);
      }
      this.appService.authenticating = true;

      let uname = fData.UserName;
      if(fData.Password ==  null){   //nov-8-18: backend cant process null password, expects empty string
        fData.Password = "";
      }

      let id;

      let args: any = {
        prefix: null,
        subID: null
      };

      if (this.subscriber.subInfo.subscriberID) {
        fData.subscriberID = args.subID = this.commsService.subscriberID = this.subscriber.subInfo.subscriberID;
      } else if (fData.prefix !== '') {
        args.prefix = fData.prefix.toLowerCase();
      }

      this.subscriber.setupSubscriberTargets(args)
        .then(theID => {
          if (theID) {
            fData.subscriberID = this.commsService.subscriberID = this.subscriber.subscriberSelected = theID;
            this.sendAuthenticate(fData).then(() => {
              if (fData.remember) {
                let rememberMeObject = {
                  "flag": 1,
                  "prefix": fData.prefix,
                  "UserName": uname,
                  "Password": fData.Password
                };
                window.localStorage.setItem('userdata', JSON.stringify(rememberMeObject));
              } else {
                window.localStorage.removeItem('userdata');
              }
              this.appService.authenticating = false;
              this.commsService.setObjectURL(this.subscriber.subInfo);

              this.appService.safetyMessage = this.safetyMessages[Math.floor(Math.random() * this.safetyMessages.length)];
              this.appService.doSignin(observer);
          }).catch(() => {
            this.appService.authenticating = false;
            observer.next(false);
            // $("#loginError").popup("open");
          });
        } else {
          // couldn't resolve the subscriber...
          this.appService.authenticating = false;
          observer.next(false);
        }
        });
    });
  }

  sendAuthenticate(data) {
    return new Promise((resolve, reject) => {
      let msg: any = {
        cmd: 'authenticate',
        username: data.UserName,
        password: data.Password,
        deviceModel: this.device.model,
        location: "-,-"
      };

      if (data.subscriberID) {
        msg.subscriberID = data.subscriberID;
      } else if (this.subscriber.subInfo.subscriberID) {
        msg.subscriberID = this.subscriber.subInfo.subscriberID;
      }

      if (data.nfcID) {
        msg.nfcID = data.nfcID;
      }

      this.commsService.sendMessage(msg, false, false)
        .then((data) => {
          if (data.reqStatus === 'OK') {
            // the authentication worked
            this.appService.userInformation = data.result; // saving all the return to userInfo Object

            if (data.result.hasOwnProperty('lastNativeVersion')) {
              this.userData.lastVersion = data.result.lastNativeVersion;
            }
            this.userData.loginTime = Date.now();
            this.userData.Registered = true;
            this.userData.userID = data.result.userID;
            this.userData.Token = data.result.token;
            this.userData.userType = data.result.type;
            this.userData.teams = data.result.teams;
            this.userData.effectiveUserID = null;
            this.userData.effectiveGroupID = null;
            this.commsService.token = data.result.token;
            this.userData.observations = data.result.observations;
            this.appService.setupNoAuthHandler();
            if (data.result.subscriberID !== this.subscriber.subInfo.subscriberID) {
              // the user is from a different subscriber
              this.subscriber.subInfo.subscriberID = this.commsService.subscriberID = data.result.subscriberID;
              this.subscriber.subInfo.subscriberName = data.result.subscriberName;
            }
            this.userData.fullname = data.result.fullname;

            this.commsService.setObjectURL(this.subscriber.subInfo);
            if (data.result.avatarPath) {
              this.userData.fullImagePath = this.commsService.objectURI(data.result.avatarID, true);
            } else {
              var l = "";
              if (data.result.firstname !== "") {
                l = data.result.firstname.substr(0, 1);
              } else if (data.result.lastname !== "") {
                l = data.result.lastname.substr(0, 1);
              }
              if (l !== "" && l.match(/[a-zA-Z]/)) {
                this.userData.fullImagePath = "assets/images/avatars/" + l.toUpperCase() + ".svg";
              }
              else {
                this.userData.fullImagePath = "assets/images/user_icon.png"
              }
            }

            resolve(true);
            this.notify.postNotification({
              id: 1,
              text: "You are logged into the Corvex Connected Safety Network",
              ongoing: true,
              sound: true
            });
          } else {
            // the authentication failed
            reject({
              status: data.reqStatus,
              statusText: "Authentication failed: " + data.reqStatusText
            });
          }
        })
        .catch((err) => {
          reject({
            status: "FAIL",
            statusText: "Communication failed: " + err.status + " " + err.statusText
          });
        });
    });
  }




}
