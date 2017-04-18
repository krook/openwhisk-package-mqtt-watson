/*
Users register new Feeds by providing a custom Action to the platform.
This Action is invoked each time the Feed is bound to a new Trigger.
Authentication credentials, supporting Trigger invocation through the
OpenWhisk API, are passed in as invocation parameters.
*/

var request = require('request');

function main(params) {
  return new Promise(function(resolve, reject) {
    if (params.lifecycleEvent === 'CREATE') {
      // These are the Watson IoT credentials, used for subscribing to the topic
      if (!params.hasOwnProperty('url') ||
          !params.hasOwnProperty('topic') ||
          !params.hasOwnProperty('apiKey') ||
          !params.hasOwnProperty('apiToken') ||
          !params.hasOwnProperty('clientId')) {
        reject('Missing mandatory feed properties, must include url, topic, apiKey, apiToken, and clientId.');
      } else {
        // These are the OpenWhisk credentials, used for setting up the trigger
        var user_pass = params.authKey.split(':');

        // Send both the OpenWhisk credentials and the Watson IoT credentials, topic, and URL
        var body = {
          trigger: params.triggerName.slice(1),
          url: params.url,
          topic: params.topic,
          username: user_pass[0],
          password: user_pass[1],
          apiKey: params.apiKey,
          apiToken: params.apiToken,
          clientId: params.clientId
        };
        console.dir(body);
        request({
          method: "POST",
          uri: params.provider_endpoint,
          json: body
        }, function(err, res, body) {
          if (!err && res.statusCode === 200) {
            console.log('MQTT feed: HTTP request success.');
            resolve();
          } else if (res) {
            console.log('MQTT feed: Error invoking provider: ', res.statusCode, body);
            reject(body.error);
          } else {
            console.log('MQTT feed: Error invoking provider: ', err);
            reject();
          }
        });
      }
    } else if (params.lifecycleEvent === 'DELETE') {
      request({
        method: "DELETE",
        uri: params.provider_endpoint + params.triggerName
      }, function(err, res, body) {
        if (!err && res.statusCode === 200) {
          console.log('MQTT feed: HTTP request success.');
          resolve();
        } else if (res) {
          console.log('MQTT feed: Error invoking provider: ', res.statusCode, body);
          reject(body.error);
        } else {
          console.log('MQTT feed: Error invoking provider: ', err);
          reject();
        }
      });
    } else {
      reject('Invalid lifecycleEvent: ' + params.lifecycleEvent);
    }
  });
}
