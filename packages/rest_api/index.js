'use strict';
const partner = require('./partners');
const TwitterService = require('shared').TwitterService;
const sqsHelper = require('shared').sqsHelper;
const dbConnection = require('./db');
const httpHelper = require('shared').httpHelper
const shared = require('shared');
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
  const partner = event.pathParameters.partner_slug;
  const shopDomain = event.headers['X-Shopify-Shop-Domain'];
  await sqsHelper.addToQueue('ProductsCreate', { partnerStore: partner, shopDomain: shopDomain, partnerId: JSON.parse(event.body).id });
  return httpHelper.ok(
    { "message": "success" }
  );
};
exports.productsUpdate = async function (event, context) {
  await dbConnection.createConnection(context);
  console.log("TCL: productsUpdate");
  const StoreModel = shared.StoreModel;
  console.log("TCL: StoreModel", StoreModel)
  await partner.productsUpdate(event, context);
  const response = httpHelper.ok(
    { "message": "success" }
  );
  console.log("TCL: response", response)
  return response;
};
exports.productsDelete = async function (event, context) {
  const partner = event.pathParameters.partner_slug;
  const shopDomain = event.headers['X-Shopify-Shop-Domain'];
  await sqsHelper.addToQueue('ProductsDelete', { partnerStore: partner, shopDomain: shopDomain, partnerId: JSON.parse(event.body).id });
  return httpHelper.ok(
    { "message": "success" }
  );
};
exports.collectionsCreate = async function (event, context) {
  await dbConnection.createConnection(context);
  await partner.collectionsCreate(event, new Date());
  return httpHelper.ok(
    { "message": "success" }
  );
};
exports.collectionsUpdate = async function (event, context) {
  await dbConnection.createConnection(context);
  await partner.collectionsUpdate(event, context);
  return httpHelper.ok(
    { "message": "success" }
  );
};
exports.collectionsDelete = async function (event, context) {
  await dbConnection.createConnection(context);
  await partner.collectionsDelete(event, new Date());
  return httpHelper.ok(
    { "message": "success" }
  );
};
exports.appUninstalled = async function (event, context) {
  await dbConnection.createConnection(context);
  await partner.appUninstalled(event, new Date());
  return httpHelper.ok(
    { "message": "success" }
  );
};
exports.shopUpdate = async function (event, context) {
  await dbConnection.createConnection(context);
  await partner.shopUpdate(event, new Date());
  return httpHelper.ok(
    { "message": "success" }
  );
};
exports.twitterRequestToken = async function (event, context, callback) {
  const respones = await TwitterService.getRequestToken(callback);
  return respones;
}