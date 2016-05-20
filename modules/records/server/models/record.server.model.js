'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  validator = require('validator'),
  Schema = mongoose.Schema,
  randtoken = require('rand-token');

var validateContent = function (ip) {
  console.log(this.recordType);
  switch(this.recordType){
    case 'A':
      return validator.isIP(ip, 4);
    case 'AAAA':
      return validator.isIP(ip, 6);
    case 'CNAME':
      return validator.isFQDN(ip);
    default:
      return false;
  }
};

/**
 * Record Schema
 */
var RecordSchema = new Schema({
  created: {
    type: Date,
    default: Date.now
  },
  name: {
    type: String,
    trim: true,
    unique: true,
    required: 'Name cannot be blank'
  },
  recordType: {
    type: String,
    enum: ['A', 'AAAA', 'CNAME'],
    default: 'A'
  },
  content: {
    type: String,
    trim: true,
    required: 'destination cannot be blank',
    validate: [validateContent, 'Please enter a valid destination to point to']
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  token: {
    type: String,
    default: randtoken.generate(32)
  },
  cloudflareId: {
    type: String
  },
  serverType: {
    type: String,
    enum: ['NOTMCPE', 'MCPE', 'VERIMCPE'],
    default: 'NOTMCPE'
  }
});

mongoose.model('Record', RecordSchema);
