import { TestBed } from '@angular/core/testing';

import { NgxMatIoBrokerConnectorService } from './ngx-mat-io-broker-connector-service.service';

describe('NgxMatIoBrokerConnectorServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NgxMatIoBrokerConnectorService = TestBed.get(NgxMatIoBrokerConnectorService);
    expect(service).toBeTruthy();
  });
});
