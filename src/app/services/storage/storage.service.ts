import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor() {}

  public set(key: string, value: any): void {
    if (typeof value === 'string' || typeof value === 'number') {
      localStorage.setItem(key, value.toString());
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  public get(key: string): any {
    let storageItem: string = localStorage.getItem(key);

    if (storageItem) {
      try {
        storageItem = JSON.parse(storageItem);
      } catch {}
    }

    return storageItem;
  }

  public remove(key: string): any {
    if (key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }

}
