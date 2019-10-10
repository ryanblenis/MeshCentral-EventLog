"use strict";
var mesh;
var promise = require('promise');

function consoleaction(args, rights, sessionid, parent) {
        
        var wsconnection = false;
        
        if (typeof args['_'] == 'undefined') {
          args['_'] = [];
          args['_'][1] = args.pluginaction;
          args['_'][2] = null;
          args['_'][3] = null;
          args['_'][4] = null;
          wsconnection = true;
        }
        
        if (process.platform != 'win32') {
          if (wsconnection) {
            parent.write(new Buffer(JSON.stringify({ctrlChannel: "102938", type: "close"})));
          }
          return "Eventlog is only available on Windows endpoints.";
        }
        
        var fnname = args['_'][1];
        mesh = parent;
        
        switch (fnname) {
          case 'getlog':
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
            
            ret.child = require('child_process').execFile("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",["powershell.exe", "-command \"Get-EventLog -EntryType "+entryType+" -LogName "+fromLog+" -Newest "+num+" | Select-Object TimeGenerated, EntryType, EventID, Message, Source, Category "+convertToJsonText+"\""]);
            //child.waitExit();
            ret.child.stdout.str = ''; ret.child.stdout.on('data', function (c) { this.str += c.toString(); });
            ret.child.stderr.str = ''; ret.child.stderr.on('data', function (c) { this.str += c.toString(); });
            
            ret.child.on('exit', function (code)
            {
                if (this.stderr.str.length > 0) {
                  if (!wsconnection) sendConsoleText(this.stderr.str.length);
                }
                var lines = this.stdout.str.trim().split('\r\n');
                for (var i in lines) {
                  
                  if (!wsconnection) sendConsoleText(lines[i]);
                }
                if (wsconnection) {
                  var response = {};
                  response.data = JSON.parse(this.stdout.str);
                  parent.write(new Buffer(JSON.stringify(response)));
                }
                
            });
            
              return "Getting logs. Please wait...";
          break; 
          case 'sendlog':
            var ret = {};
            
            var data, fromLog = 'Application', num = 10, entryType = 'Error,Warning';
            if (args['_'][2]) {
              fromLog = args['_'][2];
            }
            if (args['_'][3]) {
              num = args['_'][3];
            }
            if (args['_'][4]) {
              num = args['_'][4];
            }
            ret.child = require('child_process').execFile("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",["powershell.exe", "-command \"Get-EventLog -EntryType "+entryType+" -LogName "+fromLog+" -Newest "+num+" | convertTo-JSON\""]);
            //child.waitExit();
            ret.child.stdout.str = ''; ret.child.stdout.on('data', function (c) { this.str += c.toString(); });
            ret.child.stderr.str = ''; ret.child.stderr.on('data', function (c) { this.str += c.toString(); });
            
            ret.child.on('exit', function (code)
            {
              if (this.stdout.str.length > 0) {
                if (!wsconnection)
                mesh.SendCommand({ 
                    "action": "plugin", 
                    "plugin": "eventlog",
                    "pluginaction": "sendlog",
                    "data": JSON.stringify(this.stdout.str), 
                    "sessionid": sessionid,
                    "tag": "console"
                });
              }
                
            });
            
            return "Sending logs.";
          break; 
        }
};

function sendConsoleText(text, sessionid) {
    if (typeof text == 'object') { text = JSON.stringify(text); }
    mesh.SendCommand({ "action": "msg", "type": "console", "value": text, "sessionid": sessionid });
}

module.exports = { consoleaction : consoleaction };