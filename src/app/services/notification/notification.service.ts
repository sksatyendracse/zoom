import { Injectable } from '@angular/core';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { NativeAudio } from '@ionic-native/native-audio/ngx';

import { DeviceService } from '../device/device.service';

import * as _ from 'lodash';

export enum NotificationType {
  Modal = 'modal',
  Toast = 'toast',
  Passive = 'passive'
}

export enum NotificationSource {
  ErgoTempPlugin = 'plugin:ergo-temp'
}

export enum NotificationPriority {
  Low = 'low',
  Lower = 'normal',
  Warning = 'warning',
  Critical = 'critical',
  Emergency = 'emergency',
  Resolved = 'resolved',
  Pending = 'pending',
  Negative = 'negative',
  Positive = 'positive',
  Neutral = 'neutral'
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(
    private localNotifications: LocalNotifications,
    private device: DeviceService,
    private audio: NativeAudio,
  ) {}

  public canSendNotifications: boolean = false;

  clearAll() {
    this.localNotifications.clearAll();
  }

  postNotification(notice) {
    let id = notice.id;

    if (this.canSendNotifications) {
      this.localNotifications.isPresent(id)
      .then((val) => {
        if (val) {
          this.localNotifications.update(notice);
        }
        else {
          this.localNotifications.schedule(notice);
        }
      })
      .catch(err => {
        console.log('isPresent failed: ' + JSON.stringify(err));
      });
    }

    if(this.device.isBlackView() && notice.sound) {
      let f = notice.sound;
      f = f.replace(/^file:\/\//, '');
      let l = f;
      l = l.replace(/^.*\//, '');
      // there was a sound and we are on a blackview.  can we play it?
      this.audio.preloadComplex(l, f, 1, 1, 0)
      .then(() => {
        this.audio.play(l)
        .then(() => {
          console.log("played sound " + f);
        })
        .catch((err) => {
          console.log("error", "failed to play sound " + f + ": " + err);
        })
      })
      .catch((err) => {
        console.log("failed to preload " + f + ": " + err);
        this.audio.play(l)
        .then(() => {
          console.log("played sound " + f);
        })
        .catch((err) => {
          console.log("error", "failed to play sound " + f + ": " + err);
        })
      });
    }
  }

  public getIcon(notification: any): string {
    let iconUrl: string = '/assets/icons/notificationIcon.svg';

    if (_.get(notification, 'source') === NotificationSource.ErgoTempPlugin) {
      const source: string = '/assets/images/plugins/temperature-sensor';

      if (notification.priority === NotificationPriority.Low) {
        iconUrl = `${source}/notification-worktemp-minimal.svg`;
      } else if (notification.priority === NotificationPriority.Lower) {
        iconUrl = `${source}/notification-worktemp-lower.svg`;
      } else if (notification.priority === NotificationPriority.Warning) {
        iconUrl = `${source}/notification-worktemp-moderate.svg`;
      } else if (notification.priority === NotificationPriority.Critical) {
        iconUrl = `${source}/notification-worktemp-high.svg`;
      } else if (notification.priority === NotificationPriority.Emergency) {
        iconUrl = `${source}/notification-worktemp-extreme.svg`;
      }
    } else {
      if (notification.subtype === 'escalated') {
        iconUrl = '/assets/icons/taskIcon.svg';
      } else if (notification.subtype === 'compliment') {
        iconUrl = '/assets/icons/thumbsUpIcon.svg';
      }
      if (notification.observationType === 'quality'){
        iconUrl = "assets/images/testIcon.svg";
      }
    }

    return iconUrl;
  }

}
