// const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
// const requireGraphQLFile = require('require-graphql-file');
// const graphql = require('graphql').graphql;
// const faker = require('faker');
// const resolvers = require("../../modules/resolvers")
// const typeDefs = requireGraphQLFile('../../schema/schema');


// const connectFacebookTestCase = {
//     id: 'Connect Facebook Service',
//     query: `
//      mutation {
//       connnectService()
//       {

//       }
//     }
//     `,
//     variables: {},
//     context: {},
//     expected: { data: { connnectService: {} } }
// };

// const connectTwitterTestCase = {
//     id: 'Connect Twitter Service',
//     query: `
//      mutation {
//       connnectService()
//       {

//       }
//     }
//     `,
//     variables: {},
//     context: {},
//     expected: { data: { connnectService: {} } }
// };
// const connectBufferTestCase = {
//     id: 'Connect Buffer Service',
//     query: `
//      mutation {
//       connnectService()
//       {

//       }
//     }
//     `,
//     variables: {},
//     context: {},
//     expected: { data: { connnectService: {} } }
// };
// const connectLinkedinTestCase = {
//     id: 'Connect Linkedin Service',
//     query: `
//      mutation {
//       connnectService()
//       {

//       }
//     }
//     `,
//     variables: {},
//     context: {},
//     expected: { data: { connnectService: {} } }
// };
// const connectPinterestTestCase = {
//     id: 'Connect Pinterest Service',
//     query: `
//      mutation {
//       connnectService()
//       {

//       }
//     }
//     `,
//     variables: {},
//     context: {},
//     expected: { data: { connnectService: {} } }
// };

// const saveSelectedProfiles = {
//     id: 'Save Selected Profiles',
//     query: `
//      mutation {
//       saveService()
//       {

//       }
//     }
//     `,
//     variables: {},
//     context: {},
//     expected: { data: { connnectService: {} } }
// }

// const getConnectedProfilesTestCase = {
//     id: 'Get Connected Services',
//     query: `
//      query {
//       getConnnectedServices()
//       {

//       }
//     }
//     `,
//     variables: {},
//     context: {},
//     expected: { data: { getConnnectedServices: {} } }
// }


// describe('Profile Model', () => {
//     const cases = [connectFacebookTestCase, connectTwitterTestCase, connectBufferTestCase, connectLinkedinTestCase, connectPinterestTestCase, getConnectedProfilesTestCase, saveSelectedProfiles]
//     const schema = makeExecutableSchema({ typeDefs: typeDefs, resolvers: resolvers })
//     cases.forEach(obj => {
//         const { id, query, variables, context, expected } = obj
//         test(`${id}`, async () => {
//             const result = await graphql(schema, query, null, context, variables)
//             return expect(result).toEqual(expected)
//         })
//     })
// })