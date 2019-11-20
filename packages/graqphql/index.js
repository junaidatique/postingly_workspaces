const connectToMongoDB = require('./db');
const { ApolloServer } = require('apollo-server-lambda');
const requireGraphQLFile = require('require-graphql-file');
const resolvers = require("./modules/resolvers");
const typeDefs = requireGraphQLFile('./schema/schema');
const commonTypeDefs = requireGraphQLFile('./schema/common.schema');
const productTypeDefs = requireGraphQLFile('./schema/product.schema');
const profileTypeDefs = requireGraphQLFile('./schema/profile.schema');
const ruleTypeDefs = requireGraphQLFile('./schema/rule.schema');
const storeTypeDefs = requireGraphQLFile('./schema/store.schema');
const updateTypeDefs = requireGraphQLFile('./schema/update.schema');
const reportTypeDefs = requireGraphQLFile('./schema/report.schema');

const server = new ApolloServer({
  cors: true,
  typeDefs: [typeDefs, commonTypeDefs, productTypeDefs, profileTypeDefs, ruleTypeDefs, storeTypeDefs, updateTypeDefs, reportTypeDefs],
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