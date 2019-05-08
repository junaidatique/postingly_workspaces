const serverless = require('serverless-http');
const express = require('express')
const app = express()

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

module.exports.handler = serverless(app);