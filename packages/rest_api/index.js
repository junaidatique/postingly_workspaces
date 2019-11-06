'use strict';
const partner = require('./partners');
const TwitterService = require('shared').TwitterService;
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
exports.productsCreate = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.productsCreate(event, context);
};
exports.productsUpdate = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.productsUpdate(event, context);
};
exports.productsDelete = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.productsDelete(event, context);
};
exports.collectionsCreate = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.collectionsCreate(event, new Date());
};
exports.collectionsUpdate = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.collectionsUpdate(event, new Date());
};
exports.collectionsDelete = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.collectionsDelete(event, new Date());
};
exports.appUninstalled = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.appUninstalled(event, new Date());
};
exports.shopUpdate = async function (event, context) {
  await dbConnection.createConnection(context);
  return await partner.shopUpdate(event, new Date());
};
exports.twitterRequestToken = async function (event, context, callback) {
  const respones = await TwitterService.getRequestToken(callback);
  return respones;
}