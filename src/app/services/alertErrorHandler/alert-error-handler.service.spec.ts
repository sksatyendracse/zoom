import { TestBed } from '@angular/core/testing';

import { AlertErrorHandlerService } from './alert-error-handler.service';

describe('AlertErrorHandlerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AlertErrorHandlerService = TestBed.get(AlertErrorHandlerService);
    expect(service).toBeTruthy();
  });
});
