const serverless = require('serverless-http');
const express = require('express')
const app = express();
const mongoose = require('mongoose');
let conn = null;

const partner = require('./partners')

app.get('/partners/:partner_slug/auth', function (req, res) {
  partner.getAuthURL(req, new Date(), res);
});
app.post('/partners/:partner_slug/callback', function (req, res) {
  partner.verifyCallback(req, new Date(), res);
});
app.post('/partners/:partner_slug/payment_return', function (req, res) {
  partner.activatePayment(req, new Date(), res);
});

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Autherization');
  if (request.method === 'OPTIONS') {
    return response.sendStatus(200);
  }
  next();
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