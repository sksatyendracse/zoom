import { TestBed, inject } from '@angular/core/testing';

import { CommsManager } from './comms-manager.service';

describe('CommsManagerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CommsManager]
    });
  });

  it('should be created', inject([CommsManager], (service: CommsManager) => {
    expect(service).toBeTruthy();
  }));
});
