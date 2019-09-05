'use strict';
const partner = require('./partners');
const mongoose = require('mongoose')
let conn = null;

exports.auth = async function (event, context, callback) {
  if (!process.env.IS_OFFLINE) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn === null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
  }
  const response = partner.getAuthURL(event, new Date());
  callback(null, response);
};
exports.callback = async function (event, context, callback) {
  if (!process.env.IS_OFFLINE) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn === null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
  }
  const response = await partner.verifyCallback(event, new Date());
  console.log("TCL: response", response)
  callback(null, response);
};
exports.activatePayment = async function (event, context, callback) {
  if (!process.env.IS_OFFLINE) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn === null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
  }
  const response = await partner.activatePayment(event, new Date());
  callback(null, response);
};