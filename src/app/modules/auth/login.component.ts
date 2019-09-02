import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { AuthService } from "../../services/auth/auth.service";
import { AppService } from '../../services/app/app.service';
import { CommsService } from '../../services/comms/comms.service';
import { UserdataService } from '../../services/userdata/userdata.service';
import { SubscriberService } from '../../services/subscriber/subscriber.service';
import { LoadingService } from "../../services/loading/loading.service";
import { NavigationService } from "../../services/navigation/navigation.service";
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { GpslocationService } from '../../services/gpslocation/gpslocation.service';
import { AlertController } from "@ionic/angular";
import { DeviceService } from '../../services/device/device.service';
import { Storage } from '@ionic/storage';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public userModel: any = {
    prefix: '',
    UserName: '',
    Password: '',
    subscriberID: null,
    remember: false
  }
  passwordType: string = 'password';
  passwordIcon: string = 'eye-off';

  hideShowPassword() {
      this.passwordType = this.passwordType === 'url' ? 'password' : 'url';
      this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
  };

  public isBlackview: boolean = false;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  private keyboardHandler;
  public form: FormGroup;
  public isKeyVisible: boolean = false;
  constructor(
    public subscriber: SubscriberService,
    private userData: UserdataService,
    private authService: AuthService,
    private app: AppService,
    public comms: CommsService,
    public device: DeviceService,
    private loadingService: LoadingService,
    private navigationService: NavigationService,
    private keyboard : Keyboard,
    private gps: GpslocationService,
    private alertController: AlertController,
    private storage: Storage
  ) {}

  ionViewWillEnter() {
    this.passwordType = 'password';
    this.passwordIcon = 'eye-off';
    this.isBlackview = this.device.isBlackView();
    // any time we come to this page, get the GPS coordinates
    this.gps.get().then(pos => {
      if (pos) {
        console.log("Determined GPS location");
      } else {
        console.log("Could not determine GPS location");
      }
    });
    
    // this.form.reset();
    let userObject = window.localStorage.getItem('userdata');
    if (userObject) {
      let userData = JSON.parse(userObject);
      if (userData.flag && userData.UserName) {
        // populate the fields
        this.userModel.remember = true;
        this.userModel.prefix = userData.prefix;
        this.userModel.UserName = userData.UserName;
        this.userModel.Password = userData.Password;
      }
    }
  }

  ngOnDestroy(){
    this.keyboardHandler.unsubscribe();
  }

  public ngOnInit() {
    let formGroup: any = {
      'username': new FormControl(this.userModel.UserName, Validators.required),
      'password': new FormControl(this.userModel.Password),
      'rememberMe': new FormControl(this.userModel.remember)
    };
    if (!this.comms.usingGateway) {
      formGroup['prefix'] = new FormControl(this.userModel.subscriberPrefix, Validators.required);
    }
    this.form = new FormGroup(formGroup);

    this.keyboardHandler =  this.keyboard.onKeyboardShow().subscribe(data=>{
      this.isKeyVisible = true;
      });

      this.keyboardHandler = this.keyboard.onKeyboardHide().subscribe(deta =>{
      this.isKeyVisible = false;
    });




  }

  public onSubmit(): void {
    this.isSubmitted = true;

    if (this.form.valid) {
      if (!this.isLoading) {
        this.isLoading = true;
        // first, determine which subscriber
        this.loadingService.enable();
        this.keyboard.hide();

        this.authService.handleSignin(this.userModel).subscribe((isSuccess: boolean) => {
          this.isLoading = false;
          if (isSuccess) {
            this.isSubmitted = false;
            this.form.reset();
          } else {
            this.alertController.create({
              header: 'Whoops.',
              message: 'The username or password you entered were incorrect. Please try again. <br><br> If you continue to have trouble, find your supervisor.',
              cssClass: 'custom-alert',
              buttons: [{text: 'Try Again'}]
            }).then((alert: any) => {
              alert.present();
              setTimeout(() => {
                alert.dismiss();
              }, 5000);
            });
          }
          this.loadingService.disable();
        });
      }
    }
  }

  public isInvalid(key: string): boolean {
    return this.isSubmitted && this.form.controls[key]
        && this.form.controls[key].errors && this.form.controls[key].errors.required;
  }

}
