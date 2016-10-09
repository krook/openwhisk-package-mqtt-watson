# OpenWhisk MQTT Package for Watson IoT
==========================

This package provides a mechanism to trigger OpenWhisk actions when messages are received on an MQTT topic in the Watson IoT Platform. It sets up a Cloud Foundry application that can be configured to listen to one or more topics on a persistent connection, then invokes the registered actions as a feed action.

```
openwhisk-package-mqtt-watson/
├── actions
│   └── ...
├── CONTRIBUTING.md
├── feeds
│      └── feed-action.js
├── install.sh
├── LICENSE.txt
├── README.md
├── tests
│   ├── credentials.json
│   ├── credentials.json.enc
│   └── src
│      └── MqttWatsonTests.scala
├── tools
│   └── travis
│       └── build.sh
├── MqttWatsonEventProvider
│      ├── index.js
│      ├── manifest.yml
│      ├── package.json
│      └── lib
│          ├── feed-controller.js
│          ├── mqtt-subscription-manager.js
│          └── trigger-store.js
└── uninstall.sh
```

## Architecture
TODO: Diagram here.

## Package contents
| Entity | Type | Parameters | Description |
| --- | --- | --- | --- |
| `/namespace/mqtt-watson` | package | - | OpenWhisk Package for Watson MQTT |
| `/namespace/mqtt-watson/feed-action.js` | action | [details](#hello-world) | Subscribes to a Watson MQTT topic |

### Feeds
The main action in this package is `feed-action.js`. When a trigger is associated to this action, it causes the action to subscribe to an MQTT topic as an application (not a device) so that it can receive messages that will in turn trigger your custom actions.

###### Parameters
$WSK trigger create openfridge-feed-trigger \
  -f mqtt/mqtt-feed-action \
  -p url "ssl://$WATSON_TEAM_ID.messaging.internetofthings.ibmcloud.com:8883" \
  -p topic "$WATSON_TOPIC" \
  -p username "$WATSON_USERNAME" \
  -p password "$WATSON_PASSWORD" \
  -p client "$WATSON_CLIENT"

| **Parameter** | **Type** | **Required** | **Description**| **Options** | **Default** | **Example** |
| ------------- | ---- | -------- | ------------ | ------- | ------- |------- |
| url | *string* | yes |  URL to Watson MQTT feed | - | - | "ssl://a-123xyz.messaging.internetofthings.ibmcloud.com:8883" |
| topic | *string* | yes |  Topic to subscribe to | - | - | "iot-2/type/+/id/+/evt/+/fmt/json" |
| username | *string* | yes |  App user name| - | - | "a-123xyz" |
| password | *string* | yes |  App password| - | - | "+-derpbog" |
| client | *string* | yes |  App client id| - | - | "a:12e45g:mqttapp" |

## Watson MQTT Package Installation

### Bluemix Installation
First you need to install the `wsk` CLI, follow the instructions at https://new-console.ng.bluemix.net/openwhisk/cli

`./install.sh openwhisk.ng.bluemix.net $AUTH_KEY $WSK_CLI $PROVIDER_ENDPOINT`

`./uninstall.sh openwhisk.ng.bluemix.net $AUTH_KEY $WSK_CLI`

where:
- **$PROVIDER_ENDPOINT** is the endpoint of the event provider service. It's a fully qualified URL including the path to the resource. i.e. http://host:port/mqtt-watson
- **$AUTH_KEY** is the OpenWhisk Authentication key (Run `wsk property get` to obtain it).

### Local Installation:
Local installation requires running the OpenWhisk environment locally prior to installing the package. To run OpenWhisk locally follow the instructions at https://github.com/openwhisk/openwhisk/blob/master/tools/vagrant/README.md.    

`./install.sh  $EDGE_HOST $AUTH_KEY $WSK_CLI $PROVIDER_ENDPOINT`

`./uninstall.sh  $EDGE_HOST $AUTH_KEY $WSK_CLI`

where:
- **$EDGE_HOST** is where OpenWhisk is deployed
- **$AUTH_KEY** is the OpenWhisk Authentication key(Run `wsk property get` to obtain it).
- **$WSK_CLI** is the path of OpenWhisk command interface binary
- **$PROVIDER_ENDPOINT** is the endpoint of the event provider service. It's a fully qualified url including the path to the resource. i.e. http://host:port/mqtt-watson

This will create a new package called **mqtt-watson** as well as feed action within the package.


## Watson IoT MQTT Service (Event Provider) Deployment

In order to support integration with the Watson IoT environment there needs to be an event generating service that fires a trigger in the OpenWhisk environment when messages are received. This service connects to a particular MQTT topic and then invokes the triggers that are registered for that topic. It has its own Cloudant/CouchDB database to persist the topic to trigger subscription information. You will need to initialized this database prior to using this service.

There are two options to deploy the service:

### Bluemix Deployment:
This service can be hosted as a Cloud Foundry application. To deploy on IBM Bluemix:

1. Create a Cloudant service on Bluemix, and create a database with name `topic_listeners`
1. Change the name and host fields in the manifest.yml to be unique. Bluemix requires routes to be globally unique.
2. Run `cf push`

### Local Deployment:
This service can also run as a Node.js app on your local machine.

1. Install a local CouchDB, for how to install a CouchDB locally, please follow instruction at https://developer.ibm.com/open/2016/05/23/setup-openwhisk-use-local-couchdb/

2. Create a database with name `topic_listeners` in the CouchDB.

3. Run the following command, `node index.js $CLOUDANT_USERNAME $CLOUDANT_PASSWORD $OPENWHISK_AUTH_KEY`

Note: Local deployment of this service requires extra configuration if it's to be run with the Bluemix OpenWhisk.

## Usage of Watson MQTT package
To use this trigger feed, you need to pass the required parameters (refer to the table below)

```
$WSK_CLI trigger create rss_trigger --feed /namespace/mqtt-watson/feed-action -p url 'url_to_rss' -p pollingInterval 'timePeriod'

$WSK_CLI trigger create message-to-hello-trigger \
    -f mqtt/mqtt-feed-action \
    -p topic "$WATSON_TOPIC" \
    -p url "ssl://$WATSON_TEAM_ID.messaging.internetofthings.ibmcloud.com:8883" \
    -p username "$WATSON_USERNAME" \
    -p password "$WATSON_PASSWORD" \
    -p client "$WATSON_CLIENT"
```

For example
```
$WSK_CLI trigger create message-to-hello-trigger \
    -f mqtt/mqtt-feed-action \
    -p topic "iot-2/type/+/id/+/evt/+/fmt/json" \
    -p url "ssl://12e45g.messaging.internetofthings.ibmcloud.com:8883" \
    -p username "a-123xyz" \
    -p password "+-derpbog" \
    -p client "a:12e45g:mqttapp"
```

To use trigger feed to delete created trigger.

`$WSK_CLI trigger delete message-to-hello-trigger`

## Associate Watson MQTT trigger and action by using rule
 1. Create a new trigger, for example: ```
 $WSK_CLI trigger create message-to-hello-trigger \
     -f mqtt/mqtt-feed-action \
     -p topic "iot-2/type/+/id/+/evt/+/fmt/json" \
     -p url "ssl://12e45g.messaging.internetofthings.ibmcloud.com:8883" \
     -p username "a-123xyz" \
     -p password "+-derpbog" \
     -p client "a:12e45g:mqttapp"
 ```

 2. Write a 'hello-action.js' file that reacts to the trigger events with action code below:
 ```
 function main(params) {
   // Read the MQTT inbound message JSON, removing newlines.
   var service = JSON.parse(params.body.replace(/\r?\n|\r/g, ''));
   var serial = service.serial || "xxxxxx";
   var reading = service.reading || 100;
   return {payload: 'Hello,' + serial + '!'+ ' reading: ' + reading};
 }
 ```
 Upload the action exists:
 `$WSK_CLI action create hello-action hello-action.js`

 3. Create the rule that associate the trigger and the action:
 `$WSK_CLI rule create --enable watson-mqtt-message-rule message-to-hello-trigger hello-action`

 4. So once there are any rss updates that trigger events, you can verify the action was invoked by checking the most recent activations:

 `$WSK_CLI activation list --limit 1  hello`

 ```
 activations
 f9d41bd2589943efa4f36c5cf1f55b44             hello
 ```

 `$WSK_CLI activation result f9d41bd2589943efa4f36c5cf1f55b44`

 ```
 {
     "payload": "hello,Lorem ipsum 2016-09-13T03:05:57+00:00!descriptionUllamco esse officia cillum exercitation ullamco aute aute quis adipisicing officia."
 }
 ```
## How to do tests
The integration test could only be performed with a local OpenWhisk deployment:

   1. Copy your test files into `openwhisk/tests/src/packages`   
   2. `vagrant ssh` to your local vagrant environment      
   3. Navigate to the openwhisk directory   
   4. Run this command - `gradle :tests:test --tests "packages.CLASS_NAME`   

To execute all tests, run `gradle :tests:test`

## Contributing
Please refer to [CONTRIBUTING.md](CONTRIBUTING.md)

## License
Copyright 2016 IBM Corporation

Licensed under the [Apache License, Version 2.0 (the "License")](http://www.apache.org/licenses/LICENSE-2.0.html).

Unless required by applicable law or agreed to in writing, software distributed under the license is distributed on an "as is" basis, without warranties or conditions of any kind, either express or implied. See the license for the specific language governing permissions and limitations under the license.
