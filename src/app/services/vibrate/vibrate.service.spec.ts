import { TestBed, inject } from '@angular/core/testing';

import { VibrateService } from './vibrate.service';

describe('VibrateService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VibrateService]
    });
  });

  it('should be created', inject([VibrateService], (service: VibrateService) => {
    expect(service).toBeTruthy();
  }));
});
