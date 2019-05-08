// import { addMockFunctionsToSchema, mockServer } from 'graphql-tools';
const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;
const mockServer = require('graphql-tools').mockServer;
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
// import { importSchema } from 'graphql-import'
// const importSchema = require('graphql-import').importSchema;

// import { graphql } from 'graphql';

const graphql = require('graphql').graphql;

const typeDefs = require('../schema/graphql');


const titleTestCase = {
  id: 'Query Title',
  query: `
      query {
        books {
            title
        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { books: [{ title: 'Title' }, { title: 'Title' }] } }
};
const storeTestCase = {
  id: 'Query Store',
  query: `
      query {
        listStores {
          items
        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { books: [{ title: 'Title' }, { title: 'Title' }] } }
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