// const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;
// const requireGraphQLFile = require('require-graphql-file');
// const mockServer = require('graphql-tools').mockServer;
// const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
// const graphql = require('graphql').graphql;
// const typeDefs = requireGraphQLFile('../../schema/schema');


// const item = {
//   id: '1',

// }

// const listUpdateCase = {
//   id: 'List Updates Query',
//   query: `
//       query {
//         listUpdates {
//           items{
//             id

//           }
//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: {
//     data: {
//       listUpdates: {
//         items: [
//           item,
//           item
//         ]
//       }
//     }
//   }
// };
// const getUpdateCase = {
//   id: 'List Update Query',
//   query: `
//       query {
//         getUpdate(id: "1") {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { getStore: item } }
// };
// const createUpdateCase = {
//   id: 'Create Update Mutation',
//   query: `
//       mutation {
//         createUpdate (input: {id: "Title"}) {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { createStore: item } }
// };
// const updateUpdateCase = {
//   id: 'Update Update Mutation',
//   query: `
//       mutation {
//         updateUpdate (input: {id: "Title", title: "Title"}) {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { updateStore: item } }
// };

// const cases = [listUpdateCase, getUpdateCase, createUpdateCase, updateUpdateCase];

// describe('Schema', () => {
//   const mockSchema = makeExecutableSchema({ typeDefs });

//   addMockFunctionsToSchema({
//     schema: mockSchema,
//     mocks: {
//       Boolean: () => false,
//       ID: () => '1',
//       Int: () => 1,
//       Float: () => 1.1,
//       String: () => 'Title',
//     }
//   });

//   test('Has valid type definitions', async () => {
//     expect(async () => {
//       const MockServer = mockServer(typeDefs);

//       await MockServer.query(`{ __schema { types { name } } }`);
//     }).not.toThrow();
//   });

//   cases.forEach(obj => {
//     const { id, query, variables, context: ctx, expected } = obj;

//     test(`Testing Query: ${id}`, async () => {
//       return await expect(
//         graphql(mockSchema, query, null, { ctx }, variables)
//       ).resolves.toEqual(expected);
//     });
//   });

// });