import { Injectable } from '@angular/core';
import { CommsService } from '../comms/comms.service';
import { Router } from '@angular/router';
import { NavigationService } from "../navigation/navigation.service";
import { Device } from "@ionic-native/device/ngx";
import { Observable, Subject } from 'rxjs';

import * as _ from 'lodash';
import * as compareVersions from 'compare-versions';
import * as convert from 'convert-units';
import { SubscriberService } from '../subscriber/subscriber.service';
import { DeviceService } from '../device/device.service';

@Injectable({
  providedIn: 'root'
})
export class UserdataService {

  public updatesSubject: Subject<null> = new Subject<null>();
  public onUpdatesChanges: Observable<null> = this.updatesSubject.asObservable().share();

  public lastVersion: string = '';

  fullname: string = null;
  userType: string = null;
  userID: number = null;
  effectiveUserID: number = null;
  effectiveGroupID: number = null;
  nfcID: string = null;
  permissions: any = {};
  role: string = null;
  realm: string = null;
  realmName: string = null;
  gear: Array<number> = [];
  certifications: Array<number> = [];
  teams: Array<number> = [];
  compliance: string = 'unknown';
  Token: string = null;
  avatarID: number = 0;
  avatarPath: string = null;
  fullImagePath: string =  null;
  userLevel: number = 99;
  preferences: any = {};
  pushToken: string = "";
  Registered: boolean = false;
  prefix: string = "";
  loginTime: number = 0;
  observations: any = null;
  public tryDownload : boolean = true;
  updatingClaim : boolean = false;
  units: {}

  private accessLevels: Array<string> = [
    'corvex',
    'admin',
    'supervisor',
    'helper',
    'worker'
  ];

  constructor(
    private commsService: CommsService,
    private router: Router,
    private navigationService: NavigationService,
    private device: Device,
    private subscriber: SubscriberService,
    private bvdevice: DeviceService
  ) {}
  /**
   * handleAccountData - tahe account data from the backend and insert it
   *
   * @param {Object} userInfo - user data from backend
   */
  handleAccountData(userInfo: any) {
    if (userInfo.fullname) {
      this.fullname = userInfo.fullname;
    } else if (userInfo.firstname) {
      this.fullname = userInfo.firstname + " " + userInfo.lastname;
    }
    this.gear = userInfo.gear;
    if (!this.gear) {
      if (userInfo.registeredGear) {
        this.gear = userInfo.registeredGear;
      } else {
        this.gear = [];
      }
    }

    if (userInfo.certifications) {
      this.certifications = userInfo.certifications;
    } else {
      this.certifications = [];
    }
    if (userInfo.observations) {
      this.observations = userInfo.observations;
    } else {
      this.observations = null;
    }
    if (userInfo.registeredGear) {
      userInfo.gear = userInfo.registeredGear;
    }

    if (userInfo.avatarPath && userInfo.avatarID) {
      $(".ccsUserPic").attr("src", this.commsService.objectURI(userInfo.avatarID, true));
      this.avatarPath = this.commsService.objectURI(userInfo.avatarID, true);
    }

    if (userInfo.permissions) {
      try {
        this.permissions = userInfo.permissions;
      } catch (err) {
        console.log(err);
        this.permissions = {
          'worker': 1
        };
      }
      // ensure there is at least one relevant permission
      if (!this.permissions.hasOwnProperty('supervisor') && !this.permissions.hasOwnProperty('helper') ) {
        this.permissions.worker = 1;
      }
    } else {
      this.permissions = {
        'worker': 1
      };
    }

    if (userInfo.preferences) {
      try {
        this.preferences = userInfo.preferences;
      } catch (err) {
        console.log(err);
        this.preferences = {};
      }
    } else {
      this.preferences = {};
    }

    if (userInfo.units) {
      this.units = userInfo.units;
    } else {
      this.units = {};
    }

    this.userLevel = 99;

    $.each(this.accessLevels, (idx, level) => {
      if (this.permissions.hasOwnProperty(level)) {
        this.userLevel = idx;
        return false;
      }
    });

    this.updatesSubject.next();
  }

  /**
   * buildFooterMenu: Generates footer menu array that can be itereated on html templates depending upon user role, usable for unsafe and quality Obs.
   * @param - obsObject - observation object that holds OID, OPAC values to figure out options
   * @param - escalation - figures out a different set of menu for managerial operations
   * @returns - array of menu options with action, color code and text name
   */
  buildFooterMenu(obsObject: any, escalation?: boolean): boolean {
    const finishedObservationStatuses: string[] = ['fixed', 'resolved', 'closed', 'compliment', 'behavior', 'pi'];
    let returnObject: any = {
      footerMenu: [],
      showAddNotes: null
    };

    if (!obsObject.observationID) {
      return false;
    }

    // for quality receiving
    if(obsObject.subtype === 'receiving'){
      return false;
    }

    //if the observations are fixed or closed, return without doing anything.
    if (_.includes(finishedObservationStatuses, obsObject.state)) {
      return false;
    }

    // now lets build up the navs with functions.

    let quickFix = {
      name: "Mark as Implemented",
      action: () =>  this.navigationService.navigate(['/quick-fix/'+obsObject.observationID]),
      color: 'secondary'

    }

    let scrap = {
      name: "Scrap Product",
      action: () => this.navigationService.navigate(['/quality-scraped'], { queryParams: { observationID: obsObject.observationID }}),
      color: 'secondary'
    }

    //1. function for adding note
    let addNotesAction: any = {
      name: 'Add Notes',
      color: 'secondary',
      action: () => this.navigationService.navigate(['textMessageModal'],  { queryParams: { observationID: obsObject.observationID }})
    };

    //2. figure out what privilege level user has
    let functionName: string = '';
    let navPage: string = null;
    let query: any = null;

    if (this.isLevel('worker')) {
      //this means only can escalate
      functionName = 'Escalate Observation';
      navPage = 'updateObsTextAudio';
      query = {};
    }

    if (this.isLevel('helper')) {
      // this means can move to team
      functionName = 'Move Observation';
      navPage = 'moveObservationToTeam/';
      query = { queryParams: { action: 'move' } }
    }

    if (this.isLevel('supervisor')) {
      functionName = 'Assign Observation';
      navPage = 'assignObservation/';
      query = { queryParams: { action: 'assign' } };
    }

    let permittedAction: any = {
      name: functionName,
      color: 'secondary',
      action: () => {
        let url: string = navPage + obsObject.observationID;
        if (navPage === 'updateObsTextAudio') {
          url = navPage;
          query = { queryParams: { observationID: obsObject.observationID } };
        }
        this.navigationService.navigate([url], query);
      }
    };

    //3. mark as fixed action
    let markedAsFixedAction: any = null;
    const fixed: any = {
      name: 'Mark As Fixed',
      color: 'secondary',
      action: () => this.navigationService.navigate(['/resolveUnsafeCondition/' + obsObject.observationID])
    };

    const repairResolve: any = {
      name: "Repair/Resolve",
      action: () =>  this.navigationService.navigate(['/qualityRepairResolve/'+obsObject.observationID]),
      color: 'secondary'
    }

    if(obsObject.type === 'condition'){
      markedAsFixedAction = fixed;
    } else if (obsObject.type === 'quality'){
      markedAsFixedAction = repairResolve;
    }


    //4. claim observation
    let claimObservation: any = {
      name: 'Claim Observation',
      color: 'secondary',
      action: () => {
        if(!this.updatingClaim){
          this.updatingClaim = true;
        this.commsService.sendMessage({
          cmd: 'updateObservation',
          observationID: obsObject.observationID,
          ownerID: this.userID
          },false,true).then((data: any) => {
            this.updatingClaim = false;
          if (data.reqStatus === 'OK'){
            let qualityFlag = false;
            if(data.result.typeOverride){
              data.result.type = data.result.typeOverride;
            }
            if(data.result.type == "quality"){
              qualityFlag = true;
            }

            this.navigationService.navigate(['observationSubmitted/' + data.result.observationID] , { queryParams: { claimed: true, quality: qualityFlag }});
          }
          if (data.reqStatus === 'ERROR') {
              let observationID = obsObject.observationID;
            // there was a problem.   What was it?
            if (data.reqStatusText.match(/reassign not set/)) {
              // okay - there was a collision
              let userID: string = data.reqStatusText.replace(/^.* already owned by /, '');
              userID = userID.replace(/ .*/, '');
                this.navigationService.navigate([`claimFailed/${userID}/${observationID}`]);
              //now show claimed page!!
            }
          }
          })
          .catch((err) => {
            this.updatingClaim = false;
        });
      }


      }
    };

    //5. is escalation, or coming from open menu page or queue, then there should be claim observation menu
    // check if the observation is infact, editable- meaning new, escalated or fixed... this might come from notification page, which has no prior way to know what
    // the state is, so check if
    if (escalation) {
      if (obsObject.opac) {
        // this means escalate menu

        // check if the observation is available for owning and users can actually own it
        // A user can have multiple role, and  role precedence is supervisor > helper > worker
        if (obsObject.ownerID === 0 && (!this.isLevel('worker') || this.isLevel('supervisor') || this.isLevel('helper'))) {
          returnObject.footerMenu.push(addNotesAction);
          returnObject.footerMenu.push(claimObservation);
          // if(obsObject.type === 'quality'){
          //   returnObject.footerMenu.push(scrap);
          // }
          returnObject.footerMenu.push(permittedAction);
        } else {
          returnObject.footerMenu = null;
          returnObject.showAddNotes = true;
        }
      } else {
        // regular menu
        returnObject.footerMenu.push(addNotesAction);
        // Marked as fixed or quick fix.
        if (obsObject.type === 'PROCESS') {
          returnObject.footerMenu.push(quickFix);
        } else {
          returnObject.footerMenu.push(markedAsFixedAction);
        }
        if (obsObject.type === 'quality') {
          returnObject.footerMenu.push(scrap);
        }

        // escalate/assign for condition and quality
        if (obsObject.type != 'PROCESS') {
          returnObject.footerMenu.push(permittedAction);
        }
      }
    } else {
      if (_.includes(['condition', 'quality', 'PROCESS'], obsObject.type)) {  // first check if condition or quality
        if (_.includes(['escalated', 'new', 'workorder'], obsObject.state)) { // check if state is correct
          // now switch between owned and not owned.
          if (obsObject.opac) {//not owned
            returnObject.footerMenu = null;
            returnObject.showAddNotes = true;
          } else {

            // Add note menu option

            returnObject.footerMenu.push(addNotesAction);

            // Marked as fixed or quick fix.
            if (obsObject.type === 'PROCESS'){
              returnObject.footerMenu.push(quickFix);
            }else{
              returnObject.footerMenu.push(markedAsFixedAction);
            }

            // scrap option for quality
            if(obsObject.type === 'quality'){
            returnObject.footerMenu.push(scrap);
            }

            // escalate/assign for condition and quality
            if (obsObject.type != 'PROCESS'){
              returnObject.footerMenu.push(permittedAction);
            }

            returnObject.showAddNotes = null;
          }
        } else { // else show nothing
          returnObject.footerMenu = null;
          returnObject.showAddNotes = null;
        }
      } else { //show nothing
        returnObject.footerMenu = null;
        returnObject.showAddNotes = null;
      }
    }
    return returnObject;
  }





  /**
   *
   * @param level the name of the permission level (see accessLevels)
   *
   * @returns true if the user has permission to access at the level requested, false if not.
   */
  canView(level: string): boolean {
    var checkLevel = this.accessLevels.indexOf(level);
    if (checkLevel === -1 || checkLevel > this.userLevel) {
      return false;
    } else {
      return true;
    }
  }

  isLevel(level:string) :boolean{
    if(this.permissions[level] && this.permissions[level]==1){
      return true;
    }else{
      return false;
    }

  }

  clear():void {
  this.fullname = null;
  this.userType = null;
  this.userID = null;
  this.effectiveUserID = null;
  this.effectiveGroupID = null;
  this.nfcID = null;
  this.permissions = {};
  this.role = null;
  this.realm = null;
  this.realmName = null;
  this.gear = [];
  this.certifications = [];
  this.teams = [];
  this.compliance = 'unknown';
  this.Token = null;
  this.avatarID = 0;
  this.avatarPath = null;
  this.fullImagePath =  null;
  this.userLevel = 99;
  this.preferences = {};
  this.pushToken = "";
  this.Registered = false;
  this.prefix = "";
  this.tryDownload = true;
  }

  public sendPrefs(): Promise<any> {
    if (this.Token) {
      let eData = {
        token: this.Token,
        cmd: 'preferences',
        config: JSON.stringify(this.preferences)
      };
      return this.commsService.sendMessage(eData, false, false, true);
    } else {
      return new Promise((resolve) => {
        resolve('NoAuth');
      });
    }
  }

  public updatePermissions(): Promise<void> {
    if (this.isLogged()) {
      return this.commsService.sendMessage({
        cmd: 'getUserInfo',
        userID: this.userID
      }, false).then((response: any = {}) => {
        if (response.result && response.result.status === 'OK' && response.result.users) {
          this.handleAccountData(response.result.users[0]);
        }
      });
    } else {
      return Promise.resolve();
    }
  }


  public isDownloadAvailable(): Promise<boolean>{
    return new Promise((resolve,reject)=>{
      this.commsService.sendMessage({
        cmd: "getVersion"
      }, false, false).then(data => {
        if (data.reqStatus == "OK") {
          var serverVersion = data.result.VERSION;

          if (compareVersions(serverVersion, this.commsService.version)>0) {
            resolve(data.result.URL);
          }
          else {
            resolve(false);
          }
        }
        else {
          resolve(false);
        }
      }).catch((err)=>{
        reject(err);

      });
    });
  }


  public isCorvexDevice(){
    return (this.bvdevice.isBlackView());
  }

  private isLogged(): boolean {
    return !_.isEmpty(this.Token);
  }

  /**
   * @returns the users' preferred units; metric or imperial
   */
  public getUnits( type: string = 'measurement' ) : string {
    var u = _.get(this.units, type, this.subscriber.getUnits(type));
    return u;
  }

  /**
   *
   * @param temp a temperature in Celcius
   *
   * @returns the temperature in the units the user prefers.
   */
  public temperature(temp:number, prec:number = 0): number {
    if (this.getUnits('measurement') === 'metric') {
      return _.round(temp, 0);
    } else {
      return _.round(convert(temp).from('C').to('F'), prec);
    }
  }
}
