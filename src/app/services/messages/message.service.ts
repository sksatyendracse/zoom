import { Injectable } from '@angular/core';

import { CommsService } from "../comms/comms.service";
import { UserdataService } from '../userdata/userdata.service';
import { VibrateService } from "../vibrate/vibrate.service";
import { DeviceService } from "../device/device.service";
import { SubscriberService } from '../subscriber/subscriber.service';
import { NotificationService } from '../notification/notification.service';

import { Observable, Observer } from 'rxjs/Rx';
import * as _ from 'lodash';

export enum MessageType {
  REMOVALS = 'removals',
  EMERGENCIES = 'emergencies',
  CANCELS = 'cancels',
  MESSAGES = 'message',
  NOTIFICATIONS = 'notifications',
  UPDATES = 'updates'
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {

  private observable: Observable<any>;
  private observableMessageAliases: Map<MessageType, Observable<any>> = new Map();

  private clearTimer: () => void;
  private startTimer: () => void;
  private stopTimer: () => void;

  private updateMessagesCount: () => void;
  private updateNotificationsCount: () => void;

  constructor(
    private userData: UserdataService,
    private comms: CommsService,
    private vibrateService: VibrateService,
    private deviceService: DeviceService,
    private subscriber: SubscriberService,
    private poster: NotificationService
  ) {}

  private messageData = {
    lastRequest: null,
    data: {}
  };

  private sent:any  = [];
  public messages:any = [];
  private emergencies:any  = [];
  public notifications:any = [];
  private byLocation:any = {};

  private MESSAGE_CHECK_INTERVAL  = this.subscriber.HEARTBEAT_TIME ? this.subscriber.HEARTBEAT_TIME * 1000 : 60000;
  private isFetching: boolean = true;

  checkInterval(time?:number) {
    if (time) {
      this.MESSAGE_CHECK_INTERVAL = time;
      this.clearTimer && this.clearTimer();
    }
    return this.MESSAGE_CHECK_INTERVAL;
  }

  clearCache() {

    // buffers
    this.sent = [];
    this.messages = [];
    this.emergencies = [];
    this.notifications = [];

    this.messageData= {
      lastRequest: 1,
        data: { }
    };
    this.isFetching = false;
  };

  /**
   * changeRecipientState - update the state of a message for a recipient
   *
   * @param {integer} messageID - the ID of the message to update
   * @param {string} action - the action that was performed.  One of , "read", "acknowledged", or "removed"
   * @param {boolean} showError - an optional parameter for a case when there is a need to show an error alert
   *
   * @returns {Promise} that resolves after a response is received
   */
  changeRecipientState(messageID, action, showError: boolean = false) {

    let eData = {
      cmd: "setMessageStatus",
      messageID: messageID,
      action: action
    };

    let ref = this.getRecipientInfo(messageID, this.userData.userID);
    if (ref) {
      // this person was a recipient of the message
      // if the action is removed, then take it out of our local cache too
      if (action === "removed") {
        // this was one we had cached
       let theType = this.messageData.data[messageID].type;
        delete this.messageData.data[messageID];
        let bucket = "";

        if (theType === "notification") {
          bucket = "notifications";
          this.updateNotificationsCount && this.updateNotificationsCount();
        } else if (theType === "message") {
          bucket = "messages";
          this.updateMessagesCount && this.updateMessagesCount();
        } else if (theType === "emergency") {
          bucket = "emergencies";
        }

        let idx = null;
        $.each(this[bucket], (i, ID) => {
          if (ID === messageID) {
            idx = i;
            return false;
          }
        });
        if (idx !== null) {
          this[bucket].splice(idx, 1);
        }
      } else {
        ref.state = action;
      }
      // send the update
      return this.comms.sendMessage(eData, false, false, showError);
    } else {
      return Promise.reject(`User is not a recipient for message ${messageID}`);
    }
  };

  /**
   * getMessage - get a reference to a message data
   *
   * @param {integer} messageID - the unique ID for this message
   *
   * @returns {Object} a reference to a message object or null if the message is not available.
   *
   */
  getMessage(messageID) {
    if (messageID && this.messageData && this.messageData.data && this.messageData.data[messageID]) {
      return this.messageData.data[messageID];
    } else {
      return null;
    }
  };

  /**
   * getRecipientInfo - get a recipient object from a message
   *
   * @param {Integer} messageID - a the unique ID of a message
   * @param {Integer} recipientID - a userID of a message recipient
   *
   * @returns {Object} - recipient status
   */

  getRecipientInfo(messageID, recipientID) {
    let ret = null;

    let ref = this.getMessage(messageID);
    if (ref && ref.hasOwnProperty("recipients")) {
      $.each(ref.recipients, (i, r) => {
        if (r.userID === recipientID) {
          ret = r;
          return false;
        }
      });
    }

    return ret;
  };

  private createMessageObservable(): void {
    if (!this.observable) {
      this.observable = new Observable<any>((observer: Observer<any>) => {
        let timer: any;

        let refresh = () => {
          timer = setTimeout(() => {
            if (this.isFetching) {
              this.updateMessages(observer);
            }
            refresh();
          }, this.MESSAGE_CHECK_INTERVAL);
        };

        this.updateMessages(observer);
        refresh();

        this.clearTimer = () => {
          clearTimeout(timer);
          refresh();
        };

        this.stopTimer = () => {
          clearTimeout(timer);
        };

        this.startTimer = () => {
          clearTimeout(timer);
          refresh();
        };
      }).share();
    }
  }

  private createAliasMessageObservable(alias: MessageType, callback): void {
    if (!this.observableMessageAliases.has(alias)) {
      let aliasObservable = new Observable<any[]>((observer: Observer<any[]>) => {
        this.observable.subscribe(res => {
          callback && callback(observer, res);
        });
      }).share();

      this.observableMessageAliases.set(alias, aliasObservable);
    }
  }

  public unread(alias: MessageType): Observable<number> {
    let countAlias: string = `${alias}_count`;

    this.createMessageObservable();
    this.createAliasMessageObservable(<MessageType>countAlias, (observer: Observer<number>, res) => {
      if (this.isNewMessage(res, alias) && this.isFetching) {
        if (alias === MessageType.MESSAGES) {
          let count: number = this.getCachedUnreadCount(alias);
          observer.next(count);

          this.updateMessagesCount = () => {
            let count: number = this.getCachedUnreadCount(alias);
            observer.next(count);
          };
        } else if (alias === MessageType.NOTIFICATIONS) {
          let count: number = this.getCachedUnreadCount(alias);
          observer.next(count);

          this.updateNotificationsCount = () => {
            let count: number = this.getCachedUnreadCount(alias);
            observer.next(count);
          }
        } else {
          observer.next(res[alias].length);
        }
      }
    });

    return this.observableMessageAliases.get(<MessageType>countAlias);
  }

  public getMessages(alias: MessageType): Observable<any[]> {
    this.createMessageObservable();
    this.createAliasMessageObservable(alias, (observer: Observer<any[]>, res) => {
      if (this.isNewMessage(res, alias) && this.isFetching) {
        if (res[alias].length) {
          observer.next(res[alias]);
        }
      }
    });

    return this.observableMessageAliases.get(alias);
  }

  private isNewMessage(res: any, alias: MessageType): boolean {
    let isNew: boolean = false;

    switch (alias) {
      case MessageType.UPDATES:
        if (Object.keys(res[alias]).length >= 0) {
          isNew = true;
        }
        break;
      case MessageType.REMOVALS:
        if (res.didRemove && res[alias].length >= 0) {
          isNew = true;
        }
        break;
      default:
        if (res[alias].length >= 0) {
          isNew = true;
        }
    }
    return isNew;
  }

  private updateMessages(observer: Observer<any>) {
    const params: any = {
      cmd: 'getMessages',
      startTime: this.messageData.lastRequest,
      lastRequest: this.messageData.lastRequest,
      sendTime: Date.now()
    };

    this.comms.sendMessage(params, false, false)
      .then((data) => {
        if (data && data.reqStatus === 'OK') {
          // lists of indices that can be passed to callbacks
          let newEmergencies = [];
          let newCancels = [];
          let newMessages = [];
          let newNotifications = [];

          let updated = {};

          $.each(data.result.messages, (i, mref) => {
            if (mref.hasOwnProperty('object') && mref.object.objectID) {
              mref.object.objectURL = this.comms.objectURI(mref.object.objectID, true);
            }
            // put the message references into the letious structures
            if (this.messageData.data[mref.messageID]) {
              // we already know about this message....
              // if it was an emergency, has the state changed to something interesting?
              if (mref.type === 'emergency' && mref.state === 'canceled') {
                newCancels.push(mref.messageID);
              }
              // remember the new information
              this.messageData.data[mref.messageID] = mref;
              updated[mref.messageID] = mref;
            } else {
              // this is a new message altogether
              this.messageData.data[mref.messageID] = mref;
              if (mref.type === 'emergency') {
                this.emergencies.push(mref.messageID);
                if (mref.state === 'canceled') {
                  newCancels.push(mref.messageID);
                } else {
                  newEmergencies.push(mref.messageID);
                }
              } else if (mref.type === 'notification') {
                let nref = this.getRecipientInfo(mref.messageID, this.userData.userID);
                if (nref) {
                  this.notifications.push(mref.messageID);
                  newNotifications.push(mref.messageID);
                }
              } else if (mref.type === 'message') {
                // this is a message... am I a recipient?
                let rref = this.getRecipientInfo(mref.messageID, this.userData.userID);
                if (rref) {
                  this.messages.push(mref.messageID);
                  newMessages.push(mref.messageID);
                } else {
                  this.sent.push(mref.messageID);
                }
              }
            }
            this.messageData.lastRequest = data.result.timestamp;
          });

          // remove things from local cache
          let didRemove = false;
          $.each(data.result.removals, (i, messageID) => {
            if (this.messageData.data[messageID]) {
              // this was one we had cached
              let theType = this.messageData.data[messageID].type;
              delete this.messageData.data[messageID];
              didRemove = true;
              let bucket = '';

              if (theType === 'notification') {
                bucket = 'notifications';
              } else if (theType === 'message') {
                bucket = 'messages';
              } else if (theType === 'emergency') {
                bucket = 'emergencies';
              }

              let idx = null;
              $.each(this[bucket], (i, ID) => {
                if (ID === messageID) {
                  idx = i;
                  return false;
                }
              });
              if (idx !== null) {
                this[bucket].splice(idx, 1);
              }
            }
          });

          if (this.deviceService.isBlackView()) {
            if (this.isNew(MessageType.MESSAGES, newMessages)) {
              this.vibrateService.vibrateAlert([1000,250,1000,250,1000,250,1000], 60000);
            } else if (this.isNew(MessageType.NOTIFICATIONS, newNotifications)) {
              this.vibrateService.vibrateAlert(5000);
            }
          } else {
            if (this.isNew(MessageType.MESSAGES, newMessages)) {
              this.poster.postNotification( {
                id: 1,
                text: "You have a new message"
              });
            } else if (this.isNew(MessageType.NOTIFICATIONS, newNotifications)) {
              this.poster.postNotification( {
                id: 1,
                text: "You have a new notification"
              });
            }

          }

          observer.next({
            didRemove,
            [MessageType.REMOVALS]: data.result.removals,
            [MessageType.EMERGENCIES]: newEmergencies,
            [MessageType.CANCELS]: newCancels,
            [MessageType.MESSAGES]: newMessages,
            [MessageType.NOTIFICATIONS]: newNotifications,
            [MessageType.UPDATES]: updated
          });
        }
      }).catch((err) => {
      console.log(err);
    });
  }

  public isNew(type: MessageType, ids: number[]): boolean {
    let isNew: boolean = false;

    if (type === MessageType.MESSAGES) {
      let items: any[] = _.filter(this.messageData.data, (item: any) => {
        return item.type === type && _.includes(ids, item.messageID);
      });

      _.each(items, (item: any) => {
        isNew = _.some(item.recipients, (recipient: any) => {
          return recipient.state !== 'read' && recipient.userID === this.userData.userID
        });
        if (isNew) {
          return false;
        }
      });
    } else if (type === MessageType.NOTIFICATIONS) {
      _.each(ids, (notificationId: number) => {
        let notification: any = this.getMessage(notificationId) || {};
        if (notification.recipients && notification.recipients[0] && notification.recipients[0].state !== 'read') {
          isNew = true;
          return false;
        }
      });
    }

    return isNew;
  }

  /**
   * stopPolling - start checking the server for messages
   */
  startPolling() {
    this.isFetching = true;
    if (this.observable) {
      this.startTimer && this.startTimer();
    } else {
      this.createMessageObservable();
      this.startTimer && this.startTimer();
    }
  }

  /**
   * stopPolling - stop checking the server for messages
   */
  stopPolling() {
    this.isFetching = false;
    // also clear the caches
    // buffers
    this.sent = [];
    this.messages = [];
    this.emergencies = [];
    this.notifications = [];

    this.messageData = {
      lastRequest: 0,
      data: {}
    };

    this.stopTimer && this.stopTimer();
  }
  /**
   * findAllMessageThread - Returns all the previous message IDs tied with this mid
   */
  findAllMessageThread(mid) {
    let msgList = [];
    let message = this.getMessage(mid);
    //if this messageExists add to the queue
    if(message)msgList.push(mid);
    // get all the previous messages from the thread.
    if(message.previousMessageID){
      let nextMessage = message.previousMessageID;
      while(nextMessage){
        //push this nextMessage only if we have it in the bucket
        if(this.messageData.data[nextMessage]){
          msgList.push(nextMessage);
        }
        let newMessage = this.getMessage(nextMessage);
        if(newMessage){
          nextMessage = newMessage.previousMessageID;
        }else{
          nextMessage = null;
        }

      }
    }
    if (message.nextMessageID) {
      let anotherMessage = message.nextMessageID;
      while (anotherMessage) {
        if (this.messageData.data[anotherMessage]) { // this should be carried out so that data is returned properly for this nextID
          msgList.push(anotherMessage);
        }
        let tempMessage = this.getMessage(anotherMessage);
        if (tempMessage) {
          anotherMessage = tempMessage.nextMessageID;
        } else {
          anotherMessage = null;
        }
      }
    }
    return msgList.sort(function(a, b){return a-b});
  }

  public getCachedUnreadCount(type: MessageType): number {
    let count = 0;

    if (type === MessageType.MESSAGES) {
      _.each(this.messages, (messageId: number) => {
        if (this.isUnreadMessage(messageId)) {
          count++;
        }
      });
    } else if (type === MessageType.NOTIFICATIONS) {
      _.each(this.notifications, (notificationId: number) => {
        if (this.isUnreadMessage(notificationId)) {
          count++;
        }
      });
    }

    return count;
  }

  public isUnreadMessage(id: number): boolean {
    let messageState: any = this.getRecipientInfo(id, this.userData.userID);
    return messageState && (messageState.state === 'new' || messageState.state === 'delivered');
  }

  public isUnreadChat(id: number): boolean {
    let messageThread: number[] = this.findAllMessageThread(id);
    return _.some(messageThread, (id: number) => this.isUnreadMessage(id));
  }

  /**
   * setMessageThreadAsRead - sets the latest message ID in the thread as read, this will set all the prior message as read
   * @param {array} - messageIDList - the list of message IDs currently being displayed
   */
  public setMessageThreadAsRead(messageIDList: number[]): void {
    let isNeedToMarkMessages: boolean;

    _.each(messageIDList, (messageId: number) => {
      const unreadMessage: any = _.find(this.messageData.data[messageId].recipients, (recipient: any) => {
        return recipient.userID === this.userData.userID && recipient.state !== 'read';
      });

      if (unreadMessage) {
        unreadMessage.state = 'read';

        if (!isNeedToMarkMessages) {
          isNeedToMarkMessages = true;
        }
      }
    });

    if (isNeedToMarkMessages) {
      this.changeRecipientState(+_.last(messageIDList), 'read');
    }
  }

  public createNewMessage(params: any, showError: boolean = false): any {
    let requestObject: any = {
      cmd: 'addMessage',
      type: 'message',
      message: params.text,
      sendTime: Date.now()
    };

    if (params.users && params.users.length) {
      requestObject.users = JSON.stringify(params.users);
    }

    if (params.groups && params.groups.length) {
      requestObject.groups = JSON.stringify(params.groups);
    }

    if (params.objectID) {
      requestObject.objectID = params.objectID;
    }

    return this.comms.sendMessage(requestObject, false, true, showError).then((res) => {
      this.messages.push(res.result.messageID);
      this.messageData.data[res.result.messageID]= res.result;

      return res.result;
    });
  }

  public replyToMessage(params: any, showError: boolean = false): any {
    let requestObject: any = {
      cmd: "addMessage",
      type: "message",
      message: params.text,
      previousMessageID: params.previousMessageID,
      sendTime: Date.now()
    };

    if (params.objectID) {
      requestObject.objectID = params.objectID;
    }

    return this.comms.sendMessage(requestObject, false, true, showError);
  }

}
