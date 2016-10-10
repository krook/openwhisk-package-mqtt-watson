function main(params) {
    // Read the MQTT inbound message JSON, removing newlines.
    var service = JSON.parse(params.body.replace(/\r?\n|\r/g, ''));
    var serial = service.serial || "xxxxxx";
    var reading = service.reading || 100;
    return { payload: 'Device with serial: ' + serial + '!'+ ' emitted a reading: ' + reading };
}
