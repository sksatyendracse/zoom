import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { AuthService } from "../auth/auth.service";
import { CommsManager } from "../../managers/comms/comms-manager.service";
import { NavigationService } from "../navigation/navigation.service";

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private navigationService: NavigationService,
    private authService: AuthService,
    private commsManager: CommsManager
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {

    if (this.commsManager.isDeviceReady()) {
      if (this.authService.isUserLogged()) {
        return true;
      } else if (state.url !== '/login') {
        this.navigationService.navigate(['/login']);
        return false;
      }
    } else {
      if (state.url === '/network-handler') {
        return true;
      } else {
        this.navigationService.navigate(['/network-handler']);
        return false;
      }
    }

    return true;
  }
}
