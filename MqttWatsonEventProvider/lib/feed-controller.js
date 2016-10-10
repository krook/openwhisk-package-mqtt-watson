'use strict';

const mqtt = require('mqtt');
const openwhisk = require('openwhisk');
const MQTTSubscriptionMgr = require('./mqtt-subscription-manager.js');
const TriggerStore = require('./trigger-store.js');

class FeedController {
    constructor (db, ow_endpoint) {
        this.mqtt-subscription-manager = new MQTTSubscriptionMgr(mqtt);
        this.trigger-store = new TriggerStore(db);
        this.ow_endpoint = ow_endpoint;
    }

    initialise () {
        const mgr = this.mqtt-subscription-manager;
        mgr.on('message', (url, topic, message) => this.on_message(url, topic, message));
        mgr.on('connected', url => this.on_conn_status('connected', url));
        mgr.on('disconnected', url => this.on_conn_status('disconnected', url));

        return this.trigger-store.subscribers().then(subscribers => {
            subscribers.forEach(s => mgr.subscribe.apply(mgr, s.topic.split('#')));
        }).catch(err => {
            console.error('Error initialising subscribers from CouchDB store.' , err.reason);
            return Promise.reject('Unable to initialise due to store failure.');
        });
    }
    
    on_conn_status (status, url) {
        const params = {type: 'status', body: status};
        this.trigger-store.triggers(url).then(triggers => {
           triggers.forEach(trigger => this.fire_trigger(trigger, params));
        }).catch(err => console.error('Unable to forward connection status to triggers.', err))
    }

    on_message (url, topic, message) {
        console.log(`Message received (${url}) #${topic}: ${message}`);
        const params = {type: 'message', body: message};
        this.trigger-store.triggers(url, topic).then(triggers => {
            triggers.forEach(trigger => this.fire_trigger(trigger, params));
        }).catch(err => console.error('Unable to forward message to triggers.', err.reason))
    }

    fire_trigger (trigger, params) {
        console.log(`Firing trigger: ${trigger.trigger}`, params);
        const namespace = trigger.trigger.split('/')[0];
        const name = trigger.trigger.split('/')[1];
        var ow = openwhisk({api: this.ow_endpoint, api_key: `${trigger.username}:${trigger.password}`, namespace: namespace});
        ow.triggers.invoke({triggerName: name, params: params})
          .catch(err => console.error(`Failed to fire trigger ${trigger.trigger}`, err.reason))
    }

    // trigger: trigger (namespace/name), url, topic, username, password, apiKey, apiToken, clientId
    add_trigger (trigger) {
        const mgr = this.mqtt-subscription-manager;
        return this.trigger-store.add(trigger).then(() => { 
            mgr.subscribe(trigger.url, trigger.topic, trigger.apiKey, trigger.apiToken, trigger.clientId);
            if (mgr.is_connected(trigger.url)) {
               const params = {type: 'status', body: 'connected'};
               this.fire_trigger(trigger, params);
            }
        })
    }

    remove_trigger (namespace, trigger) {
        const mgr = this.mqtt-subscription-manager;
        return this.trigger-store.remove(`${namespace}/${trigger}`).then(() => mgr.unsubscribe(trigger.url, trigger.topic));
    }
}

module.exports = FeedController