// index.js
const express = require("express");
const connectToDb = require('shared').mongodb;
const serverless = require("serverless-http");
const ApolloServer = require("apollo-server-express").ApolloServer;
const graphiql = require("graphql-playground-middleware-express").default;
const requireGraphQLFile = require('require-graphql-file');
const resolvers = require("./modules/resolvers");
const typeDefs = requireGraphQLFile('./schema/schema');

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
  typeDefs,
  resolvers,
  path: "/graphql"
});

server.applyMiddleware({ app });
app.get("/playground", graphiql({ endpoint: "/graphql" }));
exports.handler = serverless(app);
// export { handler };