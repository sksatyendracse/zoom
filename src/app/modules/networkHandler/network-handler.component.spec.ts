import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkHandlerComponent } from './network-handler.component';

describe('NetworkHandlerComponent', () => {
  let component: NetworkHandlerComponent;
  let fixture: ComponentFixture<NetworkHandlerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NetworkHandlerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkHandlerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
