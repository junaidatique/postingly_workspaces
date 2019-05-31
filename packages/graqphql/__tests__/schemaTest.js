
const mockServer = require('graphql-tools').mockServer;
const requireGraphQLFile = require('require-graphql-file');

const typeDefs = requireGraphQLFile('../schema/schema');
const commonTypeDefs = requireGraphQLFile('../schema/common.schema');
const productTypeDefs = requireGraphQLFile('../schema/product.schema');
const profileTypeDefs = requireGraphQLFile('../schema/profile.schema');
const ruleTypeDefs = requireGraphQLFile('../schema/rule.schema');
const storeTypeDefs = requireGraphQLFile('../schema/store.schema');
const updateTypeDefs = requireGraphQLFile('../schema/update.schema');


describe('Schema Testing', () => {
  test('Has valid type definitions', async () => {
    expect(async () => {
      const MockServer = mockServer([typeDefs, commonTypeDefs, productTypeDefs, profileTypeDefs, ruleTypeDefs, storeTypeDefs, updateTypeDefs]);
      await MockServer.query(`{ __schema { types { name } } }`);
    }).not.toThrow();
  });
});

