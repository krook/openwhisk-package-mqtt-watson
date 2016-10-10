# OpenWhisk MQTT Package for Watson IoT
==========================

This package provides a mechanism to trigger OpenWhisk actions when messages are received on an MQTT topic in the Watson IoT Platform. It sets up a Cloud Foundry application that can be configured to listen to one or more topics on a persistent connection, then invokes the registered actions as a feed action.

This package targets OpenWhisk developers who are building serverless applications and need integration with the Watson implementation of MQTT. You can add this package to your existing OpenWhisk namespace alongside your other actions, triggers, and rules.

This package can also be run in a multitenanted fashion by third parties that want to provide and share an implementation of the event provider with other OpenWhisk developers.

The code is based on the generic MQTT package originally created by [James Thomas](http://jamesthom.as/blog/2016/06/15/openwhisk-and-mqtt/). It differs in that it incorporates the credentials needed to connect to the Watson IoT platform, and in that it sets up the event provider as a Cloud Foundry application rather than a Docker container.

```
openwhisk-package-mqtt-watson/
├── actions
│      └── handler-action.js
├── CONTRIBUTING.md
├── feeds
│      └── feed-action.js
├── install.sh
├── LICENSE.txt
├── README.md
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
![Architecture](watson-mqtt-overview.png?raw=true "High Level Architecture")

## Package contents
| Entity | Type | Description |
| --- | --- | --- |
| `/namespace/mqtt-watson` | package | OpenWhisk Package for Watson IoT MQTT |
| `/namespace/mqtt-watson/feed-action.js` | action | Subscribes to a Watson IoT MQTT topic |

### Feeds
The main feed action in this package is `feed-action.js`. When a trigger is associated to this action, it causes the action to subscribe to an MQTT topic as an application (not a device) so that it can receive messages that will in turn trigger your custom actions.

###### Parameters
| **Parameter** | **Type** | **Required** | **Description**| **Example** |
| ------------- | ---- | -------- | ------------ | ------- |
| url | *string* | yes |  URL to Watson IoT MQTT feed| "ssl://a-123xyz.messaging.internetofthings.ibmcloud.com:8883" |
| topic | *string* | yes |  Topic subscription  | "iot-2/type/+/id/+/evt/+/fmt/json" |
| apiKey | *string* | yes |  Watson IoT API key  | "a-123xyz" |
| apiToken | *string* | yes |  Watson IoT API token  | "+-derpbog" |
| client | *string* | yes |  Application client id  | "a:12e45g:mqttapp" |

## Watson MQTT Package Installation

### Bluemix Installation
First you need to install the `wsk` CLI, follow the instructions at https://new-console.ng.bluemix.net/openwhisk/cli

This step assumes you've already deployed the Event Provider application (or you are using the test one at `http://openwhisk-package-mqtt-watson.mybluemix.net/mqtt-watson`). If not, see the section below.

`./install.sh openwhisk.ng.bluemix.net $AUTH_KEY $WSK_CLI $PROVIDER_ENDPOINT`

`./uninstall.sh openwhisk.ng.bluemix.net $AUTH_KEY $WSK_CLI`

where:
- **$AUTH_KEY** is the OpenWhisk authentication key (Run `wsk property get` to obtain it)
- **$WSK_CLI** is the path of OpenWhisk command interface binary
- **$PROVIDER_ENDPOINT** is the endpoint of the event provider service running as a Cloud Foundry application on Bluemix. It's a fully qualified URL including the path to the resource. i.e. http://mqtt-watson-random-word.mybluemix.net/mqtt-watson


## Watson IoT MQTT Service (Event Provider) Deployment

In order to support integration with the Watson IoT environment there needs to be an event generating feed that fires a trigger in the OpenWhisk environment when messages are received. This service connects to a particular MQTT topic and then invokes the triggers that are registered for that topic. It has its own Cloudant/CouchDB database to persist the topic-to-trigger subscription information. You will need to initialize this database prior to using this service.

There are two options to deploy the service:

### Bluemix Deployment:
This service can be hosted as a Cloud Foundry application. To deploy on IBM Bluemix:

1. Create a Cloudant service on Bluemix, name it `cloudant-mqtt-watson` and create a database with name `topic_listeners`.
2. Create a view for that Cloudant database, by creating a new design document with this content. It will provide a way to query for the subscriptions.
```
{
  "_id": "_design/subscriptions",
  "views": {
    "host_topic_counts": {
      "reduce": "_sum",
      "map": "function (doc) {\n  emit(doc.url + '#' + doc.topic, 1);\n}"
    },
    "host_topic_triggers": {
      "map": "function (doc) {\n  emit(doc.url + '#' + doc.topic, {trigger: doc._id, username: doc.username, password: doc.password});\n}"
    },
    "all": {
      "map": "function (doc) {\n  emit(doc._id, doc.url + '#' + doc.topic);\n}"
    },
    "host_triggers": {
      "map": "function (doc) {\n  emit(doc.url, {trigger: doc._id, username: doc.username, password: doc.password});\n}"
    }
  }
}
```
3. Change the name and host fields in the manifest.yml to be unique. Bluemix requires routes to be globally unique.
4. Run `cf push`

## Usage of Watson MQTT package
To use this trigger feed, you need to pass all of the required parameters (refer to the table above)

```
$WSK_CLI trigger create subscription-event-trigger \
    -f mqtt-watson/feed-action \
    -p topic "$WATSON_TOPIC" \
    -p url "ssl://$WATSON_TEAM_ID.messaging.internetofthings.ibmcloud.com:8883" \
    -p apiKey "$WATSON_apiKey" \
    -p apiToken "$WATSON_apiToken" \
    -p clientId "$WATSON_CLIENT"
```

For example:
```
$WSK_CLI trigger create subscription-event-trigger \
    -f mqtt-watson/feed-action \
    -p topic "iot-2/type/+/id/+/evt/+/fmt/json" \
    -p url "ssl://12e45g.messaging.internetofthings.ibmcloud.com:8883" \
    -p apiKey "a-123xyz" \
    -p apiToken "+-derpbog" \
    -p clientId "a:12e45g:mqttapp"
```

To use trigger feed to delete the trigger.

`$WSK_CLI trigger delete subscription-event-trigger`

## Associate Watson MQTT trigger and action by using rule
 1. Create a new trigger, using the example above.

 2. Write a 'handler-action.js' file that reacts to the trigger events with action code below:
 ```
 function main(params) {
    // Read the MQTT inbound message JSON, removing newlines.
    var service = JSON.parse(params.body.replace(/\r?\n|\r/g, ''));
    var serial = service.serial || "xxxxxx";
    var reading = service.reading || 100;
    return { payload: 'Device with serial: ' + serial + '!'+ ' emitted a reading: ' + reading };
 }
 ```
 Upload the action:
 `$WSK_CLI action create handler-action actions/handler-action.js`

 3. Create the rule that associate the trigger and the action:
 `$WSK_CLI rule create --enable handle-topic-message-rule subscription-event-trigger handler-action`

 4. After posting a message to the MQTT topic that triggers events you have subscribed to, you can verify the action was invoked by checking the most recent activations:

 `$WSK_CLI activation list --limit 1 handler-action`

 ```
 activations
 f9d41bd2589943efa4f36c5cf1f55b44             handler-action
 ```

 `$WSK_CLI activation result f9d41bd2589943efa4f36c5cf1f55b44`

 ```
 {
     "payload": "Device with serial: 123456 emitted a reading: 15"
 }
 ```

## Contributing
Please refer to [CONTRIBUTING.md](CONTRIBUTING.md)

## License
Copyright 2016 IBM Corporation

Licensed under the [MIT license](LICENSE.txt).

Unless required by applicable law or agreed to in writing, software distributed under the license is distributed on an "as is" basis, without warranties or conditions of any kind, either express or implied. See the license for the specific language governing permissions and limitations under the license.
