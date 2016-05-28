'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Record = mongoose.model('Record'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  config = require(path.resolve('./config/config')),
  CloudFlareAPI = require('cloudflare4'),
  mcpeping = require('mcpe-ping');

var api = new CloudFlareAPI({
  email: config.cloudflare.email,
  key: config.cloudflare.key
});
function pingAndUpdate(record, cb){
  mcpeping(record.content, 19132, function(err, res){
    if (err) {
      record.serverType = 'NOTMCPE';
      cb('NOTMCPE');
    } else {
      record.serverType = 'MCPE';
      if(res.name.indexOf(record._id) > -1 || res.name.indexOf(record.title + '.mcpe.me')){
        record.serverType = 'VERIMCPE';
        cb('VERIMCPE');
      }
      else{
        cb('MCPE');
      }
      console.log(res);
    }
    record.save(function (err) {

    });
  }, 3000);
}
function isAllowedName(name){
  var blocked = [
    'mcpe',
    'mcpeme',
    'www',
    '@',
    'api',
    'mc',
    'play',
    'register',
    'login',
    'info',
    'help',
    'main',
    'name',
    'terms',
    'hosting',
    'owner',
    'service',
    'minecraft',
    'buycraft',
    'beta',
    'test',
    'irc',
    'ssh',
    'ftp',
    'whois',
    'reserved',
    'report',
    'email'
  ];
  return blocked.indexOf(name) === -1 && name.length >= 4;
}
/**
 * Create a record
 */
exports.create = function (req, res) {
  req.body.serverType = undefined;
  req.body.cloudflareId = undefined;

  var record = new Record(req.body);
  if(isAllowedName(record.name) || req.user.roles.indexOf('admin') > -1) { //Admins can register whatever the fuck they want! because they are magic!
    record.user = req.user;
    record.validate(function (err) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }
      else {
        Record.count({ user: req.user._id }).exec(function (err, result) {
          if (err) {
            return res.status(400).send({
              message: errorHandler.getErrorMessage(err)
            });
          } else if(result >= 3 && req.user.roles.indexOf('admin') === -1 && req.user.roles.indexOf('donator') === -1){
            return res.status(400).send({
              message: 'You have exhausted the current limit for hostnames. If you contact us and describe your use-case, we may be able to provide you with more.'
            });
          }
          else{
            api.zoneDNSRecordNew(config.cloudflare.zoneId, {
              'type': record.recordType,
              'name': record.name + '.' + config.cloudflare.domain,
              'content': record.content,
              'ttl': 1
            }, true).then(function (cfRecord) {
              if (cfRecord.success) {
                record.cloudflareId = cfRecord.result.id;
                record.save(function (err) {
                  if (err) {
                    return res.status(400).send({
                      message: errorHandler.getErrorMessage(err)
                    });
                  } else {
                    res.json(record);

                    // WAIt 10 seconds before checking the server
                    setTimeout(function () {
                      pingAndUpdate(record, function (state) {
                        if (state === 'MCPE') {
                          setTimeout(function () {
                            pingAndUpdate(record, function () {

                            });
                          }, 1000 * 60 * 20); // Check in 20 minutes to see if the server has been verified
                        }
                      });
                    }, 10 * 1000);
                  }
                });
              }
              else {
                return res.status(400).send({
                  message: 'An error occurred while creating the record with our DNS provider. Try again later.'
                });
              }
            });
          }
        });
      }
    });
  }
  else{
    return res.status(400).send({
      message: 'That record name is currently blocked. You can\'t create a record with that name.'
    });
  }
};

/**
 * Show the current record
 */
exports.read = function (req, res){
  res.json(req.record);
};

/**
 * Update a record
 */
exports.update = function (req, res) {
  var record = req.record;

  //record.name = req.body.name;
  record.recordType = req.body.recordType;
  record.content = req.body.content;

  record.validate(function(err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }
    else {
      api.zoneDNSRecordUpdate(config.cloudflare.zoneId, record.cloudflareId, {
        type: record.recordType,
        content: record.content
      }, true).then(function (cfRecord) {
        if (cfRecord.success) {
          record.save(function (err) {
            if (err) {
              return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
              });
            } else {
              res.json(record);
              setTimeout(function(){
                pingAndUpdate(record, function(state){

                });
              }, 10 * 1000);
            }
          });
        }
        else {
          return res.status(400).send({
            message: 'An error occurred while registering the update with our DNS provider. Try again later.'
          });
        }
      });
    }
  });
};

/**
 * Delete an record
 */
exports.delete = function (req, res) {
  var record = req.record;

  api.zoneDNSRecordDestroy(config.cloudflare.zoneId, record.cloudflareId, true).then(function(response){
    if(response.success){
      record.remove(function (err) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } else {
          res.json(record);
        }
      });
    }
    else{
      return res.status(400).send({
        message: 'An error occurred while deleting the record with our DNS provider. Try again later.'
      });
    }
  });

};

/**
 * List of Records
 */
exports.list = function (req, res) {
  Record.find().select('-token').sort('-created').populate('user', 'displayName').exec(function (err, records) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(records);
    }
  });
};

/**
 * List own records
 */
exports.mine = function (req, res) {
  Record.find({ user: req.user._id }).sort('-created').populate('user', 'displayName').exec(function (err, records) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(records);
    }
  });
};

/**
 * Record middleware
 */
exports.recordByID = function (req, res, next, id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Record is invalid'
    });
  }

  Record.findById(id).populate('user', 'displayName username email').exec(function (err, record) {
    if (err) {
      return next(err);
    } else if (!record) {
      return res.status(404).send({
        message: 'No record with that identifier has been found'
      });
    }
    if(!req.user || String(req.user._id) !== String(record.user._id)){
      record.token = undefined;
    }
    req.record = record;
    next();
  });
};
