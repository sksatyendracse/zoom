import { Injectable } from '@angular/core';
import { CommsService } from '../comms/comms.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor(private comms: CommsService) { }

  // data buckets for various settings//

  //1. Holds behaviors that populates the coaching opportunities menu
  public behaviors = {
    lastRequest: 0,
    data: []
  };

  //2. Holds compliments that populates the thumbs-up menu
  public compliments = {
    lastRequest: 0,
    data: []
  };

  //3. Holds the team information
  public groups = {
    lastRequest: 0,
    data: []
  };

  //4. Holds the mitigation measures required while creating coaching opportunities
  public mitigations = {
    lastRequest: 0,
    data: []
  };

  //5. Holds the categories of observations
  public categories = {
    lastRequest: 0,
    data: []
  };

  //6. Holds the emergencies
  public emergencies = {
    lastRequest: 0,
    data: []
  };

  //7. Holds the qualityCategories
  public qualityCats = {
    lastRequest: 0,
    data: []
  };

  //8. Holds the security question list
  public securityQuestions = {
    lastRequest: 0,
    data: []
  };

  private lastRequest: 0;

  public getAll() {
    var tmap = {
      "behavior": this.behaviors,
      "compliment": this.compliments,
      "emergency": this.emergencies,
      "group": this.groups,
      "mitigation": this.mitigations,
      "category": this.categories,
      "quality" : this.qualityCats,
      "security" : this.securityQuestions
    };

    return new Promise((resolve, reject) => {
      this.comms.sendMessage({ cmd: "getMessageTemplates", lastRequest: this.lastRequest, sendTime: Date.now() }, false, false)
        .then((data) => {
          if (data && data.reqStatus === "OK") {
            $.each(tmap, function (name, container) {
              container.data = [];
              container.lastRequest = data.result.timestamp;
            });
            this.lastRequest = data.result.timestamp;
            $.each(data.result.messageTemplates, function (idx, ref) {
              var t = ref.type;
              if (tmap.hasOwnProperty(t)) {
                tmap[t].data.push(ref);
                tmap[t].lastRequest = data.result.timestamp;
              } else {
                console.log("Undefined setting type " + t + " received from backend");
              }
            });
          }
          resolve(true);
        });
    });
  }

}
