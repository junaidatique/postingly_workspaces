const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const requireGraphQLFile = require('require-graphql-file');

const typeDefs = requireGraphQLFile('../schema/schema');
const commonTypeDefs = requireGraphQLFile('../schema/common.schema');
const productTypeDefs = requireGraphQLFile('../schema/product.schema');
const profileTypeDefs = requireGraphQLFile('../schema/profile.schema');
const ruleTypeDefs = requireGraphQLFile('../schema/rule.schema');
const storeTypeDefs = requireGraphQLFile('../schema/store.schema');
const updateTypeDefs = requireGraphQLFile('../schema/update.schema');




const mockSchema = makeExecutableSchema({ typeDefs: [typeDefs, commonTypeDefs, productTypeDefs, profileTypeDefs, ruleTypeDefs, storeTypeDefs, updateTypeDefs] });
exports.mockSchema = mockSchema;