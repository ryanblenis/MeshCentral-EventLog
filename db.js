/** 
* @description MeshCentral-EventLog database module
* @author Ryan Blenis
* @copyright Ryan Blenis 2019
* @license Apache-2.0
* @version v0.0.1
*/

"use strict";

const Datastore = require('nedb');
const db = {
    eventsFile: null
};

module.exports.CreateDB = function(meshserver) {
    var obj = {};
    const expireLogEntrySeconds = (60 * 60 * 24 * 30); // 30 days
    
    if (db.eventsFile === null) {
        db.eventsFile = new Datastore({ filename: meshserver.getConfigFilePath('plugin-eventlog-events.db'), autoload: true });
        db.eventsFile.persistence.setAutocompactionInterval(40000);
        db.eventsFile.ensureIndex({ fieldName: 'nodeid' });
        db.eventsFile.ensureIndex({ fieldName: 'TimeCreated' });
        db.eventsFile.ensureIndex({ fieldName: 'time', expireAfterSeconds: expireLogEntrySeconds });
    }
    
    obj.eventsFile = db.eventsFile;
    
    obj.addEventsFor = function(nodeid, events) {
        if (Object.getOwnPropertyNames(events).length == 6 && events.LogName) events = [ events ];
        for (const [i, e] of Object.entries(events)) {
            e.time = new Date();
            e.nodeid = nodeid;
            e.TimeCreated = e.TimeCreated.match(/\d+/g);
            obj.eventsFile.insert(e);
        }
    };
    
    obj.getEventsFor = function(nodeid, callback) {
        obj.eventsFile.find({ nodeid: nodeid }).sort({ TimeCreated: -1 }).exec(function (err, events) {
            callback(events);
        });
    };
    obj.getLastEventFor = function(nodeid, callback) {
        obj.eventsFile.find({ nodeid: nodeid }).sort({ TimeCreated: -1 }).limit(1).exec(function (err, events) {
            callback(events);
        });
    };
    
    
    return obj;
}