// const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;
// const requireGraphQLFile = require('require-graphql-file');
// const mockServer = require('graphql-tools').mockServer;
// const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
// const graphql = require('graphql').graphql;
// // const typeDefs = require('../../schema/graphql');
// const typeDefs = requireGraphQLFile('../../schema/schema');
// const item = {
//   id: '1',
//   name: 'Title',
//   avatarUrl: 'Title',
//   serviceUsername: 'Title',
//   serviceUserId: 'Title',
//   profileURL: 'Title',
//   accessToken: 'Title',
//   accessTokenSecret: 'Title',
//   service: 'Title',
//   serviceProfile: 'Title',
//   isConnected: false,
//   isTokenExpired: false,
//   isSharePossible: false,
//   store: 'Title',
// }

// const connectFacebookTestCase = {
//   id: 'Connect Facebook Service',
//   query: `
//       mutation {
//         connnectService () {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: [item] } }
// };

// const connectTwitterTestCase = {
//   id: 'Connect Twitter Service',
//   query: `
//       mutation {
//         connnectService () {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: [item] } }
// };

// const connectBufferTestCase = {
//   id: 'Connect Buffer Service',
//   query: `
//       mutation {
//         connnectService () {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: [item] } }
// };


// const connectLinkedinTestCase = {
//   id: 'Connect LinkedIn Service',
//   query: `
//       mutation {
//         connnectService () {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: [item] } }
// };

// const connectPinterestTestCase = {
//   id: 'Connect Pinterest Service',
//   query: `
//       mutation {
//         connnectService () {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: [item] } }
// };

// const saveSelectedProfiles = {
//   id: 'Save Selected Profiles',
//   query: `
//      mutation {
//       saveService()
//       {

//       }
//     }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: {} } }
// }

// const getConnectedProfilesTestCase = {
//   id: 'Get Connected Services',
//   query: `
//      query {
//       getConnnectedServices()
//       {

//       }
//     }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { getConnnectedServices: {} } }
// }


// const cases = [connectFacebookTestCase, connectTwitterTestCase, connectBufferTestCase, connectLinkedinTestCase, connectPinterestTestCase, saveSelectedProfiles, getConnectedProfilesTestCase];

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