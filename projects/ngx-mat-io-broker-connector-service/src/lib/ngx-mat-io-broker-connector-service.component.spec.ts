import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxMatIoBrokerConnectorServiceComponent } from './ngx-mat-io-broker-connector-service.component';

describe('NgxMatIoBrokerConnectorServiceComponent', () => {
  let component: NgxMatIoBrokerConnectorServiceComponent;
  let fixture: ComponentFixture<NgxMatIoBrokerConnectorServiceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxMatIoBrokerConnectorServiceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxMatIoBrokerConnectorServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
