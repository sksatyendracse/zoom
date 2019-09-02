import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TimeAdjustService {

  private theOffset: number = 0;

  constructor() { }

  public currentTime() {
    let t = Date.now() + this.theOffset;
    return t;
  }

  public offset(val?: number) {
    if (val !== undefined) {
      this.theOffset = val;
    }
    return val;
  }
}
