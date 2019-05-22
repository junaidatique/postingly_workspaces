// const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;
// const requireGraphQLFile = require('require-graphql-file');
// const mockServer = require('graphql-tools').mockServer;
// const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
// const graphql = require('graphql').graphql;
// // const typeDefs = require('../../schema/graphql');
// const typeDefs = requireGraphQLFile('../../schema/schema');

// const profile = {
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

// const rule_post_time = {
//   id: '1',
//   startPostingHour: 1,
//   endPostingHour: 1,
//   postingInterval: 1,
//   postingHour: 1,
//   postingMinute: 1,
//   postingMeridiem: 'Title',

// }
// const collection_item = {
//   id: '1',
//   name: 'Title',
//   store: 'Title',
// }

// const caption = {
//   id: '1',
//   text: 'Title',
//   startDate: 'Title',
//   endDate: 'Title'
// }

// const item = {
//   id: '1',
//   name: 'Title',
//   store: 'Title',
//   service: 'Title',
//   profiles: {
//     items: [
//       profile
//     ]
//   },
//   postingTimeOption: 'Title',
//   postTimings: [rule_post_time],
//   postAsOption: 'Title',
//   collectionOption: 1,
//   collections: [collection_item],
//   allowZeroQuantity: false,
//   postAsVariants: false,
//   postingProductOrder: 'Title',
//   captions: [caption]
// }

// const createRuleTestCase = {
//   id: 'Create Rule',
//   query: `
//       mutation {
//         createRule () {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: [item] } }
// };
// const getRuleAfterCreationTestCase = {
//   id: 'Create Rule after creation',
//   query: `
//       query {
//         getRule () {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: [item] } }
// };
// const updateRuleTestCase = {
//   id: 'Update Rule',
//   query: `
//       mutation {
//         createRule () {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: [item] } }
// };
// const getRuleAfterUpdateTestCase = {
//   id: 'Create Rule after creation',
//   query: `
//       query {
//         getRule () {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { connnectService: [item] } }
// };


// const cases = [createRuleTestCase, getRuleAfterCreationTestCase, updateRuleTestCase, getRuleAfterUpdateTestCase];

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