/** 
* @description MeshCentral event log plugin
* @author Ryan Blenis
* @copyright 
* @license Apache-2.0
* @version v0.0.1
*/

/*xjslint node: true */
/*xjslint plusplus: true */
/*xjslint maxlen: 256 */
/*jshint node: true */
/*jshint strict: false */
/*jshint esversion: 6 */
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
      'onDeviceRefreshEnd'
    ];
    
    obj.server_startup = function() {
      //obj.parent.parent.debug('plugin:eventlog', 'Starting eventlog plugin with server');
      // we don't actually need to do anything here yet, but leaving it as a placeholder/example
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
    
    // called when a new plugin message is received on the front end
    obj.fe_on_message = function(server, message) {
      var data = JSON.parse(message);
      if (data.type == 'close') {
        pluginHandler.eventlog.livelog.Stop();
        pluginHandler.eventlog.livelog = null;
        return;
      }
      var str = '';
      for (var i in data) {
        str = '';
        str += `<div class=eventlogentry>
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
    #pluginEventLog > div > div {
          padding: 2px;
          display: inline-block;
    }
     #pluginEventLog > div > div:nth-child(odd) {
          background-color: #CCC;
    }
    </style>`;
    var eventTypes = {1: 'Error', 2: 'Warning', 4: 'Info', 8: 'SuccessAudit', 16: 'FailureAudit'};
    
        for (const e of data[i]) {
          str += '<div>';
          for (let [k, v] of Object.entries(e)) {
            switch (k) {
              case 'EntryType': {
                  v = eventTypes[v];
              break;
              }
              case 'TimeGenerated': {
                v = v.match(/\d+/g);
                v = new Date(Number(v)).toLocaleDateString() +' '+ new Date(Number(v)).toLocaleTimeString();
                break;
              }
              default: { break; }
            }
            str += '<span title="'+v+'">'+v+'</span>';
          }
          str += '</div>';
        }
        str += '</div>';
        QH('pluginEventLog', str);
      }
      pluginHandler.eventlog.livelog.Stop();
      pluginHandler.eventlog.livelog = null;
    };
    
    obj.onRemoteEventLogStateChange = function(xdata, state) {
        var str = StatusStrs[state];
        if (pluginHandler.eventlog.webRtcActive == true) { str += ', WebRTC'; }
        switch (state) {
            case 0:
                if (pluginHandler.eventlog.livelog != null) { 
                  pluginHandler.eventlog.livelog.Stop(); 
                  pluginHandler.eventlog.livelog = null; 
                }
                break;
            case 3:
                if (pluginHandler.eventlog.livelog) {
                  pluginHandler.eventlog.livelog.sendText({ action: 'plugin', plugin: 'eventlog', pluginaction: 'getlog' });
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
      if (!pluginHandler.eventlog.livelog) {
          pluginHandler.eventlog.livelognode = currentNode;
          // Setup a mesh agent files
          pluginHandler.eventlog.livelog = CreateAgentRedirect(meshserver, pluginHandler.eventlog.createRemoteEventLog(pluginHandler.eventlog.fe_on_message), serverPublicNamePort, authCookie, domainUrl);
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
      
      /* meshserver.send({ 
        action: 'plugin', 
        plugin: "eventlog",
        pluginaction: "sendlog",
        nodeid: currentNode._id,
        routeToNode: true
        //  "tag": "console"
      });*/
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
        default: {
          break;
        }
      }
    }
    
    return obj;
};
