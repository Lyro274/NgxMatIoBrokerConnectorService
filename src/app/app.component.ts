import {Component} from '@angular/core';
import {Subscription} from 'rxjs';
import {NgxMatIoBrokerConnectorService} from 'ngx-mat-io-broker-connector-service';

@Component({
  selector: 'mat-ta-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'project';

// Represents the subscription to the behaviourSubject in the ioBrokerConnService for the data of all registered getters
  getterSubscription: Subscription;

  // Represents the subscription to the behaviourSubject in the ioBrokerConnService for all data that the socket adapter returns
  allDataSubscription: Subscription;

  constructor(public ioBrokerConn: NgxMatIoBrokerConnectorService) {
    // First a connection to the socket adapter has to be created
    // For that call the connect function in the ioBrokerConnService and pass on the IP and the Port
    this.ioBrokerConn.connect('10.48.2.176', 8080).then(() => {
      // Examples
      this.ioBrokerConn.registerGetter('deconz.0.Sensors.2', 'buttonevent');
      let variable = this.ioBrokerConn.getter('deconz.0.Sensors.2', 'buttonevent', 'val');
      let variable2 = this.ioBrokerConn.getter('deconz.0.Sensors.2', 'buttonevent', '');
      let states = this.ioBrokerConn.getAllStates();
      this.ioBrokerConn.setter('deconz.0.Sensors.2', 'buttonevent', 1337);
    }).catch((err) => {
      // If connection fails
      console.log(err);
    });
  }

  // OnInit both the getterData and the allData behaviourSubjects from the ioBrokerConn are being subscribed to
  ngOnInit(): void {
    // Subscribe to getterData
    this.getterSubscription = this.ioBrokerConn.getterData$
      .subscribe(data => {
        // data contains an object ({id: 'id', state: 'state'}) which can be handled here
      });

    // Subscribe to allData
    this.allDataSubscription = this.ioBrokerConn.allData$
      .subscribe(data => {
        // data contains an object ({id: 'id', state: 'state'}) which can be handled here
      });
  }
}
