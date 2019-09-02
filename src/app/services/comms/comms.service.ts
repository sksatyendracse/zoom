import { Injectable } from '@angular/core';
import { Network } from '@ionic-native/network/ngx';
import { NetworkInterface } from '@ionic-native/network-interface/ngx';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { Device } from '@ionic-native/device/ngx';
import { Zeroconf } from '@ionic-native/zeroconf/ngx';

import { LoadingService } from '../loading/loading.service';
import { DeviceService } from '../device/device.service';
import { StorageService } from '../storage/storage.service';
import { AlertErrorHandlerService } from '../alertErrorHandler/alert-error-handler.service';

import { Netmask } from 'netmask';

import * as _ from 'lodash';

import { localeData } from 'moment';
import { Events } from '@ionic/angular';
import { TimeAdjustService } from '../timeAdjust/time-adjust.service';

@Injectable({
  providedIn: 'root'
})
export class CommsService {

  public lastRefresh: number = null;

  constructor(
    private network: Network,
    private networkinterface: NetworkInterface,
    private appVersion: AppVersion,
    private device: Device,
    private zeroconf: Zeroconf,
    private loadingService: LoadingService,
    private deviceService: DeviceService,
    private storage: StorageService,
    private alertErrorHandlerService: AlertErrorHandlerService,
    private events: Events,
    private timeAdjust: TimeAdjustService
    ) {}

  public saveSubscriberId(id: string): void {
    this.localsubs = id;
  }


  /**
   *
   * @param objectID  the ID of the object from the object_map table
   * @param thumbnail whether or not to request the thumbnail version
   *
   */
  public objectURI(objectID:number, thumbnail:boolean = false) {
    var ret = this.serviceURL +
      "?cmd=getObject&token=" + this.token +
      "&subscriberID=" + this.subscriberID +
      "&objectID=" + objectID;
    if (thumbnail) {
      ret += "&thumb=1";
    }
    return ret;
  }

  public getObjectURL(file:string = "") {
    if (!file) {
      file = "";
    }
    return this.objectURL + file;
  }

  public setObjectURL(subInfo:any) {
    let h = this.serviceHost ? this.serviceHost : 'http://10.150.72.130';
    if (h === this.backendHost && !subInfo.extObjectURL) {
      // we have a subscriber ID and we are hitting the backend...
      // the path is something weird
      let dir = subInfo.subscriberID;
      dir = ("00000" + dir).slice(-6);
      this.objectURL = h + '/objects/sub' + dir + '/';
    } else {
      if (subInfo.extObjectURL) {
        this.objectURL = subInfo.extObjectURL;
      } else {
        this.objectURL = h + '/objects/';
      }
    }
  }

  // interesting variables

  public objectURL: string = null;

  // list of potential gateways to test
  gateways: any = [
    "172.24.1.1",
    "10.248.100.10",
    "10.150.72.130",
    "192.168.101.2",
    "10.53.80.14"
  ];

  backendHost = "https://db1.corvexconnected.com/";
  initialServicePath = "scripts/corvex.cgi";
  // gatewayHost: "http://172.24.1.1:88/",
  altGatewayHost = "http://172.24.1.1/";
  servicePath = "scripts/corvex.cgi";
  uploadPath = "scripts/uploadObject.cgi";
  serviceHost: any;
  serviceURL: any;
  serviceAddr: any;
  networkAvailable: boolean;
  noAuthHandler: any;
  messageID = 0;
  usingGateway: boolean;
  usingDirect: boolean;
  usingZeroconf: boolean;
  localsubs: any;
  subscriber: any;
  lastServiceURL: any;
  lastServiceHost: any;
  lastServicePath: any;
  lastServiceAddr: any;
  lastIPAddr: any;     // when we know our IP address, put it in here
  lastSubnet: any;
  lastNetworkType: any;
  discoverGateway: boolean;
  logMessages: boolean;
  logUpdates: boolean = false;
  mySubnet: any;
  version: string;
  token = null;
  myAddress = null;

  gatewayWaitSeconds = 15;

  subscriberID : number = null;

  // message queue
  mQueue: any = [];

  // active requests
  activeRequests: any = {};

  waiting: boolean = false;

  zcInitialized: boolean = false;

/**
   * determineURL - figure out the URL of the backend
   *
   * @param {Boolean} [ force ] - force the determination
   *
   * If the local IP address is known, and is in our well known address family
   * for CORVEX networks, then just use the gateway address
   *
   * If we already had a gateway, and are just re-connecting, then attempt
   * to use that before doing anything else.  It should just work.
   *
   * @returns {Promise} that resolves when the URL is discovered or rejects if it cannot be.
   */

  determineURL(force: boolean = false): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!force && !this.networkAvailable) {
        reject("No network");
      } else {
        if (force) {
          this.serviceURL = null;
          this.serviceAddr = null;
        }

        var firstCheck = [];
        var g = [];

        this.getIPAddress()
          .then((addr: any) => {

            var checkAllGateways = () => {
              let start = Date.now();
              if (this.gateways.length) {
                $.each(this.gateways, (idx, gw) => {
                  g.push(this.tryHost(gw));
                });
              }
              // do the mDNS thing anyway
              if (this.discoverGateway) {
                g.push(this.gatewaySearch(true));
              }
              Promise.all(g)
                .then(() => {
                  if (this.serviceURL) {
                    // did we find one?
                    this.rememberNetwork();
                    resolve(this.serviceURL);
                  } else {
                    let end = Date.now()
                    // how long have we already been sitting here?
                    let interval = (end - start)/1000;

                    // set an interval timer that looks for the gateway for a while
                    // if the counter expires and there is still no gateway, bail out

                    var gatewayCheckCounter = this.discoverGateway ? this.gatewayWaitSeconds : 1;
                    if (gatewayCheckCounter > 1) {
                      gatewayCheckCounter -= interval;
                    }
                    console.log("after looking for dedicated gateways we didn't see any - let's give mDNS a chance");

                    var gwTimer = window.setInterval(() => {
                      if (!this.serviceURL && gatewayCheckCounter-- <= 0) {
                        console.log("Failed to find a gateway via mDNS");
                        window.clearInterval(gwTimer);
                        reject("Failed to find a gateway automatically");
                      } else if (this.serviceURL) {
                        window.clearInterval(gwTimer);
                        console.log("We already have a serviceURL - no need to hunt for the dedicated corvex gateway");
                        resolve(this.serviceURL);
                      } else {
                        console.log("still watching for a service");
                      }
                    }, 1000);
                  }
                });
            };
            // are we still on the same network as before?  And did we have a
            // target on that network?

            let nm = new Netmask(addr.ip, addr.subnet);
            this.mySubnet = nm.base;

            // if the network matches, look for the old gateway
            if (this.lastSubnet && this.lastSubnet === this.mySubnet) {
              // we have the same IP address or subnet
              if (this.lastServiceAddr) {
                console.log('trying last known service addr ' + this.lastServiceAddr);
                // try to talk to whatever we talked to before
                firstCheck.push(this.tryHost(this.lastServiceAddr));
              } else {
                console.log('same subnet but no saved gateway');
              }
            } else {
              console.log('new network - we need to look around');
            }

            // capture the current config
            this.lastIPAddr = this.myAddress = addr.ip;
            this.lastSubnet = this.mySubnet;
            this.lastNetworkType = this.network.type;

            if (firstCheck.length) {
              Promise.all(firstCheck)
                .then(() => {
                  if (this.serviceURL) {
                    // did we find one?
                    this.rememberNetwork();
                    resolve(this.serviceURL);
                  } else {
                    checkAllGateways();
                  }
                })
            } else {
              checkAllGateways();
            }
          })
        .catch((err) => {
          reject("Failed to get an IP address");
        });
      }
    });
  }

  /**
   *
   * @param addr address to check
   */
  tryHost(addr: string): Promise<any> {
    return new Promise((resolve, reject) => {
      var props = {
        url: "http://" + addr + "/" + this.servicePath,
        method: "GET",
        timeout: 10000,
        parse: true
      };
      this._fetch(props)
        .then((ret) => {
          // we got a positive hit - capture everything about it
          if (!this.serviceAddr) {
            this.lastServiceAddr = this.serviceAddr = addr;
            this.lastServiceHost = this.serviceHost = "http://" + addr + "/";
            this.lastServiceURL = this.serviceURL = this.serviceHost + this.servicePath;
            this.usingGateway = true;
            this.usingDirect = false;
            resolve(addr);
          } else {
            console.log('got another hit after already finding a service address - ignoring');
            resolve(false);
          }
        })
        .catch((err) => {
          resolve(false);
        });
    });
  }

  /**
   * tryBackend - attempt a direct connection to the backend
   *
   * @returns <Promise> that resolves with a service URL and rejects if the backend cannot be reached.
   */
  tryBackend():Promise<string> {
    return new Promise((resolve, reject) => {

      // wait 10 seconds then send a request to the backend
      let propsb = {
        url: this.backendHost + this.initialServicePath,
        method: "GET",
        parse: true
      };

      this.checkConnection();

      console.log("Looking for the backend");
      this._fetch(propsb).then(() => {
        if (!this.serviceURL) {
          this.serviceURL = this.backendHost + this.initialServicePath;
          this.serviceHost = this.backendHost;
          this.usingGateway = false;
          this.usingDirect = true;
          console.log("Found the backend - talking to it");
          this.storage.remove('network');
          resolve(this.serviceURL);
        }
        }).catch(() => {
          reject("Failed to connect to backend");
        });
    });
  };

  // communication methods
  /**
   * sendMessage - send a message to the service
   *
   * @param {Object} message
   * @param {Boolean} canQueue
   * @param {Boolean} showLoading
   * @param {Boolean} showError
   *
   * @returns {Promise}
   */
  sendMessage(message: any, canQueue?:boolean, showLoading: boolean = false, showError: boolean = false): Promise<any> {
    if (canQueue === undefined) {
      canQueue = false;
    }
    let theRequest = null;
    let messageID = null;
    let d: any = new Promise((resolve, reject) => {

      let fp = null;  // handle for the fetch promise, if any
      if (message && typeof message === 'object') {
        // populate the message with metadata
        if (!message.hasOwnProperty("sendTime")) {
          message.sendTime = this.timeAdjust.currentTime();
        }
        if (!message.version && this.version) {
          message.version = this.version;
        }
        if (!message.deviceID && typeof this.device === "object" && this.device.uuid) {
          message.deviceID = this.device.uuid;
        }
        if (!message.UserToken && this.token) {
          message.UserToken = this.token;
        }
        if (!message.token && this.token) {
          message.token = this.token;
        }

        if (message.cmd === "initialize") {
          // delete message.subscriberID;    // initialize should never be sent a subscriberID
        } else
          if (message.cmd !== "authenticate" && !message.subscriberID && this.subscriberID) {
            message.subscriberID = this.subscriberID;
          }
        message.commsMsgID = this.messageID++;

        if (this.logMessages && message.cmd !== "update" /* ||(app && app.logBeacons)*/) {
          console.log('debug', "Sending cmd " + message.cmd + ": ", message);
        }

        this.checkConnection();

        if (this.networkAvailable) {
          let props = {
            url: this.serviceURL,
            method: "POST",
            data: message,
            style: "FORM",
            parse: true
          };

          if (showLoading) {
            if (this.logMessages) {
              console.log('debug', "called with spinner");
            }
            this.loadingService.enable();
          }
          if (message.cmd === 'update' && this.logUpdates) {
            console.log('debug', 'Started sending an update command');
          }
          fp = this._fetch(props);
          const st = Date.now();
          // remember this one
          this.activeRequests[message.commsMsgID] = fp.theRequest;
          // we have an open request
          this.waiting = true;

          fp.then((data) => {
            const elapsed = Date.now() - st;
            // it completed
            if (message.cmd === 'update' && this.logUpdates) {
              console.debug('Finished sending an update command after ' + elapsed + " ms");
            }
            delete this.activeRequests[message.commsMsgID];
            if (Object.keys(this.activeRequests).length === 0) {
              this.waiting = false;
            }
            if (showLoading) {
              this.loadingService.disable();
            }
            if (this.logMessages) {
              console.log('debug', "response received: " + JSON.stringify(data));
            }
            if (this.noAuthHandler) {
              // look at the response...
              if (data.reqStatus === "NoAuth") {
                console.log("User not authenticated and we have a noAuth handler");
                this.noAuthHandler(data);
                reject("NoAuth");
              } else {
                resolve(data);
              }
            } else {
              resolve(data);
            }
          })
          .catch((err) => {
            if (showError) {
              this.alertErrorHandlerService.show();
            }
            delete this.activeRequests[message.commsMsgID];
            if (Object.keys(this.activeRequests).length === 0) {
              this.waiting = false;
            }
            console.log("Send failed: " + JSON.stringify(err) + "; original message was " + JSON.stringify(message));
            // the ajax send failed - remember this message
            this.loadingService.disable();
            if (canQueue) {
              this.mQueue.push(message);
              reject("queued");
            } else {
              reject(err);
            }
          });
        } else {
          if (canQueue) {
            this.mQueue.push(message);
            reject("queued");
          } else {
            reject("noNetwork");
          }
        }
      } else {
        reject("noMessage");

      }
      if (fp && fp.theRequest) {
        theRequest = fp.theRequest;
        messageID = this.messageID;
      }
    });
    d.theRequest = theRequest;
    d.messageID = messageID;
    return d;
  };

  /**
   * clearRequests - abort all requests in the activeRequests list
   *
   */
  clearRequests() {
    if (Object.keys(this.activeRequests).length > 0) {
      $.each(this.activeRequests, (messageID, xhr) => {
        if (xhr) {
          try {
            xhr.abort();
          } catch (err) {
            console.log("abort failed: ", err);
          }
        }
        delete this.activeRequests[messageID];
      });
      this.waiting = false;
    }
  };

  cancelRequest(messageID) {
    if (this.activeRequests && this.activeRequests[messageID]) {
      var xhr = this.activeRequests[messageID];
      if (xhr) {
        try {
          xhr.abort();
        } catch (err) {
          console.log("abort failed: ", err);
        }
      }
      delete this.activeRequests[messageID];
      if (Object.keys(this.activeRequests).length === 0) {
        this.waiting = false;
      }
    }
    return;
  };

  // queue mutex lock
  _sendingFromQueue: boolean = false;

  sendQueue() {
    "use strict";
    if (!this._sendingFromQueue && this.networkAvailable && this.mQueue.length) {
      this._sendingFromQueue = true;
      var local = this.mQueue.slice(0);
      this.mQueue = [];
      this.sendMessage(local, null, null)
        .then((res) => {
          // done sending; release the lock
          this._sendingFromQueue = false;
        })
        .catch((e) => {
          // it failed - push everything back onto the (top) of the queue
          this.mQueue.unshift(local);
          // release the lock
          this._sendingFromQueue = false;
        });
    }
    return;
  };

  // _fetch - return a promise after sending data
  //
  // Resolves with the returned information in a structure
  // including:
  //
  // xhr - a raw xhr object
  // headers - an array of headers sent in the request
  // status - the status code
  // statusText - the text of the return status
  // text - raw returned data
  // body - an object parsed from the returned content
  // style - the style for POSTed objects (default JSON)
  //

  _fetch(props) {
    'use strict';
    let theObject = this;
    if (props.method === null || props.method === undefined) {
      props.method = "GET";
    }
    if (props.parse === null || props.parse === undefined) {
      props.parse = true;
    }
    if (props.headers === null || props.headers === undefined) {
      props.headers = [];
    }
    if (props.style === null || props.style === undefined) {
      props.style = "JSON";
    }

    var xhr;
    var d: any = new Promise((resolve, reject) => {

      xhr = new XMLHttpRequest();

      // this gets returned when the request completes
      var resp = {
        xhr: xhr,
        headers: null,
        status: 0,
        statusText: "",
        body: null,
        text: "",
        reqStatusText: "",
        reqStatus: "",
        result: null
      };

      var theTimer = null;

      if (props.timeout) {
        theTimer = window.setTimeout(() => {
          theTimer = null;
          xhr.abort();
          reject("timeout");
        }, props.timeout);
      }

      xhr.open(props.method, props.url);

      // headers?
      props.headers.forEach((ref) => {
        xhr.setRequestHeader(ref[0], ref[1]);
      });

      if (props.style === "FORM") {
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      }

      xhr.onerror = function (theError) {
        if (theTimer) {
          window.clearTimeout(theTimer);
          theTimer = null;
        }
        if (this.status) {
          resp.status = this.status;
          resp.statusText = xhr.statusText;
        } else if (this.status === 0) {
          resp.status = 0;
          resp.statusText = "No response from server";
          console.log("this implies no network connection");
        }
        reject(resp);
      };

      xhr.onload = function (theResult) {
        if (theTimer) {
          window.clearTimeout(theTimer);
          theTimer = null;
        }
        resp.status = this.status;
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.response;
          // return the raw text of the response
          resp.text = data;
          // we have it; what is it?
          if (props.parse) {
            try {
              data = JSON.parse(data);
              if (data && data.result) {
                resp.result = data.result;
              } else {
                resp.result = data;
              }
              if (data && data.status) {
                resp.reqStatus = data.status;
                resp.reqStatusText = data.statusText;
                if (resp.reqStatus !== "OK") {
                  if (resp.reqStatus === "CACHEVALID") {
                    // console.log("CACHEVALID: Request was ", props, "; Server says ", data);
                  } else {
                    console.log("ERROR: Request was ", props, "; Server says ", data);
                  }
                }
              }
            }
            catch (err) {
              resp.result = null;
            }
          }
          resolve(resp);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };

      if (props.data !== null && props.data !== undefined) {
        if ("object" === typeof (props.data)) {
          if (props.style === "JSON") {
            xhr.send(JSON.stringify(props.data));
          } else if (props.style === "FORM") {
            // xhr.send($.param(props.data));
            var f = "";
            Object.keys(props.data).forEach(function (key) {
              f += key + '=' + props.data[key] + "&";
            });
            xhr.send(f);
          }
        } else if ("function" === typeof (props.data)) {
          xhr.send(props.data());
        } else if ("string" === typeof (props.data)) {
          xhr.send(props.data);
        }
      } else {
        xhr.send();
      }
    });
    d.theRequest = xhr;
    return d;
  };

  gatewaySearch(init: boolean): Promise<boolean> {
    var zc = this.zeroconf;
    return new Promise((resolve, reject) => {
      var register = () => {
        // console.log("reInit succeeded - starting zeroconf");
        zc.registerAddressFamily = 'ipv4'; // or 'ipv6' ('any' by default)
        zc.watchAddressFamily = 'ipv4'; // or 'ipv6' ('any' by default)

        // set up to watch for our workstation
        zc.watch('_http._tcp.', 'local.').subscribe(result => {
          let action = result.action;
          let service = result.service;
          if (action == 'added') {
            // console.log('service added', service);
          } else if (action == 'resolved') {
            // console.log('service resolved', service);
            if (service.name.match(/^Corvex Gateway/)) {
              var addr = null;
              $.each(service.ipv4Addresses, function (i, val) {
                if (!val.match(/^169/) && !val.match(/^127/)) {
                  addr = val;
                  return false;
                }
              });
              if (addr && !this.serviceURL) {
                // we found a local address...  use it
                var p = this.servicePath;
                if (service.txtRecord && service.txtRecord.hasOwnProperty("path")) {
                  p = service.txtRecord.path;
                }
                this.serviceAddr = addr;
                this.serviceHost = 'http://' + addr + '/';
                this.serviceURL = 'http://' + addr + '/' + this.servicePath;
                this.lastServiceHost = this.serviceHost;
                this.lastServiceURL = this.serviceURL;
                this.lastServiceAddr = addr;
                this.usingGateway = true;
                this.usingZeroconf = true;
                this.rememberNetwork();
                console.log('found a Corvex Gateway service', service);
              } else if (this.serviceURL && addr && this.serviceHost !== 'http://' + addr + '/') {
                console.log("Found a Corvex Gateway service, but we already have a URL: " + this.serviceURL);
              }
            }
          } else {
            console.log('service removed', service);
          }
        }, function (err) {
          console.log("watch failed: " + err);
        });

        // let's do a registration to wake up the network
        if (init) {
          window.setTimeout(() => {
            console.log("starting mDNS registration process");
            resolve(true);
            zc.register('_http._tcp.', 'local.', 'Corvex Core ' + this.myAddress, 8080, { 'service': 'code' })
              .then(result => {
                var action = result.action; // 'registered'
                var service = result.service;
                console.log("finished mDNS registration process");
              })
              .catch(err => {
                console.log("mDNS registration failed: " + err);
              });
          }, 1000);
        } else {
          console.log('zeroconf not initializing - setup complete');
          resolve(true);
        }
      };

      // ensure zeroconf is closed out
      console.log("closing zeroconf");

      const setup = () => {
        if (this.zcInitialized) {
          console.log('debug', 'we are re-initializing.  reset zeroconf');
          zc.reInit()
            .then(() => {
              window.setTimeout(function () {
                console.log('debug', 'finished re-init of zeroconf');
                register();
              }.bind(this), 1000);
            })
            .catch((err) => {
              console.log("reInit failed: " + err);
              reject('zeroconf registration failed');
            });
        } else {
          this.zcInitialized = true;
          register();
        }
      };

      if (this.device.platform === 'Android') {
        zc.close()
          .then(() => {
            console.log('debug', 'closed out zeroconf');
            setup();
          })
          .catch(err => {
            console.log('debug', 'closing zeroconf failed');
            setup();
          });
      } else {
          console.log("on iOS - skipping close step");
          setup();
        }
    });
  }

  stopGatewaySearch() {
    var zc = this.zeroconf;
    zc.unwatch('_workstation._tcp.', 'local.').then(() => zc.close());
  }

  /**
   *
   * @param serverURL - URL to check
   * @param servicePath - path on the server to check against
   * @param activate - optional boolean that indicates this URL should be activated if it responds. Defaults to false.
   *
   * returns a Promise that resolves with a boolean indicating whether the server was available.
   */

  pingServer(serverURL:string, servicePath:string, activate:boolean = false): Promise<boolean> {
    return new Promise((resolve, reject) => {

      var request = {
        url: serverURL + servicePath,
        timeout: 2000,
        method: "GET",
        parse: true
      };

      this._fetch(request)
        .then(ret => {
          if (activate) {
          this.serviceURL = serverURL + servicePath;
          this.lastServiceHost = this.serviceHost = serverURL;
          }
          resolve(true);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  checkConnection(): void {
    if (this.networkAvailable) {
      // we think the network is up - is it?
      if (this.network.type === 'none') {
        // hmm - network seems to be down.
        this.events.publish('ccs:offline');
      }
    } else {
      if (this.network.type !== 'none') {
        // network is available again!
        this.events.publish('ccs:online');
      }
    }
  }

  networkChanged():Promise<boolean> {
    return new Promise(resolve => {
      if (this.network.type !== this.lastNetworkType) {
        resolve(true);
      } else {
      this.getIPAddress()
      .then(network => {
        if (!network) {
          resolve(true);
        } else {
          let nm = new Netmask(network.ip, network.subnet);
          let sn = nm.base;
          if (sn === this.lastSubnet) {
            // we probably are NOT on a new network
            resolve(false);
          } else {
            resolve(true);
          }
        }
      })
      .catch(err => {
        console.log("failed to get IP address: " + JSON.stringify(err));
        resolve(true);
      });
    }
    });
  }

  getIPAddress():Promise<any> {
    return new Promise((resolve) => {
      if (this.network.type === 'wifi') {
        this.networkinterface.getWiFiIPAddress().then(addr => {
          let nm = new Netmask(addr.ip, addr.subnet);
          console.log("IP Address is " + addr.ip + "; subnet is " + addr.subnet + "; base is "+nm.base);
          resolve({
            ip: addr.ip,
            subnet: addr.subnet
          });
        }).catch(err => {
          console.log("Fetch of IP address failed: " + JSON.stringify(err));
          resolve(null);
        });
      } else {
        resolve({ ip: "127.0.0.1", subnet: "255.255.255.0"});
      }
    });
  };

  /**
   * reset - reset the comms object to baseline
   *
   * Puts things back to initial state on signout.
   *
   */
  reset() {
    if (!this.usingGateway) {
      this.serviceURL = this.backendHost + this.initialServicePath;
      this.objectURL = null;
    }
    this.token = null;
  }

  rememberNetwork() {
    if (this.usingGateway) {
      this.storage.set('network', JSON.stringify(
        {
          serviceaddr: this.serviceAddr,
          servicehost: this.serviceHost,
          servicepath: this.servicePath,
          serviceurl: this.serviceURL,
          subnet: this.mySubnet
        })
      )
    } else {
      this.storage.remove('network');
    }
  }

  /**
   * initialize - initialize the communication module
   *
   * @param {Object} [params] - tuning parameters
   * @param {function} [params.noAuth] - callback to call when there the session is not authorized.
   * @param {string}   [params.backendHost] - optional URL to the backend (for the web app)
   * @param {boolean}   [params.discoverGateway] - flag that indicates the module should use zeroconf to search for a gateway
   * @param {string}   [params.servicePath] - the path to the web service
   * @param {string}   [params.endpoint] - the URL of the backend web service
   */

  initialize(params) {
    if (params) {
      if (params.noAuth) {
        // function to call when there is an authentication problem
        this.noAuthHandler = params.noAuth;
      }
      if (params.servicePath) {
        this.servicePath = params.servicePath;
      }
      if (params.endpoint && params.endpoint !== "") {
        this.backendHost = params.endpoint;
      }
      if (params.discoverGateway && this.zeroconf) {
        // set up a zeroconf listener
        this.discoverGateway = true;
        // this.gatewaySearch( true );  // initialize the services
      }
      if (params.backendHost) {
        this.backendHost = params.backendHost;
      }
      this.logMessages = _.get(params, "debug", false);
    }

    this.appVersion.getVersionNumber().then((version: string) => {
      this.version = version;
    });

    this.network.onConnect().subscribe((msg) => {
      // we seem to have connected
      this.checkConnection();
    });
    this.network.onDisconnect().subscribe((msg) => {
      this.checkConnection();
    });

    // determine if we are in a native environment or not...
    // if not, then set serviceURL to backendURL and move on
    //commenting out to reach the backend directly.
    if (window.cordova === undefined) {
      this.serviceURL = this.backendHost + this.servicePath;
      this.usingDirect = true;
    } else {
      this.usingGateway = false;
      this.usingDirect = false;
      this.serviceURL = null;
      if (this.deviceService.isBlackView()) {
        let item = this.storage.get('network');
        if (item) {
          console.log("retrieved a remembered network configuration");
          this.lastServiceAddr = item.serviceaddr;
          this.lastServiceHost = item.servicehost;
          this.lastServicePath = item.servicepath;
          this.lastServiceURL = item.serviceurl;
          this.lastSubnet = item.subnet;
        }
      }
    }
    this.messageID = 0;
  };
}
