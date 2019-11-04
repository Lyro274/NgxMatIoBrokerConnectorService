import { TestBed } from '@angular/core/testing';

import { NgxMatIoBrokerConnectorServiceService } from './ngx-mat-io-broker-connector-service.service';

describe('NgxMatIoBrokerConnectorServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NgxMatIoBrokerConnectorServiceService = TestBed.get(NgxMatIoBrokerConnectorServiceService);
    expect(service).toBeTruthy();
  });
});
