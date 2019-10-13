/** 
* @description MeshCentral event log plugin
* @author Ryan Blenis
* @copyright 
* @license Apache-2.0
* @version v0.0.2
*/

"use strict";
var mesh;
var periodicEventLogTimer = null;
var obj = this;
var _sessionid;
var isWsconnection = false;
var wscon = null;

var sendlogCallback = function (retObj) {
  if (retObj.stdout.str.length > 0) {
      if (!isWsconnection)
      mesh.SendCommand({ 
          "action": "plugin", 
          "plugin": "eventlog",
          "pluginaction": "sendlog",
          "data": JSON.stringify(retObj.stdout.str), 
          "sessionid": _sessionid,
          "tag": "console"
      });
  }
};

var getlogCallback = function (output) { 
    if (output.stderr.length > 0) {
        if (!isWsconnection) sendConsoleText(output.stderr.length);
    }
    var lines = output.stdout.trim().split('\r\n');
    for (var i in lines) {
        if (!isWsconnection) sendConsoleText(lines[i]);
    }
    if (isWsconnection) {
        var response = {};
        response.data = JSON.parse(output.stdout);
        wscon.write(new Buffer(JSON.stringify(response)));
    }
};

var runPwshCollector = function(func, fromLog, num, entryType, convertToJson) {
    fromLog = typeof fromLog !== 'undefined' ? fromLog : 'Application';
    num = typeof num !== 'undefined' ? num : 10;
    entryType = typeof entryType !== 'undefined' ? entryType : 'Error,Warning';
    convertToJson = typeof convertToJson !== 'undefined' ? convertToJson : true;
    var entryTypes = {
      'LogAlways': 0,
      'Critial': 1,
      'Error': 2,
      'Warning': 3,
      'Info': 4,
      'Verbose': 5
    };
    var entryTypeCodes = [];
    var etObj = entryType.split(',');
    for (var i in etObj) {
        entryTypeCodes.push(entryTypes[etObj[i]]); 
    }
    var data;
    var convertToJsonText = '';
    
    if (convertToJson) {
      convertToJsonText = " | convertTo-JSON"
    }
    var ret = {};
    ret.child = require('child_process').execFile("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",["powershell.exe", "-command \"Get-WinEvent -FilterHashTable @{LogName='"+fromLog+"'; Level="+entryTypeCodes.join(',')+"} -MaxEvents "+num+" | Select-Object LogName, LevelDisplayName, TimeCreated, ProviderName, Message, Id "+convertToJsonText+"\""]);
    ret.child.stdout.str = ''; ret.child.stdout.on('data', function (c) { this.str += c.toString(); });
    ret.child.stderr.str = ''; ret.child.stderr.on('data', function (c) { this.str += c.toString(); });
    //ret.child.on('exit', func(ret));
    ret.child.on('exit', function (code) {
        var o = {};
        o.stdout = this.stdout.str;
        o.stderr = this.stderr.str;
        func(o);
    });
};

var capturePeriodicEventLog = function() {
    if (process.platform != 'win32') {
      return false;
    }
    // this is where we collect logs, either to a file to be Xferred later, or now, whichev.
    mesh = require('MeshAgent');
    /*var fs = require('fs');
    var logStream = fs.createWriteStream('eventLoglog.txt', {'flags': 'w'});
    logStream.write('\nLast run: '+new Date().toLocaleString()+ ' Data: ');
    logStream.end('\n');*/
    mesh.SendCommand({ "action": "plugin", "plugin": "eventlog", "pluginaction": "gatherlogs", "data": 'testing here'});
};

if (periodicEventLogTimer == null) { periodicEventLogTimer = setInterval(capturePeriodicEventLog, 1*60*1000); } // 1 minute(s)

function consoleaction(args, rights, sessionid, parent) {
        isWsconnection = false;
        wscon = parent;
        var _sessionid = sessionid;
        if (typeof args['_'] == 'undefined') {
          args['_'] = [];
          args['_'][1] = args.pluginaction;
          args['_'][2] = null;
          args['_'][3] = null;
          args['_'][4] = null;
          isWsconnection = true;
        }
        
        if (process.platform != 'win32') {
            if (isWsconnection) {
                parent.write(new Buffer(JSON.stringify({ctrlChannel: "102938", type: "close"})));
            }
            return "Eventlog is only available on Windows endpoints.";
        }
        
        var fnname = args['_'][1];
        mesh = parent;
        
        switch (fnname) {
          case 'getlog': {
              var ret = {};

              var data, fromLog = 'Application', num = 10, entryType = 'Error,Warning', convertToJson = true;
              var convertToJsonText = '';
              
              if (args['_'][2]) {
                fromLog = args['_'][2];
              }
              if (args['_'][3]) {
                num = args['_'][3];
              }
              if (args['_'][4]) {
                entryType = args['_'][4];
              }
              if (args['_'][5]) {
                convertToJson = args['_'][5];
              }
              if (convertToJson) {
                convertToJsonText = " | convertTo-JSON"
              }
            
              runPwshCollector(getlogCallback, fromLog, num, entryType, convertToJson);
            
              return "Getting logs. Please wait...";
          break; 
          }
          case 'sendlog': {
            var ret = {};
            
            var data, fromLog = 'Application', num = 10, entryType = 'Error,Warning';
            if (args['_'][2]) {
              fromLog = args['_'][2];
            }
            if (args['_'][3]) {
              num = args['_'][3];
            }
            if (args['_'][4]) {
              entryType = args['_'][4];
            }
            if (args['_'][5]) {
              convertToJson = args['_'][5];
            }
            
            runPwshCollector(sendlogCallback, fromLog, num, entryType, convertToJson);
            
            return "Sending logs.";
          break; 
        }
        case 'getlivelogs': {
            runPwshCollector(getlogCallback, 'Application', 100, 'Error,Warning', true);
            runPwshCollector(getlogCallback, 'System', 100, 'Error,Warning', true);
            break;
        }
        case 'sendlogs': {
          mesh.SendCommand({ 
                  "action": "plugin", 
                  "plugin": "eventlog",
                  "pluginaction": "sendlogs",
                  "data": JSON.stringify({test: "testing"})
          });
          break;
        }
      }
};

function sendConsoleText(text, sessionid) {
    if (typeof text == 'object') { text = JSON.stringify(text); }
    mesh.SendCommand({ "action": "msg", "type": "console", "value": text, "sessionid": sessionid });
}

module.exports = { consoleaction : consoleaction };