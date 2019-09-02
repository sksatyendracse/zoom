import { Injectable } from '@angular/core';
import { CommsService } from '../comms/comms.service';
import { Device } from '@ionic-native/device/ngx';

import * as _ from 'lodash';
import { DeviceService } from '../device/device.service';
import { TimeAdjustService } from '../timeAdjust/time-adjust.service';

@Injectable({
  providedIn: 'root'
})
export class SubscriberService {

  private unitDefaults = {
    'measurement': 'imperial',
    'time' : '12h'
  }

  private preferenceDefaults = {
    'randomSafetyMessage': true,
    'safetyMessageHeader': 'SAFETY FIRST',
    'qualityReceivingFields':  {
      addButton: false,
      data: [{
        type: 'barcode',
        required: false,
        activateNext: false,
        name: 'PO Number',
        value: null
      }]
    },
    'qualityProductionFields': {
      addButton: true,
      data: [{
        type: 'barcode',
        required: true,
        activateNext: false,
        name: 'Job Number',
        value: null,
        canAdd: false,
      },
      {
        type: 'barcode',
        required: false,
        activateNext: false,
        name: 'Part Number',
        value: null,
        canAdd: true
      }]
    }
  }

  public subInfo: any = {
    subscriberID: null,
    subscriberName: "",
    locationID: null,
    locationName: "",
    objectURL: null,
    extObjectURL: null,
    gear: [],
    certifications: [],
    features: {},
    plugins: {},
    units: {}
  }
  private subscriberList: any[] = [];

  private pluginSettings: any = {};

  public HEARTBEAT_TIME: number = 10; // this value is in seconds
  public initialized: boolean = false;
  public lastRefresh: number = 0;

  public locationSelected: number = null;
  public subscriberSelected: number = null;
  public appCurrentVersion:string = null;

  public getUnits(type: string = 'measurement'): string {
    var u = _.get(this.subInfo.units, type, _.get(this.unitDefaults, type));
    return u;
  }

  constructor(
    public commsService: CommsService,
    private device: Device,
    private deviceService: DeviceService,
    private timeAdjust: TimeAdjustService
  ) {}

  clear() {
    if (!this.commsService.usingGateway) {
      this.subInfo = {
        subscriberID: null,
        subscriberName: "",
        locationID: null,
        locationName: "",
        objectURL: null,
        extObjectURL: null,
        gear: [],
        certifications: [],
        features: {},
        plugins: {},
        units: {},
        preferences: {}
      };
      this.locationSelected = null;
      this.subscriberSelected = null;
      this.subscriberList = [];
    }
    this.initialized = false;
  }

  public locationID(): number {
    let num = 0;
    if (this.subInfo.locationID) {
      num = this.subInfo.locationID;
    }
    return num;
  }

  public locationName(): string {
    let name = "UNKNOWN";
    if (this.subInfo.locationID && this.subInfo.locationName) {
      name = this.subInfo.locationName;
    }
    return name;
  }
  public getPreference(name: string): any {
      return _.get(this.subInfo.preferences, name, _.get(this.preferenceDefaults, name, ''));
  }

  public preference(name: string, value?: string) : Promise<string|null> {
    return new Promise((resolve, reject) => {
      const v = _.get(this.subInfo.preferences, name, _.get(this.preferenceDefaults, name, ''));
      if (value === undefined) {
        resolve(v);
      } else {
        this.subInfo.preferences[name] = value;
        const msg = {
          cmd: 'updateSubscriberInfo',
          prefrences: JSON.stringify(this.subInfo.preferences)
        }
        this.commsService.sendMessage(msg, false, false)
        .then((res) => {
          resolve(value);
        })
        .catch((err) => {
          console.log('error updating preferences');
          reject('Subscriber Info Update Failed');
        })
      }
    });
  }

  /**
   * @param feature - the name of a feature
   *
   * Returns true if the feature is enabled, false if it is not.  Defaults
   * to true.
   */
  public usesFeature(feature: string) : boolean {
    if (_.get(this.subInfo, 'features')) {
      if (_.get(this.subInfo.features, feature, 0)) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  /**
   * @param plugin - the name of a plugin
   *
   * Returns true if the subscriber uses this plugin.  Defaults to false.
   */
  public usesPlugin(plugin: string) : boolean {
    if (_.get(this.subInfo, 'plugins')) {
      if (_.get(this.subInfo.plugins, plugin, 0)) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  initialize() {
    console.log("Initializing");
    return new Promise((resolve, reject) => {

      this.appCurrentVersion = this.commsService.version;
      let localTime = Date.now();
      let eData: any = {
        cmd: "initialize",
        version: this.appCurrentVersion,
        deviceID: this.device.uuid,
        sendTime: localTime
      };

      let oldSubid = this.subInfo.subscriberID;
      // clear out our subscriber ID - we are calling initialize
      // this.subInfo.subscriberID = null;
      if (this.commsService.usingGateway) {
        this.commsService.sendMessage(eData, false, false)
          .then((data) => {
            this.initialized = true;
            console.log("got subscriber info via gateway");
            if (this.deviceService.isBlackView() && data.result.hasOwnProperty('timestamp') && data.result.timestamp) {
              let t = data.result.timestamp * 1000;
              this.timeAdjust.offset(t -localTime);
            }
            // we got a response from initialize - remember it
            if (typeof data.result.config === "object") {
              this.lastRefresh = data.result.timestamp;
              this.commsService.lastRefresh = data.result.timestamp;
              this.subInfo = data.result.config;
              if (this.subInfo.hasOwnProperty('heartbeat')) {
                this.HEARTBEAT_TIME = this.subInfo.heartbeat;
                if (this.HEARTBEAT_TIME > 10000) {
                  this.HEARTBEAT_TIME = this.HEARTBEAT_TIME / 1000;   // in case the backend is confused about seconds vs ms
                }
              }
              if (!this.subInfo.hasOwnProperty('features')) {
                this.subInfo.features = {};
              }
              if (!this.subInfo.hasOwnProperty('plugins')) {
                this.subInfo.plugins = {};
              } else {
                // are there plugins that need to be initialized?
                _.each(this.subInfo.plugins, (val, name) => {
                  if (this.locationID && val) {
                    this.updatePluginSettings(name);
                  }
                });
              }
              if (!this.subInfo.hasOwnProperty('units')) {
                this.subInfo.units = {};
              }

              this.commsService.setObjectURL(this.subInfo);
            }
            console.log("subscriber config: " + JSON.stringify(data.result));
            resolve(true);
          })
          .catch((err) => {
            console.log("initialize failed: " + err);
            reject(err);
          });
      } else {
        // we are directly connected
        // we don't send coordinates.
        delete eData.location;

        // if we already have a location, use it
        if (this.locationSelected) {
          eData.locationID = this.locationSelected;
        } else if (this.subInfo.locationID) {
          eData.locationID = this.subInfo.locationID;
        }

        // if the user picked a subscriber
        if (this.subscriberSelected) {
          eData.subscriberID = this.subscriberSelected;
        }
        this.commsService.sendMessage(eData, false, false)
          .then((data) => {
            this.initialized = true;
            console.log("got subscriber info directly");
            if (this.deviceService.isBlackView() && data.result.hasOwnProperty('timestamp') && data.result.timestamp) {
              let t = data.result.timestamp * 1000;
              this.timeAdjust.offset(t - localTime);
            }
            // we got a response from initialize - remember it
            if (typeof data.result.config === "object") {
              this.lastRefresh = data.result.timestamp;
              this.commsService.lastRefresh = data.result.timestamp;
              if (!this.commsService.usingGateway && this.subInfo.extObjectURL) {
                data.result.config.extObjectURL = this.subInfo.extObjectURL;
              }
              this.subInfo = data.result.config;
              if (this.subInfo.hasOwnProperty('heartbeat')) {
                this.HEARTBEAT_TIME = this.subInfo.heartbeat;
                if (this.HEARTBEAT_TIME > 10000) {
                  this.HEARTBEAT_TIME = this.HEARTBEAT_TIME / 1000;   // in case the backend is confused about seconds vs ms
                }
              }
              if (!this.subInfo.hasOwnProperty('features')) {
                this.subInfo.features = {};
              }
              if (!this.subInfo.hasOwnProperty('plugins')) {
                this.subInfo.plugins = {};
              } else {
                // are there plugins that need to be initialized?
                _.each(this.subInfo.plugins, (val, name) => {
                  if (this.locationID && val) {
                    this.updatePluginSettings(name);
                  }
                });
              }
              if (!this.subInfo.hasOwnProperty('units')) {
                this.subInfo.units = {};
              }
              this.commsService.setObjectURL(this.subInfo);
            } else {
              if (oldSubid) {
                this.subInfo.subscriberID = oldSubid;
                console.log("initialize didn't find a location");
                this.commsService.setObjectURL(this.subInfo);
              }
            }
            console.log("subscriber config: " + JSON.stringify(this.subInfo));
            resolve(true);
          })
          .catch((err) => {
            // utils.showPage("initfailed", {
            //   err: err
            // });
            reject(err);
          });
      }
    });

  }

  /**
   * setupSubscriberTargets - set up the endpoints for the selected subscriber
   *
   * @param args an object with optional properties subID and prefix
   * @param args.prefix - the prefix for the person logging in
   * @param args.subID - the subscriberID for the person logging in
   *
   * @returns {Promise} - the subscriberID selected
   *
   * If the args matched a real subscriber, then the commsService parameters are set to point to that subscriber's RESTful access
   */

  setupSubscriberTargets(args: { prefix?:string, subID?:string })  :Promise<number | null> {
    return new Promise<number | null>(resolve => {
      let mySubID = this.subInfo.subscriberID;
      let target = this.commsService.serviceURL;

      if (!this.commsService.usingGateway && args) {
        var eData: any = {
          cmd: "getSubscriberInfo"
        };


        if (args.hasOwnProperty('prefix') && args.prefix) {
          eData.prefix = args.prefix;
        } else if (args.hasOwnProperty('subID') && args.subID) {
          eData.subscriber = args.subID;
        }

        this.commsService.sendMessage(eData).then((data) => {
          if (data.result && data.result.subscribers) {
            $.each(data.result.subscribers, (i, ref) => {
              this.subscriberList[i] = ref;
            });
          }
          $.each(this.subscriberList, (i, ref) => {
            if ((args.prefix && ref.prefix === args.prefix) || (args.subID && ref.subscriberID == args.subID)) {
              mySubID = ref.subscriberID;
              if (ref.url !== '') {
                target = ref.url;
                if (ref.extObjectURL && ref.extObjectURL !== "") {
                  this.subInfo.extObjectURL = ref.extObjectURL;
                } else {
                  this.subInfo.extObjectURL = ref.objectURL ? ref.objectURL : null;
                }
              }
            }
          });
          if (target) {
            // use the subscribers endpoint
            this.commsService.serviceURL = target;
            this.commsService.serviceHost = target.replace(/scripts.*$/, '');
            this.commsService.servicePath = target.replace(/^.*(?=script)/, '');
            this.commsService.setObjectURL(this.subInfo);
          }
          resolve(parseInt(mySubID));
        })
          .catch(() => {
            resolve(null);
          });
      } else {
        this.commsService.serviceURL = target;
        this.commsService.serviceHost = target.replace(/scripts.*$/, '');
        this.commsService.setObjectURL(this.subInfo);
        resolve(parseInt(mySubID));
      }
    });
  }

  public updatePluginSettings(name: string): void {
    let eData: any = {
      cmd: 'getPluginSettings',
      pluginName: name,
      locations: [ this.locationID ]
    };
    this.commsService.sendMessage(eData, false, false)
    .then((data) => {
      // we got a response
      if (data.reqStatus === "OK") {
        // we got the plugin settings
        let s = _.chain(data.result.settings).sortBy([ 'value.rangeTop' ]).value();
        const heatingDegree: string[] = [
          'Minimal',
          'Lower',
          'Moderate',
          'High',
          'Extreme'
        ];

        let steps = [];
        let low = -999;
        for (let i=0; i < s.length; i++) {
          steps[i] = {
            key: heatingDegree[i],
            threshold: s[i].value.threshold,
            title: s[i].value.name,
            points: s[i].value.steps,
            value: {
              max: +s[i].value.rangeTop
            },
            timerLimit: s[i].value.restPeriod
          };
          if (i) {
            steps[i].value.min = +low;
          }
          if (i === (s.length-1)) {
            delete steps[i].value.max;
          }
          low = s[i].value.rangeTop;
        }
        this.pluginSettings[name] = {
          steps: steps,
          lastUpdate: data.result.timestamp
        };
      } else {
        console.log("Failed to get plugin data");
      }
    })
    .catch(err => {
      console.log("plugin setting request failed: " + err);
    });
  }

  public getPluginSettings(name: string): any {
    let settings: any = {};

    if (this.pluginSettings[name]) {
      settings = _.cloneDeep(this.pluginSettings[name]);
    } else {
      console.log('requested settings for a plugin that is not active');
      return;
    }


    if (0 && name === 'ergo-temp') {
      settings = {
        steps: [
          {
            title: 'Minimal',
            value: {
              max: 26.111
            },
            points: [
              [
                { isBold: true, text: 'Drink plenty of water' },
                { text: ', even if you’re not thirsty. Drink 1 cup (8 oz) of water every 15-20 minutes.' }
              ],
              [
                { isBold: true, text: 'Be aware of where shade exists' },
                { text: ' for rest and recovery if needed.' }
              ],
              [
                { isBold: true, text: 'Consider wearing hats and/or sunscreen' },
                { text: ' if necessary.' }
              ]
            ]
          },
          {
            title: 'Lower',
            value: {
              min: 26.111,
              max: 32.778
            },
            points: [
              [
                { isBold: true, text: 'Drink plenty of water' },
                { text: ', even if you’re not thirsty. Drink 1 cup (8 oz) of water every 15-20 minutes.' }
              ],
              [
                { text: 'During prolonged sweating lasting several hours,' },
                { isBold: true, text: ' supplement water with electrolyte solution or sports drink' },
                { text: ' Avoid drinks with high caffeine or sugar.' }
              ],
              [
                { isBold: true, text: 'Seek shade during normal break periods.' }
              ],
              [
                { isBold: true, text: 'Wear hats and/or sunscreen.' }
              ],
              [
                { isBold: true, text: 'Remember the buddy system' },
                { text: ' and look out for signs and symptoms of heat related illness in yourself and other workers.' }
              ]
            ]
          },
          {
            title: 'Moderate',
            value: {
              min: 32.778,
              max: 39.444
            },
            points: [
              [
                { isBold: true, text: 'Drink plenty of water' },
                { text: ', even if you’re not thirsty. Drink 1 cup (8 oz) of water every 15-20 minutes.' }
              ],
              [
                { text: 'During prolonged sweating lasting several hours,' },
                { isBold: true, text: ' supplement water with electrolyte solution or sports drink' },
                { text: ' Avoid drinks with high caffeine or sugar.' }
              ],
              [
                { isBold: true, text: 'Seek shade during normal break periods.' }
              ],
              [
                { isBold: true, text: 'Wear hats and/or sunscreen.' }
              ],
              [
                { isBold: true, text: 'Use cooling PPE' }
              ],
              [
                { isBold: true, text: 'Remember the buddy system' },
                { text: ' and look out for signs and symptoms of heat related illness in yourself and other workers.' }
              ],
              [
                { isBold: true, text: 'Know your location.' }
              ]
            ]
          },
          {
            title: 'High',
            value: {
              min: 39.444,
              max: 46.111
            },
            points: [
              [
                { isBold: true, text: 'Drink plenty of water' },
                { text: ', even if you’re not thirsty. Drink 1 cup (8 oz) of water every 15-20 minutes.' }
              ],
              [
                { text: 'During prolonged sweating lasting several hours,' },
                { isBold: true, text: ' supplement water with electrolyte solution or sports drink' },
                { text: ' Avoid drinks with high caffeine or sugar.' }
              ],
              [
                { isBold: true, text: 'Seek shade during normal break periods.' }
              ],
              [
                { isBold: true, text: 'Wear hats and/or sunscreen.' }
              ],
              [
                { isBold: true, text: 'Remember the buddy system' },
                { text: ' and look out for signs and symptoms of heat related illness in yourself and other workers.' }
              ]
            ]
          },
          {
            title: 'Extreme',
            value: {
              min: 46.111
            }
          }
        ]
      };
    }

    return settings;
  }

}
