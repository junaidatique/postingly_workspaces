// import { addMockFunctionsToSchema, mockServer } from 'graphql-tools';
const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;
const mockServer = require('graphql-tools').mockServer;
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;

const graphql = require('graphql').graphql;

const typeDefs = require('../../schema/graphql');


const titleTestCase = {
  id: 'Query Title',
  query: `
      query {
        listStores {
          items{
            userId
            partner
            title
          }
            
        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { listStores: { items: [{ title: 'Title', userId: 'Title', partner: 'Title' }, { title: 'Title', userId: 'Title', partner: 'Title' }] } } }
};

const cases = [titleTestCase];

describe('Schema', () => {
  // const typeDefs = booksSchema;
  const mockSchema = makeExecutableSchema({ typeDefs });
  // const mockSchema = typeDefs;

  addMockFunctionsToSchema({
    schema: mockSchema,
    mocks: {
      Boolean: () => false,
      ID: () => '1',
      Int: () => 1,
      Float: () => 1.1,
      String: () => 'Title',
    }
  });

  test('Has valid type definitions', async () => {
    expect(async () => {
      const MockServer = mockServer(typeDefs);

      await MockServer.query(`{ __schema { types { name } } }`);
    }).not.toThrow();
  });

  cases.forEach(obj => {
    const { id, query, variables, context: ctx, expected } = obj;

    test(`Testing Query: ${id}`, async () => {
      return await expect(
        graphql(mockSchema, query, null, { ctx }, variables)
      ).resolves.toEqual(expected);
    });
  });

});