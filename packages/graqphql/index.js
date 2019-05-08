// index.js
import express from "express";
import serverless from "serverless-http";

import { ApolloServer } from 'apollo-server-express'
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const gql = require('apollo-server-express').gql;
import graphiql from "graphql-playground-middleware-express";

import resolvers from "./modules/Store/resolvers";

const typeDefs = require('./schema/graphql');

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
const handler = serverless(app);
export { handler };