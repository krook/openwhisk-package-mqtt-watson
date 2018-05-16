# OpenWhisk MQTT Package for Watson IoT

This package provides a mechanism to trigger OpenWhisk actions when messages are received on an MQTT topic in the Watson IoT Platform. It sets up a Cloud Foundry application that can be configured to listen to one or more topics on a persistent connection, then invokes the registered actions as a feed action.

This package targets OpenWhisk developers who are building serverless applications and need integration with the Watson implementation of MQTT to trigger actions. You can add this package to your existing OpenWhisk namespace alongside your other actions, triggers, and rules.

This package can also be run in a multi-tenant fashion by third parties that wish to provide a hosted implementation of the event provider with other OpenWhisk developers.

The code is based on the generic MQTT package originally created by [James Thomas](http://jamesthom.as/blog/2016/06/15/openwhisk-and-mqtt/). It differs in that it incorporates the credentials needed to connect to the Watson IoT platform, and in that it sets up the event provider as a Cloud Foundry application rather than a Docker container.

```
openwhisk-package-mqtt-watson/
├── actions
│      └── handler.js
├── CONTRIBUTING.md
├── feeds
│      └── feed-action.js
├── install.sh
├── LICENSE.txt
├── README.md
├── MqttWatsonEventProvider
│      ├── index.js
│      ├── manifest.yml
│      ├── package.json
│      └── lib
│          ├── feed_controller.js
│          ├── mqtt_subscription_manager.js
│          └── trigger_store.js
└── uninstall.sh
```

## Architecture

![Architecture](watson-mqtt-overview.png?raw=true "High Level Architecture")

## Package contents

Entity                                  | Type    | Description
--------------------------------------- | ------- | -------------------------------------
`/namespace/mqtt-watson`                | package | OpenWhisk Package for Watson IoT MQTT
`/namespace/mqtt-watson/feed-action.js` | action  | Subscribes to a Watson IoT MQTT topic

### Feeds

The main feed action in this package is `feed-action.js`. When a trigger is associated to this action, it causes the action to subscribe to an MQTT topic as an application (not a device) so that it can receive messages that will in turn trigger your custom actions.

#### Parameters

**Parameter** | **Type** | **Required** | **Description**             | **Example**
------------- | -------- | ------------ | --------------------------- | -------------------------------------------------------------
url           | _string_ | yes          | URL to Watson IoT MQTT feed | "ssl://a-123xyz.messaging.internetofthings.ibmcloud.com:8883"
topic         | _string_ | yes          | Topic subscription          | "iot-2/type/+/id/+/evt/+/fmt/json"
username        | _string_ | yes          | Watson IoT API key          | "a-123xyz"
password      | _string_ | yes          | Watson IoT API token        | "+-derpbog"
client        | _string_ | yes          | Application client id       | "a:12e45g:mqttapp"

## Watson IoT MQTT Service (Event Provider) Deployment

In order to support integration with the Watson IoT environment we need an event feed that fires a trigger in the OpenWhisk environment when messages are received. This service connects to a particular MQTT topic and then invokes the triggers that are registered for a given topic. It has its own Cloudant database to persist the topic-to-trigger subscription information. You will need to initialize this database prior to using this service.

### Bluemix Deployment

This service can be hosted as a Cloud Foundry application. To deploy on IBM Bluemix:

1. Create a Cloudant service on Bluemix, name it `cloudant-mqtt-watson` and create a database named `topic_listeners`.

2. Create a view for that Cloudant database, by creating a new design document with the following content. It provides a way to query for the subscriptions.

  ```json
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

3. Change to the `MqttWatsonEventProvider` directory.

4. Change the name and host fields as necessary in `manifest.yml`.

5. Run `cf push` and take note of the generated hostname route.

## Watson IoT MQTT Package Installation

### Bluemix Installation

First you need to install the `bx wsk` CLI, follow the instructions at <https://new-console.ng.bluemix.net/openwhisk/cli>

This step assumes you've already deployed the Event Provider application. If not, see the section above.

`./install.sh openwhisk.ng.bluemix.net $AUTH_KEY PROVIDER_ENDPOINT`

Where:

- **$AUTH_KEY** is the OpenWhisk authentication key (Run `wsk property get` to obtain it)
- **$PROVIDER_ENDPOINT** is the endpoint of the event provider service running as a Cloud Foundry application on Bluemix. It's a fully qualified URL including the path to the resource. i.e. <http://mqtt-watson-${random-word}.mybluemix.net/mqtt-watson>

To uninstall:

`./uninstall.sh openwhisk.ng.bluemix.net $AUTH_KEY $WSK_CLI`

## Usage of Watson MQTT package

To use this trigger feed, you need to pass all of the required parameters (refer to the table above)

```bash
bx wsk trigger create subscription-event-trigger \
  --feed mqtt-watson/feed-action \
  --param topic "$WATSON_TOPIC" \
  --param url "ssl://$WATSON_TEAM_ID.messaging.internetofthings.ibmcloud.com:8883" \
  --param username "$WATSON_username" \
  --param password "$WATSON_password" \
  --param client "$WATSON_client"
```

For example:

```bash
bx wsk trigger create subscription-event-trigger \
  --feed mqtt-watson/feed-action \
  --param topic "iot-2/type/+/id/+/evt/+/fmt/json" \
  --param url "ssl://12e45g.messaging.internetofthings.ibmcloud.com:8883" \
  --param username "a-123xyz" \
  --param password "+-derpbog" \
  --param client "a:12e45g:mqttapp"
```

## Associate Watson MQTT trigger and action by using rule

1. Create a new trigger, using the example above.

2. See the [`handler.js`](actions/handler.js) file that reacts to the trigger events with action code below:

  ```javascript
  function main(params) {
    // Read the MQTT inbound message JSON, removing newlines.
    var service = JSON.parse(params.body.replace(/\r?\n|\r/g, ''));
    var serial = service.serial || "xxxxxx";
    var reading = service.reading || 100;
    return { payload: 'Device with serial: ' + serial + '!'+ ' emitted a reading: ' + reading };
  }
  ```

  Upload the action: `bx wsk action create handler actions/handler.js`

3. Create the rule that associate the trigger and the action: `bx wsk rule create handle-topic-message-rule subscription-event-trigger handler`

4. Post a message to the MQTT topic that triggers events you have subscribed to:

  ```json
  {
   "serial": "aaaabbbbcccc",
   "reading": "15"
  }
  ```

5. Verify the action was invoked by checking the most recent activations:

  `bx wsk activation list --limit 1 handler`

  ```
  activations
  f9d41bd2589943efa4f36c5cf1f55b44             handler
  ```

  `bx wsk activation result f9d41bd2589943efa4f36c5cf1f55b44`

  ```json
  {
   "payload": "Device with serial: 123456 emitted a reading: 15"
  }
  ```

  To delete the rule, trigger, and action:

  ```bash
  bx wsk rule disable handle-topic-message-rule
  bx wsk rule delete handle-topic-message-rule
  bx wsk trigger delete subscription-event-trigger
  bx wsk action delete handler
  ```

## Contributing

Please refer to [contribution guidelines](CONTRIBUTING.md).


## License
[Apache 2.0](LICENSE.txt)
