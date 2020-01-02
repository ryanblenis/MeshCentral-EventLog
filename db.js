/** 
* @description MeshCentral-EventLog database module
* @author Ryan Blenis
* @copyright Ryan Blenis 2019
* @license Apache-2.0
*/

"use strict";
require('promise');
var Datastore = null;

module.exports.CreateDB = function(meshserver) {
    var obj = {};
    obj.dbVersion = 2;
    const expireLogEntrySeconds = (60 * 60 * 24 * 30); // 30 days
    if (meshserver.args.mongodb) { // use MongDB
      require('mongodb').MongoClient.connect(meshserver.args.mongodb, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, client) {
          if (err != null) { console.log("Unable to connect to database: " + err); process.exit(); return; }
          Datastore = client;
          
          var dbname = 'meshcentral';
          if (meshserver.args.mongodbname) { dbname = meshserver.args.mongodbname; }
          const db = client.db(dbname);
          
          obj.eventsFile = db.collection('plugin_eventlog');
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
          
          obj.settingsFile = db.collection('plugin_eventlog_settings');
          
          obj.addEventsFor = function(nodeid, events) {
              if (Object.getOwnPropertyNames(events).length == 6 && events.LogName) events = [ events ];
              for (const [i, e] of Object.entries(events)) {
                  e.time = new Date();
                  e.nodeid = nodeid;
                  e.TimeCreated = e.TimeCreated.match(/\d+/g);
                  obj.eventsFile.insertOne(e);
              }
          };
          
          obj.getEventsFor = function(nodeid, opts, callback) {
              let proj = { nodeid: nodeid };
              if (opts.historyEnabled === false) {
                callback(null);
                return;
              }
              if (opts.historyLogs) {
                proj.LogName = { $in: opts.historyLogs.split(',') };
              }
              if (opts.historyEntryTypes) {
                proj.Level = { $in: opts.historyEntryTypes.map((n) => Number(n)) };
              }
              obj.eventsFile.find(proj).sort({ TimeCreated: -1 }).toArray(function (err, events) {
                  callback(events);
              });
          };
          obj.getLastEventFor = function(nodeid, callback) {
              obj.eventsFile.find({ nodeid: nodeid }).sort({ TimeCreated: -1 }).limit(1).toArray(function (err, events) {
                  callback(events);
              });
          };
          obj.updateDefaultConfig = function(args) {
              args.type = 'configSet';
              args.uid = Math.random().toString(32).replace('0.', '');
              return obj.settingsFile.updateOne({default: true}, { $set: args }, {upsert: true});
          };
          obj.updateConfig = function(id, args) {
              if (args._id != null) delete args._id;
              args.type = "configSet";
              args.uid = Math.random().toString(32).replace('0.', '');
              if (id == '_new') return obj.settingsFile.insertOne(args);
              id = require('mongodb').ObjectID(id);
              return obj.settingsFile.updateOne({_id: id}, { $set: args }, {upsert: true});
          };
          obj.getAllConfigSets = function() {
              return obj.settingsFile.find({type: "configSet"}).project({type: 0}).toArray();
          };
          obj.deleteConfigSet = function(id) {
              id = require('mongodb').ObjectID(id);
              return obj.settingsFile.deleteOne({_id: id});
          };
          obj.assignConfig = function(configId, sel) {
              if (configId == '') configId = "default";
              // multiple selections may not update, we need to delete and insert here
              return obj.settingsFile.deleteMany({type: "assignedConfig", asset: { $in: sel } })
              .then(() => {
                  if (configId == '_clear') { return; }
                  var inserts = [];
                  sel.forEach((s) => {
                      inserts.push({
                        type: "assignedConfig",
                        asset: s,
                        configId: configId
                      });
                  });
                  return obj.settingsFile.insertMany(inserts);
              })
              .catch((e) => console.log("EVENTLOG: Error assigning configs: ", e));
          }
          obj.getConfigAssignments = function() {
              return obj.settingsFile.find( { type: "assignedConfig" } ).project( { _id: 0, asset: 1, configId: 1 } ).toArray();
          }
          obj.checkConfigAuth = function(uid) {
            return obj.settingsFile.countDocuments( { type: "configSet", uid: uid } );
          }
          obj.getConfigFor = function(nodeId, meshId) {
            return new Promise(function(resolve, reject) {
              obj.getConfigAssignments()
              .then((ca) => {
                  var configId = 'default';
                  ca.forEach((a) => {
                    if (a.asset == meshId) configId = a.configId;
                  });
                  ca.forEach((a) => {
                    if (a.asset == nodeId) configId = a.configId;
                  });
                  return configId;
              }).then((configId) => {
                var configBlob = null;
                obj.getAllConfigSets()
                .then((sets) => {
                  sets.forEach((s) => {
                    if (configId == 'default' && s.default === true) configBlob = s;
                    else if (s._id == configId) configBlob = s;
                  });
                  resolve(configBlob);
                });
              })
              .catch((e) => console.log('EVENTLOG: Error getting config for: ', e));
        });
      };
          obj.checkForDefault = function() {
              obj.getAllConfigSets()
              .then((cfgs) => {
                  if (cfgs.length == 0) {
                      obj.updateDefaultConfig({
                        name: 'Default',
                        liveLogs: 'Application,System',
                        liveNum: 100,
                        liveEntryTypes: [2,3],
                        historyEnabled: true,
                        historyLogs: 'Application,System',
                        historyEntryTypes: [2,3]
                      });
                  }
              });
          };
          obj.updateDBVersion = function(new_version) {
            return obj.settingsFile.updateOne({type: "db_version"}, { $set: {version: new_version} }, {upsert: true});
          };
          
          obj.getDBVersion = function() {
              return new Promise(function(resolve, reject) {
                  obj.settingsFile.find( { type: "db_version" } ).project( { _id: 0, version: 1 } ).toArray(function(err, vers){
                      if (vers.length == 0) resolve(1);
                      else resolve(vers[0]['version']);
                  });
              });
          };
          
          obj.getDBVersion().then(function(current_version){
              if (current_version < 2) {
                  var etsi = ['LogAlways', 'Critical', 'Error', 'Warning', 'Info', 'Verbose'];
                  obj.eventsFile.find().sort({ TimeCreated: -1 }).toArray(function (err, events) {
                      for (let [i, e] of Object.entries(events)) {
                          if (e.LevelDisplayName != '') {
                              e.Level = etsi.indexOf(e.LevelDisplayName);
                              delete e.LevelDisplayName;
                              obj.eventsFile.updateOne({_id: e._id}, {$set: e, $unset: {LevelDisplayName: ""} });
                          }
                      }
                  });
                  
                  obj.updateDBVersion(2);
              }
          });
          obj.checkForDefault();
    });  
    } else { // use NeDb
        Datastore = require('nedb');
        if (obj.eventsFile == null) {
            obj.eventsFile = new Datastore({ filename: meshserver.getConfigFilePath('plugin-eventlog-events.db'), autoload: true });
            obj.eventsFile.persistence.setAutocompactionInterval(40000);
            obj.eventsFile.ensureIndex({ fieldName: 'nodeid' });
            obj.eventsFile.ensureIndex({ fieldName: 'TimeCreated' });
            obj.eventsFile.ensureIndex({ fieldName: 'time', expireAfterSeconds: expireLogEntrySeconds });
        }
        if (obj.settingsFile == null) {
            obj.settingsFile = new Datastore({ filename: meshserver.getConfigFilePath('plugin-eventlog-settings.db'), autoload: true });
            obj.settingsFile.persistence.setAutocompactionInterval(40000);
        }
        
        obj.addEventsFor = function(nodeid, events) {
            if (Object.getOwnPropertyNames(events).length == 6 && events.LogName) events = [ events ];
            for (const [i, e] of Object.entries(events)) {
                e.time = new Date();
                e.nodeid = nodeid;
                e.TimeCreated = e.TimeCreated.match(/\d+/g);
                obj.eventsFile.insert(e);
            }
        };
        obj.getEventsFor = function(nodeid, opts, callback) {
            let proj = { nodeid: nodeid };
            if (opts.historyEnabled === false) {
              callback(null);
              return;
            }
            if (opts.historyLogs) {
              proj.LogName = { $in: opts.historyLogs.split(',') };
            }
            if (opts.historyEntryTypes) {
              proj.Level = { $in: opts.historyEntryTypes.map((n) => Number(n)) };
            }
            obj.eventsFile.find(proj).sort({ TimeCreated: -1 }).exec(function (err, events) {
                callback(events);
            });
        };
        obj.getLastEventFor = function(nodeid, callback) {
            obj.eventsFile.find({ nodeid: nodeid }).sort({ TimeCreated: -1 }).limit(1).exec(function (err, events) {
                callback(events);
            });
        };
        obj.updateDefaultConfig = function(args) {
            args.type = 'configSet';
            args.uid = Math.random().toString(32).replace('0.', '');
            return obj.settingsFile.update({default: true}, { $set: args }, {upsert: true});
        };
        obj.updateConfig = function(id, args) {
            return new Promise(function(resolve, reject) {
                if (args._id != null) delete args._id;
                args.type = "configSet";
                args.uid = Math.random().toString(32).replace('0.', '');
                args.type = "configSet";
                if (id == '_new') { 
                    obj.settingsFile.insert(args, function(err, newDocs) { 
                        if (err) reject(err);
                        newDocs.insertedId = newDocs._id;
                        resolve(newDocs);
                    });  
                } else {
                    obj.settingsFile.update({_id: id}, { $set: args }, {upsert: true, returnUpdatedDocs: true}, function(err, numDocs, upDocs) {
                        if (err) reject(err);
                        upDocs.insertedId = upDocs._id;
                        resolve(upDocs);
                    });
                }
            });
        };
        obj.getAllConfigSets = function(callback) {
            return new Promise(function(resolve, reject) {
                obj.settingsFile.find({type: "configSet"}).exec((err, sets) => {
                  if (err) reject(err);
                  resolve(sets);
                });
            });
        };
        obj.deleteConfigSet = function(id) {
            return new Promise(function(resolve, reject) {
                obj.settingsFile.remove({_id: id}, (err, numRemoved) => {
                    if (err) reject(err);
                    resolve(numRemoved);
                });
            });
        };
        obj.assignConfig = function(configId, sel) {
            return new Promise(function(resolve, reject) {
                if (configId == '') configId = "default";
                // multiple selections may not update, we need to delete and insert here
                obj.settingsFile.remove({type: "assignedConfig", asset: { $in: sel } },() => {
                      var inserts = [];
                      sel.forEach((s) => {
                          inserts.push({
                            type: "assignedConfig",
                            asset: s,
                            configId: configId
                          });
                      });
                      obj.settingsFile.insert(inserts, () => resolve());
                  }
                )
            });
        }
        obj.getConfigAssignments = function(callback) {
            return new Promise(function(resolve, reject) {
                obj.settingsFile.find( { type: "assignedConfig" }, { _id: 0, asset: 1, configId: 1 } ).exec((err, docs) => {
                  resolve(docs);
                });
            });
        }
        obj.checkConfigAuth = function(uid) {
          return new Promise(function(resolve, reject) {
              obj.settingsFile.count( { type: "configSet", uid: uid } , function(err, count){
                  resolve(count);
              });
          });
        }
        obj.getConfigFor = function(nodeId, meshId) {
          return new Promise(function(resolve, reject) {
            obj.getConfigAssignments()
            .then((ca) => {
                var configId = 'default';
                ca.forEach((a) => {
                  if (a.asset == meshId) configId = a.configId;
                });
                ca.forEach((a) => {
                  if (a.asset == nodeId) configId = a.configId;
                });
                return configId;
            }).then((configId) => {
              var configBlob = null;
              obj.getAllConfigSets()
              .then((sets) => {
                sets.forEach((s) => {
                  if (configId == 'default' && s.default === true) configBlob = s;
                  else if (s._id == configId) configBlob = s;
                });
                resolve(configBlob);
              });
            })
            .catch((e) => console.log('EVENTLOG: Error getting config for: ', e));
        });
      };
      
      obj.checkForDefault = function() {
          obj.getAllConfigSets()
          .then((cfgs) => {
              if (cfgs.length == 0) {
                  obj.updateDefaultConfig({
                    name: 'Default',
                    liveLogs: 'Application,System',
                    liveNum: 100,
                    liveEntryTypes: [2,3],
                    historyEnabled: true,
                    historyLogs: 'Application,System',
                    historyEntryTypes: [2,3]
                  });
              }
          });
      };
      
      obj.updateDBVersion = function(new_version) {
        return new Promise(function(resolve, reject) {
            obj.settingsFile.update({type: "db_version"}, { $set: {version: new_version} }, {upsert: true}, function(err, upDocs) {
                if (err) reject(err);
                resolve(upDocs);
            });
        });
      };
      
      obj.getDBVersion = function() {
        return new Promise(function(resolve, reject) {
            obj.settingsFile.find( { type: "db_version" }, { _id: 0, version: 1 } ).exec((err, docs) => {
              if (docs.length == 0) { resolve(1); }
              else resolve(docs[0]['version']);
            });
        });
      };
      
      obj.getDBVersion().then(function(current_version){
          if (current_version < 2) {
              var etsi = ['LogAlways', 'Critical', 'Error', 'Warning', 'Info', 'Verbose'];
              obj.eventsFile.find().sort({ TimeCreated: -1 }).exec(function (err, events) {
                  for (let [i, e] of Object.entries(events)) {
                      if (e.LevelDisplayName != '') {
                          e.Level = etsi.indexOf(e.LevelDisplayName);
                          delete e.LevelDisplayName;
                          obj.eventsFile.update({_id: e._id}, {$set: e, $unset: {LevelDisplayName: ""} });
                      }
                  }
              });
              
              obj.updateDBVersion(2);
          }
      });
      
      obj.checkForDefault();
    }
    
    return obj;
}