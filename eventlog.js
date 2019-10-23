/** 
* @description MeshCentral event log plugin
* @author Ryan Blenis
* @copyright 
* @license Apache-2.0
* @version v0.0.5
*/

"use strict";

module.exports.eventlog = function (parent) {
    var obj = {};
    
    obj.parent = parent;
    obj.meshServer = parent.parent;
    
    // This should be updated to contain functions that need to be brought to the
    //   front end for processing. (If they need to be accessed in the GUI, they should be here)
    obj.exports = [
      'registerPluginTab',
      'on_device_page',
      'fe_on_message',
      'onRemoteEventLogStateChange',
      'createRemoteEventLog',
      'onDeviceRefreshEnd',
      'showLog'
    ];
    
    obj.server_startup = function() {
        // obj.parent.parent.debug('plugin:eventlog', 'Starting eventlog plugin with server');
        // we don't actually need to do anything here yet, but leaving it as a placeholder/example
        console.log(Object.keys(obj.meshServer));
    };
    
    obj.consoleaction = function() {
        // due to this code running on the client side, this hook is actually contained 
        //   in the ./modules_meshcore/eventlog.js (note kept here for informational purposes)
    };
    
    // called to notify the web server that there is a new tab in town
    obj.registerPluginTab = function() {
      return {
        tabTitle: "Event Log",
        tabId: "pluginEventLog"
      };
    };
    
    // called to get the content for that tabs data
    obj.on_device_page = function() {
      return '<div id=pluginEventLog></div>';
    };
    
    obj.showLog = function(which) {
        var x = Q('eventlogentry').querySelectorAll(".eventLogLogType");
        
        if (x.length)
        for (const i in Object.values(x)) {
            if (!x[i].classList.contains('logType'+which)) {
                x[i].style.display = 'none';
            } else {
                x[i].style.display = '';
            }
        }
    };
    
    // called when a new plugin message is received on the front end
    obj.fe_on_message = function(server, message) {
      var data = JSON.parse(message);
      if (data.type == 'close') {
        pluginHandler.eventlog.livelog.Stop();
        pluginHandler.eventlog.livelog = null;
        return;
      }
      if (!Q('eventlogentry')) {
            var cstr = `<div id=eventlogentry>
                <style>
                #pluginEventLog > div > div > span {
                  width: 150px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  float:left;
                  padding: 2px;
                  margin: 0;
                  display: inline-block;
                }
                #pluginEventLog > div > div.eventLogLogType {
                      padding: 2px;
                      display: inline-block;
                }
                #pluginEventLog > div > div.eventLogLogType:nth-child(odd) {
                      background-color: #CCC;
                }
                #eventLogLogNav {
                    padding: 3px;
                    margin: 3px;
                    border: 1px solid;
                    display: inline-block;
                }
                #eventLogLogNav > span {
                    cursor: pointer;
                }
                #pluginEventLog > div > div > span.eventlogcLevelDisplayName {
                    width: 100px;
                }
                #pluginEventLog > div > div > span.eventlogcTimeCreated {
                    width: 150px;
                }
                #pluginEventLog > div > div > span.eventlogcProviderName {
                    width: 200px;
                }
                #pluginEventLog > div > div > span.eventlogcMessage {
                    width: 400px;
                }
                #pluginEventLog > div > div > span.eventlogcId {
                    width: 50px;
                }
                </style>
                <div id=eventLogLogNav><span onclick="return pluginHandler.eventlog.showLog('Application');">Application</span><span onclick="return pluginHandler.eventlog.showLog('System');">System</span></div>
                <div style="clear: both;"></div></div>`;
                QH('pluginEventLog', cstr);
      }
      var str = '';
      for (var i in data) {
        str = '';
        var skip = false;
        for (const e of data[i]) {
          str += '<div class="eventLogLogType logType'+e.LogName+'">';
          for (let [k, v] of Object.entries(e)) {
            skip = false;
            switch (k) {
              case 'LogName': {
                  skip = true;
              break;
              }
              case 'TimeCreated': {
                v = v.match(/\d+/g);
                v = new Date(Number(v)).toLocaleDateString() +' '+ new Date(Number(v)).toLocaleTimeString();
              break;
              }
              case 'LevelDisplayName': {
                  if (v == 'null') {
                      v = 'Error';
                  }
              break;
              }
              default: { break; }
            }
            if (!skip) str += '<span class=eventlogc'+k+' title="'+v+'">'+v+'</span>';
          }
          str += '</div>';
        }
        str += '</div>';
        QA('eventlogentry', str);
      }
      //pluginHandler.eventlog.livelog.Stop();
      //pluginHandler.eventlog.livelog = null;
    };
    
    obj.onRemoteEventLogStateChange = function(xdata, state) {
        var str = StatusStrs[state];
        if (pluginHandler.eventlog.webRtcActive == true) { str += ', WebRTC'; }
        switch (state) {
            case 0:
                if (pluginHandler.eventlog.livelog != null) {
                  pluginHandler.eventlog.livelog.Stop(); 
                  pluginHandler.eventlog.livelog = null; 
                  QH('pluginEventLog', '');
                }
                break;
            case 3:
                if (pluginHandler.eventlog.livelog) {
                  pluginHandler.eventlog.livelog.sendText({ action: 'plugin', plugin: 'eventlog', pluginaction: 'getlivelogs' });
                }
                break;
            default:
                //console.log('unknown state change', state);
            break;
        }
    }
    
    obj.createRemoteEventLog = function(onEventLogUpdate) {
        var myobj = { protocol: 7 }; // we're a plugin
        myobj.onEventLogUpdate = onEventLogUpdate;
        myobj.xxStateChange = function(state) { }
        myobj.ProcessData = function(data) { onEventLogUpdate(null, data); }
        return myobj;
    }
    
    obj.onDeviceRefreshEnd = function(nodeid, panel, refresh, event) {
      pluginHandler.registerPluginTab(pluginHandler.eventlog.registerPluginTab);
      QH('p19pages', pluginHandler.eventlog.on_device_page());
      if (typeof pluginHandler.eventlog.livelog == 'undefined') { pluginHandler.eventlog.livelog = null; }
      QH('pluginEventLog', ''); pluginHandler.eventlog.livelog = null;
      if (!pluginHandler.eventlog.livelog) {
          pluginHandler.eventlog.livelognode = currentNode;
          // Setup a mesh agent files
          pluginHandler.eventlog.livelog = CreateAgentRedirect(meshserver, pluginHandler.eventlog.createRemoteEventLog(pluginHandler.eventlog.fe_on_message), serverPublicNamePort, authCookie, authRelayCookie, domainUrl);
          pluginHandler.eventlog.livelog.attemptWebRTC = attemptWebRTC;
          pluginHandler.eventlog.livelog.onStateChanged = pluginHandler.eventlog.onRemoteEventLogStateChange;
          pluginHandler.eventlog.livelog.onConsoleMessageChange = function () {
              if (pluginHandler.eventlog.livelog.consoleMessage) {
                  console.log('console message available. ', pluginHandler.eventlog.livelog.consoleMessage)
              }
          }
          pluginHandler.eventlog.livelog.Start(pluginHandler.eventlog.livelognode._id);
      } else {
          //QH('Term', '');
          pluginHandler.eventlog.livelog.Stop();
          pluginHandler.eventlog.livelog = null;
      }
    };
    
    // data was sent to server from the client. do something with it.
    obj.serveraction = function(command, myparent, grandparent) {
      var myobj = {};
      myobj.parent = myparent;
      switch (command.pluginaction) {
        case 'sendlog': {
          command.method = 'fe_on_message';
          if (command.sessionid != null) {
              if (typeof command.sessionid != 'string') break;
              var splitsessionid = command.sessionid.split('/');
              // Check that we are in the same domain and the user has rights over this node.
              if ((splitsessionid[0] == 'user') && (splitsessionid[1] == myobj.parent.domain.id)) {
                  // Check if this user has rights to get this message
                  //if (mesh.links[user._id] == null || ((mesh.links[user._id].rights & 16) == 0)) return; // TODO!!!!!!!!!!!!!!!!!!!!!
                  
                  // See if the session is connected. If so, go ahead and send this message to the target node
                  var ws = grandparent.wssessions2[command.sessionid];
                  if (ws != null) {
                      command.nodeid = parent.dbNodeKey; // Set the nodeid, required for responses.
                      delete command.sessionid;       // Remove the sessionid, since we are sending to that sessionid, so it's implyed.
                      try { ws.send(JSON.stringify(command)); } catch (ex) { }
                  }
              }
          } else {
            
          }
          
          break;
        }
        case 'gatherlogs': { // submit logs to server db
            try {
                var db = require (__dirname + '/db.js').CreateDB(grandparent.parent);
                //console.log('Gathering logs for: '+myparent.dbNodeKey+' with data', command.data);
                db.addEventsFor(myparent.dbNodeKey, JSON.parse(command.data));
                db.getLastEventFor(myparent.dbNodeKey, function (rec) {
                    // send a message to the endpoint verifying receipt
                    // temp: fake a console message until the below makes it into master project
                
                    myparent.send(JSON.stringify({ 
                        action: 'msg', 
                        type: 'console', 
                        nodeid: myparent.dbNodeKey, 
                        rights: true,
                        sessionid: true,
                        value: 'plugin eventlog setLVDOC '+rec[0].TimeCreated[0]
                    }));
                    // waiting for pull request to master to support this
                    /*myparent.send(JSON.stringify({ 
                        action: 'plugin', 
                        pluginaction: 'setLVDOC2', 
                        plugin: 'eventlog',
                        nodeid: myparent.dbNodeKey, 
                        rights: true,
                        sessionid: true,
                        value: rec[0].TimeCreated[0]
                    }));*/
                
                });
              } catch (e) { console.log('Error gathering logs: ', e.stack); } 
            
        }
        default: {
          break;
        }
      }
    }
    
    return obj;
};
