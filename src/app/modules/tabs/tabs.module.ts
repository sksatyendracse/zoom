import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TabsPage } from './tabs.page';
import { RouterModule } from '@angular/router';
import { Tab1Page } from "./pages/tab1/tab1.page";
import { Tab2Page } from "./pages//tab2/tab2.page";
import { Tab3Page } from "./pages//tab3/tab3.page";
@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: 'tab1',
        component: Tab1Page,
      },
      {
        path: 'tab2',
        component: Tab2Page,
      },
      {
        path: 'tab3',
        component: Tab3Page,
      },
      {
        path: '',
        redirectTo: 'tab1',
        pathMatch: 'full'
      }
    ])
  ],
  declarations: [TabsPage, Tab1Page, Tab2Page, Tab3Page]
})
export class TabsPageModule {}
