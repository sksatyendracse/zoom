import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from "./services/authGuard/auth-guard.service";
import { IHeaderConfig } from "./modules/header/header.component";
const routes: Routes = [
  {
    canActivate: [AuthGuard],
    path: 'login',
    loadChildren: './modules/auth/auth.module#AuthModule',
    data: {
      headerConfig: <IHeaderConfig>{
        showMainLogo: true,
        hideBackButton: true
      }
    }
  },
  {
    canActivate: [AuthGuard],
    path: 'network-handler',
    loadChildren: './modules/networkHandler/networkHandler.module#NetworkHandlerModule',
    data: {
      headerConfig: <IHeaderConfig>{
        hideBackButton: true,
        hideMenu: true,
        showMainLogo: true
      }
    }
  },
  {
    canActivate: [AuthGuard],
    path: 'home',
    loadChildren: () => import('./modules/tabs/tabs.module').then(m => m.TabsPageModule)
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
