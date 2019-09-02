import { TestBed } from '@angular/core/testing';

import { TimeAdjustService } from './time-adjust.service';

describe('TimeAdjustService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TimeAdjustService = TestBed.get(TimeAdjustService);
    expect(service).toBeTruthy();
  });
});
