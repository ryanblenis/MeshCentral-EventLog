/** 
* @description MeshCentral-EventLog database module
* @author Ryan Blenis
* @copyright Ryan Blenis 2019
* @license Apache-2.0
*/

"use strict";
var Datastore = null;

module.exports.CreateDB = function(meshserver) {
    var obj = {};
    const expireLogEntrySeconds = (60 * 60 * 24 * 30); // 30 days
    if (meshserver.args.mongodb) { // use MongDB
      require('mongodb').MongoClient.connect(meshserver.args.mongodb, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, client) {
          if (err != null) { console.log("Unable to connect to database: " + err); process.exit(); return; }
          Datastore = client;
          
          var dbname = 'meshcentral';
          if (meshserver.args.mongodbname) { dbname = meshserver.args.mongodbname; }
          const db = client.db(dbname);
          const dbcollectionname = 'plugin_eventlog';
          
          obj.eventsFile = db.collection(dbcollectionname);
          obj.eventsFile.indexes(function (err, indexes) {
              // Check if we need to reset indexes
              var indexesByName = {}, indexCount = 0;
              for (var i in indexes) { indexesByName[indexes[i].name] = indexes[i]; indexCount++; }
              if ((indexCount != 4) || (indexesByName['NodeID1'] == null) || (indexesByName['TimeCreated1'] == null) || (indexesByName['ExpireTime1'] == null)) {
                  // Reset all indexes
                  console.log('Resetting plugin (eventlog) indexes...');
                  obj.eventsFile.dropIndexes(function (err) {
                      obj.eventsFile.createIndex({ nodeid: 1 }, { name: 'NodeID1' });
                      obj.eventsFile.createIndex({ TimeCreated: 1 }, { name: 'TimeCreated1' });
                      obj.eventsFile.createIndex({ 'time': 1}, { expireAfterSeconds: expireLogEntrySeconds, name: 'ExpireTime1' });
                  });
              } else if (indexesByName['ExpireTime1'].expireAfterSeconds != expireLogEntrySeconds) {
                  // Reset the timeout index
                  console.log('Resetting plugin (eventlog) expire index...');
                  obj.eventsFile.dropIndex("ExpireTime1", function (err) {
                      obj.eventsFile.createIndex({ "time": 1 }, { expireAfterSeconds: expireLogEntrySeconds, name: 'ExpireTime1' });
                  });
              }
          });
          
          obj.addEventsFor = function(nodeid, events) {
              if (Object.getOwnPropertyNames(events).length == 6 && events.LogName) events = [ events ];
              for (const [i, e] of Object.entries(events)) {
                  e.time = new Date();
                  e.nodeid = nodeid;
                  e.TimeCreated = e.TimeCreated.match(/\d+/g);
                  obj.eventsFile.insertOne(e);
              }
          };
          
          obj.getEventsFor = function(nodeid, callback) {
              obj.eventsFile.find({ nodeid: nodeid }).sort({ TimeCreated: -1 }).toArray(function (err, events) {
                  callback(events);
              });
          };
          obj.getLastEventFor = function(nodeid, callback) {
              obj.eventsFile.find({ nodeid: nodeid }).sort({ TimeCreated: -1 }).limit(1).toArray(function (err, events) {
                  callback(events);
              });
          };
      });
      
    } else { // use NeDb
        const db = {
            eventsFile: null
        };
        Datastore = require('nedb');
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
    }
    
    
    return obj;
}