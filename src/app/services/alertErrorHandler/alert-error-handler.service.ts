import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AlertErrorHandlerService {

  constructor(private alertController: AlertController) {}

  public show(message?: string, header?: string): Promise<void> {
    return this.alertController.create({
      header: header || 'Whoops.',
      message: message || 'Something went wrong. Please try again. <br><br> If you continue to have trouble, find your supervisor.',
      cssClass: 'custom-alert',
      buttons: [{text: 'Try Again'}]
    }).then((alert: any) => {
      alert.present();
      return alert.onWillDismiss();
    });
  }
}
