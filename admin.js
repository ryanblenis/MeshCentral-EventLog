/** 
* @description MeshCentral event log plugin
* @author Ryan Blenis
* @copyright 
* @license Apache-2.0
*/

"use strict";


module.exports.admin = function(parent) {
    var obj = {};
    obj.parent = parent;
    obj.meshArgs = obj.parent.parent.parent.args;
    obj.util = require('util');
    
    obj.req = function(req, res, user) {
        if ((user.siteadmin & 0xFFFFFFFF) == 0) { res.sendStatus(401); return; }
        var vars = {
            configSets: null,
            configAssignments: null
        };
        parent.db.getAllConfigSets()
        .then((cfs) => {
          vars.configSets = JSON.stringify(cfs);
        })
        .then(parent.db.getConfigAssignments)
        .then((cfa) => {
          vars.configAssignments = JSON.stringify(cfa);
          res.render('admin', vars);
        });
        
    }
    
    obj.post = function(req, res, user) {
        res.sendStatus(401); return;
    }
    
    return obj;
}