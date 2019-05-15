'use strict';
const jwt = require("jsonwebtoken");

module.exports = {
  createAuthChallenge: async function (event, context) {
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
    console.log("create auth challange Response", event);
    // callback(null, event);
    context.done(null, event)
  },
  defineAuthChallenge: async function (event, context, callback) {
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
    const jwtSecret = process.env.JWT_SECRET;
    const challengeAnswer = event.request.challengeAnswer;
    if (!jwtSecret || !challengeAnswer) {
      console.log("No JWT_SECRET or challengeAnswer");
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
        console.log("Error verifying nonce", err);
        event.response.answerCorrect = false;
      }
    }
    console.log("vefify auth challange Response", event);
    context.done(null, event)
  }
};