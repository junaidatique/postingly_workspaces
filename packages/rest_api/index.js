'use strict';
const partner = require('./partners');

const dbConnection = require('./db');
exports.auth = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.getAuthURL(event, new Date());
};
exports.callback = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.verifyCallback(event, new Date());
};
exports.activatePayment = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.activatePayment(event, new Date());
};