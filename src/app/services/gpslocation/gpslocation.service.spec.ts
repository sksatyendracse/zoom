import { TestBed, inject } from '@angular/core/testing';

import { GpslocationService } from './gpslocation.service';

describe('GpslocationService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GpslocationService]
    });
  });

  it('should be created', inject([GpslocationService], (service: GpslocationService) => {
    expect(service).toBeTruthy();
  }));
});
