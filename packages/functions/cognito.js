'use strict';
const jwt = require("jsonwebtoken");

module.exports = {
  createAuthChallenge: async function (event, context) {

    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }
    if (!event.request.session || event.request.session.length === 0) {
      // For the first challenge ask for a JWT token
      event.response.publicChallengeParameters = {
        distraction: "Yes",
      };
      event.response.privateChallengeParameters = {
        distraction: "Yes",
      };
      event.response.challengeMetadata = "JWT";
    }
    // callback(null, event);
    context.done(null, event)
  },
  defineAuthChallenge: async function (event, context, callback) {
    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }
    if (!event.request.session || event.request.session.length === 0) {
      // If we don't have a session or it is empty then issue a CUSTOM_CHALLENGE
      event.response.challengeName = "CUSTOM_CHALLENGE";
      event.response.failAuthentication = false;
      event.response.issueTokens = false;
    } else if (event.request.session.length === 1 && event.request.session[0].challengeResult === true) {
      // If we passed the CUSTOM_CHALLENGE then issue token
      event.response.failAuthentication = false;
      event.response.issueTokens = true;
    } else {
      // Something is wrong. Fail authentication
      event.response.failAuthentication = true;
      event.response.issueTokens = false;
    }
    context.done(null, event)
  },
  verifyAuthChallenge: async function (event, context, callback) {
    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }
    const jwtSecret = process.env.JWT_SECRET;
    const challengeAnswer = event.request.challengeAnswer;
    if (!jwtSecret || !challengeAnswer) {
      event.response.answerCorrect = false;
    } else {
      try {
        jwt.verify(challengeAnswer, jwtSecret, {
          clockTolerance: 600,
          issuer: process.env.JWT_ISS,
          subject: event.userName,
        });
        event.response.answerCorrect = true;
      } catch (err) {
        console.error("Error verifying nonce", err);
        event.response.answerCorrect = false;
      }
    }
    context.done(null, event)
  }
};
