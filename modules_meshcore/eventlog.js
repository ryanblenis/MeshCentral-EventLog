/** 
* @description MeshCentral event log plugin
* @author Ryan Blenis
* @copyright 
* @license Apache-2.0
*/

"use strict";
var mesh;
var periodicEventLogTimer = null;
var obj = this;
var _sessionid;
var isWsconnection = false;
var wscon = null;
var debug_flag = false;

var dbg = function(str) {
    if (debug_flag !== true) return;
    var fs = require('fs');
    var logStream = fs.createWriteStream('eventlog.txt', {'flags': 'a'});
    // use {'flags': 'a'} to append and {'flags': 'w'} to erase and write a new file
    logStream.write('\n'+new Date().toLocaleString()+': '+ str);
    logStream.end('\n');
}


var sendlogCallback = function (retObj) {
  if (retObj.stdout.length > 0) {
      if (!isWsconnection)
      mesh.SendCommand({ 
          "action": "plugin", 
          "plugin": "eventlog",
          "pluginaction": "sendlog",
          "data": JSON.stringify(retObj.stdout), 
          "sessionid": _sessionid,
          "tag": "console"
      });
  }
};

var getlogCallback = function (output) { 
    if (output.stderr.length > 0) {
        if (!isWsconnection) sendConsoleText(output.stderr);
    }
    var lines = output.stdout.trim().split('\r\n');
    for (var i in lines) {
        if (!isWsconnection) sendConsoleText(lines[i]);
    }
    if (isWsconnection) {
        var response = {};
        var db = require('SimpleDataStore').Shared();
        var cfg = db.Get('pluginEventLog_cfg');
        cfg = JSON.parse(cfg);
        response.uid = cfg.uid;
        response.data = JSON.parse(output.stdout);
        wscon.write(new Buffer(JSON.stringify(response)));
    }
};

var runPwshCollector = function(func, passedParams) {
    const defaultParams = {
        fromLog: 'Application',
        num: 10,
        entryType: 'Error,Warning',
        convertToJson: true,
        sinceTime: null,
        entryTypeNum: null
    };
    const params = Object.assign({}, defaultParams, passedParams);
    var fileRand = Math.random().toString(32).replace('0.', '');
    var fileName = 'psout'+fileRand+'.txt';
    var convertToJsonText = '';
    var sinceTimePre = '';
    var sinceTimeStr = '';
    if (params.sinceTime != null) {
        sinceTimePre = '$sinceTime = (Get-Date 01.01.1970)+([System.TimeSpan]::fromseconds('+Number(params.sinceTime-1)+'));';
        sinceTimeStr = 'StartTime=$sinceTime;';
    }
    var entryTypes = {
      'LogAlways': 0,
      'Critial': 1,
      'Error': 2,
      'Warning': 3,
      'Info': 4,
      'Verbose': 5
    };
    var entryTypeCodes = [];
    if (params.entryTypeNum === null) {
        var etObj = params.entryType.split(',');
        for (var i in etObj) {
            entryTypeCodes.push(entryTypes[etObj[i]]); 
        }
    } else {
        entryTypeCodes = params.entryTypeNum;
    }
    if (params.convertToJson) {
      convertToJsonText = " | convertTo-JSON -Compress"
    }
    var ret = {};
    ret.child = require('child_process').execFile("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",["-command \""+sinceTimePre+"Get-WinEvent -FilterHashTable @{"+sinceTimeStr+"LogName='"+params.fromLog.split(',').join("','")+"'; Level="+entryTypeCodes.join(',')+"} -MaxEvents "+params.num+" | Select-Object LogName, Level, TimeCreated, ProviderName, Message, Id "+convertToJsonText+" | Out-File "+fileName+" -Encoding UTF8\""]);
    ret.child.stdout.str = ''; ret.child.stdout.on('data', function (c) { this.str += c.toString(); });
    ret.child.stderr.str = ''; ret.child.stderr.on('data', function (c) { this.str += c.toString(); });
    //ret.child.on('exit', func(ret));
    ret.child.on('exit', function (code) {
        var o = {};
        o.stdout = this.stdout.str;
        o.stderr = this.stderr.str;
        try {
            // buffer the output to text and strip nasty characters
            o.stdout = require('fs').readFileSync(fileName, 'utf8').toString();
            if (o.stdout) {
                o.stdout = o.stdout.trim();
                o.stdout = o.stdout.replace(/[^\x20-\x7E]/g, ''); 
                func(o);
            }
            require('fs').unlinkSync(fileName);
            dbg('Running powershell: '+sinceTimePre+"Get-WinEvent -FilterHashTable @{"+sinceTimeStr+"LogName='"+params.fromLog.split(',').join("','")+"'; Level="+entryTypeCodes.join(',')+"} -MaxEvents "+params.num+" | Select-Object LogName, Level, TimeCreated, ProviderName, Message, Id "+convertToJsonText+" | Out-File "+fileName);
        } catch (e) {
            dbg('Powershell run error: '+e.stack);
        }
        
    });
};

var gatherlogsCallback = function(output) {
    mesh = require('MeshAgent');
    var db = require('SimpleDataStore').Shared();
    var cfg = db.Get('pluginEventLog_cfg');
    cfg = JSON.parse(cfg);
    var cuid = null;
    if (cfg.uid != null) {
      cuid = cfg.uid;
    }
    mesh.SendCommand({ "action": "plugin", "plugin": "eventlog", "pluginaction": "gatherlogs", "uid": cuid, "data": output.stdout});
};

var capturePeriodicEventLog = function() {
    if (process.platform != 'win32') {
      dbg('Periodic runner not running (non-win32)');
      return false;
    }
    dbg('Periodic runner starting');
    var db = require('SimpleDataStore').Shared();
    // this is where we collect logs, either to a file to be Xferred later, or now, whichev.
    var lvdoc = db.Get('pluginEventLog_lvdoc');
    var cfg = db.Get('pluginEventLog_cfg');
    cfg = JSON.parse(cfg);
    var fromLogs = cfg.historyLogs;
    var entryTypes = cfg.historyEntryTypes;
    if (cfg.historyEnabled !== true) return;
    runPwshCollector(gatherlogsCallback, {fromLog: fromLogs, num: 200, sinceTime: lvdoc, entryTypeNum: entryTypes });
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
          case 'serviceCheck': {
              // null function- simply can be called to load the plugin and make sure the timer is running
              break;
          }
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
            
              runPwshCollector(getlogCallback, {fromLog: fromLog, num: num, entryType: entryType, convertToJson: convertToJson});
            
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
            
            runPwshCollector(sendlogCallback, {fromLog: fromLog, num: num, entryType: entryType, convertToJson: convertToJson});
            
            return "Sending logs.";
          break; 
        }
        case 'getlivelogs': {
            var db = require('SimpleDataStore').Shared();
            var cfg = db.Get('pluginEventLog_cfg');
            cfg = JSON.parse(cfg);
            var logList = cfg.liveLogs.split(',');
            try { 
              for (var i in logList) {
                runPwshCollector(getlogCallback, {'fromLog': logList[i], 'num': Number(cfg.liveNum), 'entryTypeNum': cfg.historyEntryTypes, 'convertToJson': true});
              }
            } catch(e) { dbg('getlivelogs error '+e); }
            break;
        }
        case 'setLVDOC': { // set last verified date of collection (e.g. last successful log collection) from the server
            try {
                var db = require('SimpleDataStore').Shared();
                var dt = new Date();
                var offsetMin = dt.getTimezoneOffset();
                //dbg('offset min: '+offsetMin);
                var offsetSec = offsetMin * 60;
                //dbg('offset sec: '+offsetSec);
                //dbg('offset '+offsetSec);
                var savetime = Number(args.value).toString();
                savetime = Number(savetime.slice(0, -3));     // strip milliseconds
                //dbg('savetime2 '+savetime);
                savetime = savetime - offsetSec;              // offset seconds
                savetime += 2; // timers are fuzzy. two second delay so we don't reXmit the last message
                savetime = savetime.toString();
                dbg('setting lvdoc to '+savetime);
                db.Put('pluginEventLog_lvdoc', savetime);          // to minimize Xferred event logs
            } catch (e) { dbg('setLVDOC error: '+e) }
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
        case 'setConfigBlob': {
            try {
                var db = require('SimpleDataStore').Shared();
                var cfg = args.cfg;
                db.Put('pluginEventLog_cfg', cfg);
                dbg('setting config '+cfg);
            } catch (e) { dbg('setconfigBlob '+e); }
          break;
        }
      }
}

function sendConsoleText(text, sessionid) {
    if (typeof text == 'object') { text = JSON.stringify(text); }
    mesh.SendCommand({ "action": "msg", "type": "console", "value": text, "sessionid": sessionid });
}

module.exports = { consoleaction : consoleaction };