import { Injectable } from '@angular/core';
import { CommsService } from "../comms/comms.service";
import { promise } from 'selenium-webdriver';
import { SettingsService } from '../settings/settings.service';
import { Observable, Observer } from "rxjs/Rx";
import { SubscriberService } from '../subscriber/subscriber.service';

import * as _ from "lodash";

import { UserdataService } from '../userdata/userdata.service';
import { Events } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private observableGetAccounts: Observable<any>;
  private getObservationCheckInterval  = this.subscriber.HEARTBEAT_TIME ? this.subscriber.HEARTBEAT_TIME * 1000 : 60000;
  private startUpdateObservationTimer: () => void;
  public stopUpdateObservationTimer: () => void;

  constructor(
    private commsService: CommsService,
    private settings: SettingsService,
    private subscriber: SubscriberService,
    private userData: UserdataService,
    private events: Events
  ) { }


  imageURL: any = null;


  /**
  * Data bucket for holding accounts informations for the same subscriber ID as logged in user.
  * @property {array}  accounts.data - array data of user accounts
  * @property {integer} accounts.lastRequest - timestamp of last request sent
  */
  accounts: any = {
    data: [],
    lastRequest: null
  };

  /**
  * Data bucket for holding certifications for the logged in user.
  * @property {array}  certifications.data - array data of user certifications
  * @property {integer} certifications.lastRequest - timestamp of last request sent
  */
  certifications: any = {
    data: [],
    lastRequest: null
  }


  /**
  * Data bucket for holding gear informations for the logged in user.
  * @property {array}  gear.data - array data of user accounts
  * @property {integer} gear.lastRequest - timestamp of last request sent
  */
  gear: any = {
    data: [],
    lastRequest: null
  }


  /**
  * Data bucket for holding teams informations for the  logged in user.
  * @property {array}  teams.data - array data of user accounts
  * @property {integer} teams.lastRequest - timestamp of last request sent
  */
  teams = {
    lastRequest: null,
    data: []
  };

  /**
  * Data bucket for holding roles informations for the  logged in user.
  * @property {array}  roles.data - array data of user accounts
  * @property {integer} roles.lastRequest - timestamp of last request sent
  */
  roles = {
    lastRequest: null,
    data: []
  };

  /**
  * Data bucket for holding locations informations for the  logged in user.
  * @property {array}  locations.data - array data of user accounts
  * @property {integer} locations.lastRequest - timestamp of last request sent
  */
  locations = {
    lastRequest: null,
    data: []
  };

  /**
  * Data bucket for holding beacons informations for the  logged in user.
  * @property {array}  beacons.data - array data of user accounts
  * @property {integer} beacons.lastRequest - timestamp of last request sent
  */
  beacons = {
    lastRequest: null,
    data: []
  };

  beaconsByLocation: any = {};

  gearTypes = {
    lastRequest: 0,
    data: [
      {
        id: "vest",
        description: "Protective Apparel",
        image: "apparel.svg",
        training: "vests.mp4"
      },
      {
        id: "respirator",
        description: "Respiratory Protection",
        image: "respiratory.svg",
        training: "respirator.mp4"
      },
      {
        id: "eyewear",
        description: "Eye & Face Protection",
        image: "eye.svg",
        training: "glasses.mp4"
      },
      {
        id: "fall",
        description: "Fall Protection",
        image: "fall.svg",
        training: "harness.mp4"
      },
      {
        id: "boots",
        description: "Foot Protection",
        image: "foot.svg",
        training: "hhppe.mp4"
      },

      {
        id: "gloves",
        description: "Hand Protection",
        image: "hand.svg",
        training: "gloves.mp4"
      },
      {
        id: "ear",
        description: "Hearing Protection",
        image: "hearing.svg",
        training: "hearing.mp4"
      },

      {
        id: "helmet",
        description: "Head Protection",
        image: "head.svg",
        training: "hhppe.mp4"
      },
      {
        id: "sensor",
        description: "Smart PPE",
        image: "head.svg",
        training: "hhppe.mp4"
      },
    {
      id: "sensor",
      description: "Smart PPE",
      image: "head.svg",
      training: "hhppe.mp4"
    }
    ]
  };



  accountsRequest: any = null; // Stores the last request time to cache the requests

  public getAccounts() {
    return new Promise((resolve, reject) => {
      var when = Date.now();

      var retVal = false;
      this.commsService.sendMessage({ cmd: "getUsers", includeDisabled: 1, includeShared: 1, lastRequest: this.accounts.lastRequest, sendTime: when, endTime: 2000000000,  }, false, false).then(data => {
        if (data && data.reqStatus === "OK") {
          this.accounts.data = data.result.users;
          if (this.userData.userID) {
            this.userData.handleAccountData(this.getAccount(this.userData.userID));
          }
          retVal = true;
        }else{
          retVal = false;
        }
        this.accounts.lastRequest = data.result.timestamp;
        resolve(retVal);
      }).catch(function (err) {
        reject(err);
      });
    });
  }

  //making observables for accounts, required at listing page where users get added/removed frequently
  //making updateObservation observable
  observableUpdateObservation(): Observable<any> {
    if (!this.observableGetAccounts) {
      this.observableGetAccounts = new Observable<any>((observer: Observer<any>) => {
        let timer: any;

        let refresh = () => {
          timer = setTimeout(() => {
            this.getAccounts().then((data) => {
              observer.next(data);
              refresh();
            }).catch(() => {
              refresh();
            });
          }, this.getObservationCheckInterval);
        };

        refresh();

        this.stopUpdateObservationTimer = () => {
          clearTimeout(timer);
        };

        this.startUpdateObservationTimer = () => {
          clearTimeout(timer);
          refresh();
        };
      }).share();
    }
    return this.observableGetAccounts;
  }



  public getAccount(userID) {
    var ret = null;
    $.each(this.accounts.data, function (i, acct) {
      if (acct.userID == userID) {
        ret = acct;
        return false;
      }
    });
    return ret;
  }

  /**
   * get all of the zone beacons defined for a location.
   *
   * @param {Integer} locationID - an optional ID of a location to fetch
   *
   * @returns {Array} A hash of beacons for the location by beaconID.  Also returns undefined if there are no beacons
   * for the location.  If locationID is not supplied, returns a hash of all the beacons for all locations.
   *
   * If the local cache for the beacon mapping is not yet defined, builds it out.
   */
  getBeaconsByLocation(lid?: number) {
    var ret = null;
    if (!Object.keys(this.beaconsByLocation).length) {
      this._buildBeaconLocationCache();
    }
    if (lid === undefined) {
      return this.beaconsByLocation.all;
    } else {
      return this.beaconsByLocation[lid];
    }
  }

  private _buildBeaconLocationCache() {
    this.beaconsByLocation.all = {};
    $.each(this.locations.data, (idx, ref) => {
      if (ref.hasOwnProperty("disabledAt") && ref.disabledAt) {
        // skip this one
        return true;
      }
      if (ref.hasOwnProperty("zones")) {
        this._buildBeaconZoneCache(ref, ref.zones);
      }
    });
  }

  private _buildBeaconZoneCache(location: any, zones: Array<any>) {
    if (!location || !zones) {
      return;
    }
    let lid = location.locationID;
    $.each(zones, (z, zref) => {
      var zid = zref.zoneID;
      if (zref.hasOwnProperty("disabledAt") && zref.disabledAt) {
        // skip this one
        return true;
      }
      if (zref.hasOwnProperty("beacons")) {
        // create the list for the beacon references
        if (!this.beaconsByLocation.hasOwnProperty(lid)) {
          this.beaconsByLocation[lid] = {};
        }
        var blist = this.beaconsByLocation[lid];
        $.each(zref.beacons, (b, bref) => {
          // inject the location and zone - these are not in the base object
          bref.locationID = lid;
          bref.zoneID = zid;
          blist[bref.beaconID] = bref;
          this.beaconsByLocation.all[bref.beaconID] = bref;
        });
      }
      if (zref.hasOwnProperty("zones")) {
        this._buildBeaconZoneCache(location, zref.zones);
      }
    });
  }

  public getCertifications() {
    "user strict"
    return new Promise((resolve, reject) => {
      let when = Date.now();
      this.commsService.sendMessage({
        cmd: 'getCertifications',
        includeDisabled: 1,
        lastRequest: this.certifications.lastRequest,
        sendTime: when
      }, false, false).then(data => {
        if (data && data.reqStatus === "OK") {
          this.certifications.lastRequest = data.result.timestamp;
          this.certifications.data = data.result.certifications;
        }
        resolve(this.certifications.data);
      }).catch(function (err) {
        reject(err)
      });
    });
  }

  public getCertificationByID( certID:any ) {
    var gRef = null;
    var cert = parseInt(certID);
    $.each(this.certifications.data, (i, ref) => {
      if (ref.certificationID === cert) {
        gRef = ref;
        return false;
      }
    });
    return gRef;
  }

  public certificationName(certItem:any, includeDescription: boolean = true) {
    var ret = certItem.name;
    if (includeDescription && certItem.description) {
      if (ret) {
        ret += " - ";
      }
      ret += certItem.description;
    }
    return ret;
  }

  public certificationNameFromType(type:number, includeDescription: boolean = true) {
    var gRef = this.getCertificationByID(type);
    if (gRef) {
      return this.certificationName(gRef, includeDescription);
    } else {
      return "Unknown (" + type + ")";
    }
  }

  public getGear() {
    "user strict"
    return new Promise((resolve, reject) => {
      let when = Date.now();
      this.commsService.sendMessage({
        cmd: 'getGear',
        includeDisabled: 1,
        lastRequest: this.gear.lastRequest,
        sendTime: when
      }, false, false).then(data => {
        if (data && data.reqStatus === "OK") {
          this.gear.lastRequest = data.result.timestamp;
          this.gear.data = data.result.gear;
        }
        resolve(this.gear.data);
      }).catch(function (err) {
        reject(err)
      });
    });
  }
  /**
 * getGearByID - return a gear definition for a given gearID
 *
 * @param {Integer} theID - the gearID for the piece of gear.
 *
 * @returns {Object} gearInfo
 *
 */
public getGearByID(theID) {
  var ret = null;
  $.each(this.gear.data, (i, gear) => {
    if (gear.gearID == parseInt(theID)) {
      ret = gear;
      return false;
    }
  });
  return ret;
}

/**
 *
 * @param theType The gear class name
 * @param override Whether the 'override' version of the icon should be used
 * @param gRef Optional reference to a structure for a gear item of this type
 * @param isGray Optional
 */
  getGearIconByType(theType: string, override: boolean = false, gRef: any = null, isGray: boolean = false) {
    let gear: any = this.getGearTypeInfo(theType);
    if (gear) {
      if (isGray) {
        let image: string = gear.image;
        if (gRef && gRef.usesBeacon) {
          image = image.replace('.svg', '_sense.svg');
        } else if (gRef && gRef.corvexID !== '') {
          image = image.replace('.svg', '_id.svg');
        }
        return `assets/images/gray_gear/gray_${image}`;
      } else {
        let image: string = gear.image;
        if (override) {
          image = "override_" + image;
        } else {
          if (gRef && gRef.usesBeacon) {
            image = image.replace('.svg', '_sense.svg');
          } else if (gRef && gRef.corvexID !== '') {
            image = image.replace('.svg', '_id.svg');
          }
        }
        return `assets/images/gear/${image}`;
      }
    } else {
      return 'assets/images/gear/hardhat.svg';
    }
  }

public getGearNameFromType(type:string) {
  var gRef = null;
  $.each(this.gear.data, (i, ref) => {
    if (ref.gearID === type) {
      gRef = ref;
      return false;
    }
  });
  if (gRef) {
    return this.gearName(gRef);
  } else {
    return "Unknown (" + type + ")";
  }
}

getGearByNFC( signature:string ) {
  var ret = null;
  if (signature.match(/.*:.*:/)) {
    // there is a serial number - strip it
    signature = signature.replace(/:[^:]*$/,'');
  }
  // now loop over all the gear we know about - is there one like this
  $.each(this.gear.data, (i, ppeType) => {
    if (ppeType.corvexID === signature) {
      ret = ppeType;
      return false;
    }
  });
  return ret;
}

getGearTypeInfo( type:string ) {
  var ret = null;
  $.each(this.gearTypes.data, (i, gear) => {
    if (gear.id == type) {
      ret = gear;
      return false;
    }
  });
  return ret;
}

gearName(gearItem:any) {
  var ret = gearItem.name || "";
  if (ret === "") {
    ret = gearItem.description || "";
  }
  if (gearItem.subtype) {
    ret += " - " + gearItem.subtype;
  }
  return ret;
}

  public getTeams() {
    "use strict"
    return new Promise((resolve, reject) => {
      let when = Date.now();
      this.commsService.sendMessage({
        cmd: "getGroups",
        includeDisabled: 1,
        lastRequest: this.teams.lastRequest,
        sendTime: when
      }, false, false).then(data => {
        if (data && data.reqStatus === "OK") {
          this.teams.lastRequest = data.result.timestamp;
          this.teams.data = data.result.groups;
        }
        resolve(this.teams.data);
      }).catch(function (err) { reject(err) });
    });
  }

  public getRoles() {
    "user strict"
    return new Promise((resolve, reject) => {
      let when = Date.now();
      this.commsService.sendMessage({
        cmd: 'getRoles',
        includeDisabled: 1,
        lastRequest: this.roles.lastRequest,
        sendTime: when
      }, false, false).then(data => {
        if (data && data.reqStatus === "OK") {
          this.roles.lastRequest = data.result.timestamp;
          this.roles.data = data.result.roles;
        }
        resolve(this.roles.data);
      }).catch(function (err) { reject(err) });
    });
  }

  public getCachedLocationById(id: number): any {
    return _.find(this.locations.data, <any>{locationID: id}) || {};
  }

  public getLocations() {
    return new Promise((resolve, reject) => {
      let when = Date.now();
      this.commsService.sendMessage({
        cmd: 'getLocations',
        includeDisabled: 1,
        lastRequest: this.locations.lastRequest,
        sendTime: when
      }, false, false).then(data => {
        if (data && data.reqStatus === "OK") {
          this.locations.lastRequest = data.result.timestamp;
          this.locations.data = data.result.locations;
          // clear the derived cache
          this.beaconsByLocation = {};
        }
        resolve(this.locations.data);

      }).catch(function (err) { reject(err) });
    });
  }

  public updateCaches(force:boolean = false) {
    return new Promise((resolve, reject) => {
      var dataBuckets = [this.accounts, this.certifications, this.gear, this.teams, this.roles, this.locations, this.settings.behaviors, this.settings.mitigations, this.settings.compliments, this.settings.securityQuestions];
      if (force) {
        for (let i = 0; i < dataBuckets.length; i++) {
          dataBuckets[i].lastRequest = null;
        }
      }
      var requestArray = [this.getAccounts(), this.getCertifications(), this.getGear(), this.getTeams(), this.getRoles(), this.getLocations(), this.settings.getAll()];

      Promise.all(requestArray).then((values) => {
        resolve(values);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  public clearCaches() {
    var dataBuckets = [this.accounts, this.certifications, this.gear, this.teams, this.roles, this.locations, this.settings.behaviors, this.settings.mitigations, this.settings.compliments, this.settings.securityQuestions];
    for (let i = 0; i < dataBuckets.length; i++) {
      dataBuckets[i].lastRequest = null;
      dataBuckets[i].data = null;
    }
  }

  teamName(teamItem) {
    if (teamItem) {
      return teamItem.name;
    } else {
      return "";
    }
  };

  teamNameByID(teamID) {
    "use strict";

    var ret = null;
    $.each(this.teams.data, function(i, team) {
      if (team.groupID == parseInt(teamID)) {
        ret = team;
        return false;
      }
    }.bind(this));
    return this.teamName(ret);
  };


  /**
   * accountAvatar - return the value for the avatar of a user
   *
   * @param {Integer} userID - the ID of the user
   * @param {Integer} [size] - an optional size for the image in pixels
   * @param {Boolean} [pictureOnly] - an optional flag that means only return a value if there is an actual picture
   *
   * @returns {String} A string to use in the src attribute of an img element.
   *
   */
  public accountAvatar(userID, size) {
    var ret = null;

    if (size === null) {
      size = 64;
    }
    var uRef = this.getAccount(userID);

    if (uRef) {
      // this is a known user... does it have a reference
      if (uRef.avatarID && uRef.avatarPath !== null) {
        // use the one from the backend if there is one
        ret = this.commsService.objectURI(uRef.avatarID, true);
      }
      else{
        var l = "";
        if (uRef.firstname !== "") {
          l = uRef.firstname.substr(0, 1);
        } else if (uRef.lastname !== "") {
          l = uRef.lastname.substr(0, 1);
        }
       if (l !== "" && l.match(/[a-zA-Z]/)) {
          ret = "assets/images/avatars/" + l.toUpperCase() + ".svg";
        }
        else{
          ret = "assets/images/user_icon.png"
        }
      }
    return ret;
  };
};

  /**
   * getFullname - return the fullname for a user
   *
   * @param {Number} userID - the ID for the user
   *
   * @returns {String} the fullname of the user or null if the user does not exist.
   */
  getFullname(userID) {
    if (userID === 0) {
      return "unassigned";
    }
    var rec = this.getAccount(userID);
    var ret = null;
    if (rec) {
      ret = rec.firstname + " " + rec.lastname;
    } else {
      return "unknown";
    }
    return ret;
  };

  /**
   * getCompactName - return a compact version of the name for an account
   *
   * @param {Integer} userID - the userID associated with the account
   *
   * @returns {String} The first name and last initial if there is one.
   */
  getCompactName(userID){
    if (userID === 0) {
      return "unassigned";
    }
    var rec = this.getAccount(userID);
    var ret = null;
    if (rec) {
      ret = rec.firstname;
      if (rec.lastname && rec.lastname.length > 0) {
        ret += " " + rec.lastname.charAt(0) +".";
      }
    } else {
      return "unknown";
    }
    return ret;
  };


  /**
   * findLocation - get a ref to a location
   *
   * @param {Integer} locationID - the location to search for
   *
   * @returns {Object} location - a reference to the location object
   */
  findLocation(locID) {
    var ret = null;
    locID = parseInt(locID);
    $.each(this.locations.data, function (l, loc) {
      if (loc.locationID === locID) {
        ret = loc;
        return false;
      }
    }.bind(this));
    return ret;
  };

  /**
   * findAnyZoneNoLoc - walk the locations AND their trees for a zone
   *
   * @param {Integer} zoneID - the zone to search for
   *
   * @returns {Object} zone - a reference to the zone Object or null if it is not found
   */

  findAnyZoneNoLoc(zoneID: any) {
    var ret = null;
    var lid = null;
    zoneID = parseInt(zoneID);
    $.each(this.locations.data, function (i, ref) {
      lid = i.locationID;
      var z = this.findAnyZone(ref, zoneID, true);
      if (z) {
        ret = z;
        return false;
      }
    }.bind(this));
    if (!ret || zoneID === 0) {
      // the zone didn't exist in any location?
      ret = {
        locationID: lid,
        zoneID: 0,
        name: "Site-wide"
      };
    }
    return ret;
  };

  /**
   * findAnyZone - walk the location tree looking for a specific zone
    *
    * @param {object} loc - reference to the location to search
    * @param {string} zoneID - the zone identifier for which to search
    * @param {boolean} recursed - optional flag to indicate it was called recursively.  Defaults to false
    *
    * @returns{object} zone - a reference to the zoneObject
    *
    * NOTE: This function is recursive
    * NOTE2: If zoneID is 0, then return the None zone for the location
    */

  findAnyZone(loc: any, zoneID: any, recursed: boolean = false) {
    var ret = null;
    zoneID = parseInt(zoneID);
    if (!loc || zoneID === undefined || zoneID === null) {
      return null;
    }
    // okay - we have parameters
    if (zoneID === "0" || zoneID === 0) {
      // we are looking for no zone - take the location
      ret = {
        locationID: loc.locationID,
        zoneID: zoneID,
        name: "Site-wide"
      };
    } else {
      if (!loc.zones || (typeof loc.zones === "object" && !Array.isArray(loc.zones))) {
        // there's no list of zones for this loc
        return null;
      }
      $.each(loc.zones, function (i, zoneRef) {
        if (zoneRef.zoneID === zoneID) {
          ret = zoneRef;
          return false;
        } else {
          ret = this.findAnyZone(zoneRef, zoneID, true);
          if (ret) {
            return false;
          }
        }
      }.bind(this));
      if (ret === null && !recursed) {
        // we had a zone and couldnt find it.  use site wide
        ret = {
          locationID: loc.locationID,
          zoneID: zoneID,
          name: "Site-wide"
        };
      }
    }
    return ret;
  };

  getObservations(){
    let id = this.userData.userID;
    if(this.userData.effectiveUserID){
      id = this.userData.effectiveUserID;
    }
    const data: any = this.getAccount(id);
    return data;
  }

}
