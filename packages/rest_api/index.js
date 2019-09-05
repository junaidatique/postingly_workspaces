const serverless = require('serverless-http');
const express = require('express')
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
let conn = null;

const partner = require('./partners')
// app.use(cors())
// app.options('*', cors())
app.use(async (request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  response.setHeader("Access-Control-Allow-Headers", '*');
  response.setHeader('Access-Control-Allow-Credentials', true);
  if (request.method === 'OPTIONS') {
    return response.status(200);
  }
  await next();
});
app.get('/partners/:partner_slug/auth', function (req, res) {
  partner.getAuthURL(req, new Date(), res);
});
app.post('/partners/:partner_slug/callback', function (req, res) {
  partner.verifyCallback(req, new Date(), res);
});
app.post('/partners/:partner_slug/payment_return', function (req, res) {
  partner.activatePayment(req, new Date(), res);
});



const handler = serverless(app);

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (conn == null) {
    conn = await mongoose.createConnection(process.env.MONGODB_URL, {
      useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
      bufferMaxEntries: 0
    });
  }
  const result = await handler(event, context);
  return result;
}