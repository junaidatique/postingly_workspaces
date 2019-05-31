// index.js
const express = require("express");
const connectToDb = require('shared').mongodb;
const serverless = require("serverless-http");
const ApolloServer = require("apollo-server-express").ApolloServer;
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


const app = express();
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Autherization');
  if (request.method === 'OPTIONS') {
    return response.sendStatus(200);
  }
  next();
});



const server = new ApolloServer({
  typeDefs: [typeDefs, commonTypeDefs, productTypeDefs, profileTypeDefs, ruleTypeDefs, storeTypeDefs, updateTypeDefs],
  resolvers,
  path: "/graphql"
});

server.applyMiddleware({ app });
app.get("/playground", graphiql({ endpoint: "/graphql" }));
exports.handler = serverless(app);
// export { handler };