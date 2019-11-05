# NgxMatIoBrokerConnectorService

* A simple `Angular Service` that can be used in your project
* It allows the user to connect to their `ioBroker` and send and receive data 
* It is developed using `Angular >=6.0.0` and its newly introduced `ng g library` schematics.
* This library is part of MatIoBroker project and it is generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.2.12.
* Library location: `projects/ngx-mat-io-broker-connector-service` directory of this repository.

## Examples/Demo

* A simple Example can be found under `src/app` directory of this repository.

## Requirements

The Socket Adapter of the ioBroker has to be installed and running.
You can find it under the name "socketio.0". For further information, visit the [GitHub page](https://github.com/ioBroker/ioBroker.socketio) of the Adapter.

## Installation

`npm i ngx-mat-io-broker-connector-service`

## Functions

### connect

* function(ip, port)
* **ip** - **string** - The ip of the device where the ioBroker is running (e.g. "10.43.7.126")
* **port** - **number** - The port on which the the socket adapter is operating (e.g. 8080)

The connect function let's the user connect to the socket adapter of their ioBroker.
It is important to use with a promise here, and only call further functions once the promise is resolved. If it is rejected, then the connecting process failed.

```
this.ioBrokerConn.connect('10.43.7.126', 8080).then(() => {
      // Call further functions here
    }).catch((err) => {
      // Connection failed
    });
```

### registerGetter

* function(object, state)
* **object** - **string** - The object path for the new getter (e.g. "deconz.0.Sensors.2")
* **state** - **string** - The state of the object for the new getter (e.g. "buttonevent")

Registers a new getter, which means that new values will be returned to the [getterData](getterData) subscription.

```
this.ioBrokerConn.registerGetter('deconz.0.Sensors.2', 'buttonevent');
```

### getter

* function(object, state, key)
* **object** - **string** - The object path of the wanted object (e.g. "deconz.0.Sensors.2")
* **state** - **string** - The state of the wanted object (e.g. "buttonevent")
* **key** - **string** - The key of the wanted value (e.g. "val")

Returns either a value or a whole state, depending on the key parameter. It returns a specific value if the a key parameter was passed on. If the key parameter is empty, it returns the whole state of the object.

```
let variable = this.ioBrokerConn.getter('deconz.0.Sensors.2', 'buttonevent', 'val'); // returns a specific value
let variable2 = this.ioBrokerConn.getter('deconz.0.Sensors.2', 'buttonevent', '');   // returns the whole state
```

### getAllStates

* function()

Returns all states that currently exists on the ioBroker, as an object.

``` 
let states = this.ioBrokerConn.getAllStates();
```

### setter 

* function(object, state, value)

* **object** - **string** - The object path to the object where a value is to be changed (e.g. "deconz.0.Sensors.2")
* **state** - **string** - The state of the object where a value is to be changed (e.g. "buttonevent")
* **value** - **any** - The value that will replace the old value (e.g. 1337)

The function sets a new value of the state of the object that was passed on. It is important to note that the socket adapter only changes the 'val' key in the state and you can not change any other key with this function.

```
this.ioBrokerConn.setter('deconz.0.Sensors.2', 'buttonevent', 1337);
```

## Subscriptions

### getterData <a name="getterData"></a>

Subscription to a behaviourSubject in the service. It receives new data whenever the state of one of the registered is changed.

```
 // Represents the subscription to the behaviourSubject in the ioBrokerConnService for the data of all registered getters
  getterSubscription: Subscription;

 // Initialise in ngOnInit
 this.getterSubscription = this.ioBrokerConn.getterData$
      .subscribe(data => {
        // data contains an object ({id: 'id', state: 'state'}) which can be handled here
      });
```

### allData

Subscription to a behaviourSubject in the service. It receives new data whenever the state of any object is changed.

```
 // Represents the subscription to the behaviourSubject in the ioBrokerConnService for all data that the socket adapter returns
  allDataSubscription: Subscription;

 // Initialise in ngOnInit
this.allDataSubscription = this.ioBrokerConn.allData$
      .subscribe(data => {
        // data contains an object ({id: 'id', state: 'state'}) which can be handled here
      });
```

## Usage

1. Import the socket.io.js file from your Socket Adapter in the index.html file of your angular project. It is important to change "YourIP" to the IP of of the device where the ioBroker is running and "Port" to the port on which the the socket adapter is operating

    > `<script type="text/javascript" src="http://YourIP:Port/socket.io/socket.io.js"></script>`

    ```
   <!doctype html>
   <html lang="en">
   <head>
     <meta charset="utf-8">
     <title>Project</title>
     <base href="/">
     <meta name="viewport" content="width=device-width, initial-scale=1">
     <link rel="icon" type="image/x-icon" href="favicon.ico">
     <!-- It is important to change "YourIP" to the IP of of the device where the ioBroker is running
                                      and "Port" to the port on which the the socket adapter is operating -->
     <script type="text/javascript" src="http://YourIP:Port/socket.io/socket.io.js"></script>
   </head>
   <body>
     <mat-ta-root></mat-ta-root>
   </body>
   </html>
    ```         

2. Import the NgxMatIoBrokerConnectorService from the package and inject it into the constructor, in the component where you want to use the ioBrokerConnector.

    > `import {NgxMatIoBrokerConnectorService} from 'ngx-mat-io-broker-connector-service';`

    ```
    constructor(public ioBrokerConn: NgxMatIoBrokerConnectorService) {
        ...
    }
    ```

3. Connect to the Socket Adapter by using the connect function and pass on your IP and Port, as stated above.

    ``` 
    constructor(public ioBrokerConn: NgxMatIoBrokerConnectorService) {
         this.ioBrokerConn.connect('YourIP', Port).then(() => {
             // Examples
             }).catch((err) => {
             // If connection fails
             console.log(err);
           });
         }
    ```    

4. Call any of the provided functions in the success case of the connect function to receive and send data.

    ```
     let variable = this.ioBrokerConn.getter('deconz.0.Sensors.2', 'buttonevent', 'val');
     let variable2 = this.ioBrokerConn.getter('deconz.0.Sensors.2', 'buttonevent', '');
     let states = this.ioBrokerConn.getAllStates();
     this.ioBrokerConn.setter('deconz.0.Sensors.2', 'buttonevent', 1337);
    ```

5. Register to the getterData and/or allData BehaviourSubject to receive data. Create a Subscription variable for that and subscribe on the subjects in the ngOnInit function of your component.

    > `getterSubscription: Subscription;`
    >
    > `allDataSubscription: Subscription;`

    ``` 
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
    ```

**Note:** For further documentation, check out the example provided in the src directory.

## Running the example in local environment

* `npm i`
* Change "YourIP" and "Port" to yours. (This is needed in the index.html and in the app.component.ts files)
* Run `ng serve` for a dev server and running the demo app. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build the NgxMatIoBrokerConnectorService module

Run `ng build NgxMatNgxMatIoBrokerConnectorService` to build the library. The build artifacts will be stored in the `dist/ngx-mat-io-broker-connector-service` directory. Use the `--prod` flag for a production build.

## Credits

Also thanks to Sanjiv Kumar from [Medium](https://medium.com/@esanjiv/complete-beginner-guide-to-publish-an-angular-library-to-npm-d42343801660) who wrote a blog post about publishing a library to npm which helped me greatly in the process of publishing my own library.

