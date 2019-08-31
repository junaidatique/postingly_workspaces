// index.js
const express = require("express");
// const connectToDb = require('shared').mongodb;
const mongoose = require('mongoose');
// mongoose.Promise = global.Promise;
// mongoose.set('debug', true);
// let conn = null;
const connectToMongoDB = require('./db');
const serverless = require("serverless-http");
// const ApolloServer = require("apollo-server-express").ApolloServer;
const { ApolloServer } = require('apollo-server-lambda');
const graphiql = require("graphql-playground-middleware-express").default;
const requireGraphQLFile = require('require-graphql-file');
const resolvers = require("./modules/resolvers");
const typeDefs = requireGraphQLFile('./schema/schema');
const commonTypeDefs = requireGraphQLFile('./schema/common.schema');
const productTypeDefs = requireGraphQLFile('./schema/product.schema');
const profileTypeDefs = requireGraphQLFile('./schema/profile.schema');
const ruleTypeDefs = requireGraphQLFile('./schema/rule.schema');
const storeTypeDefs = requireGraphQLFile('./schema/store.schema');
const updateTypeDefs = requireGraphQLFile('./schema/update.schema');


// const app = express();
// app.use((request, response, next) => {
//   response.setHeader('Access-Control-Allow-Origin', '*');
//   response.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
//   response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Autherization');
//   if (request.method === 'OPTIONS') {
//     return response.sendStatus(200);
//   }
//   next();
// });



// const server = new ApolloServer({
//   typeDefs: [typeDefs, commonTypeDefs, productTypeDefs, profileTypeDefs, ruleTypeDefs, storeTypeDefs, updateTypeDefs],
//   resolvers,
//   path: "/graphql"
// });

// server.applyMiddleware({ app });
// app.get("/playground", graphiql({ endpoint: "/graphql" }));
// const handler = serverless(app);
// module.exports.handler = async (event, context) => {
//   context.callbackWaitsForEmptyEventLoop = false;
//   const result = await handler(event, context);
//   return result;
// }


const server = new ApolloServer({
  cors: true,
  typeDefs: [typeDefs, commonTypeDefs, productTypeDefs, profileTypeDefs, ruleTypeDefs, storeTypeDefs, updateTypeDefs],
  resolvers,
  context: async ({ event, context }) => ({
    headers: event.headers,
    functionName: context.functionName,
    event,
    context,
    db: await connectToMongoDB()
  }),
  introspection: true,
  playground: true,
});
module.exports.handler = server.createHandler({
  cors: {
    origin: '*',
    credentials: true,
  },
});