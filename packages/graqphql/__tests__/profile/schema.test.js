const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;
const mockServer = require('graphql-tools').mockServer;
const graphql = require('graphql').graphql;
const mockSchema = require('../mockSchema').mockSchema;

const item = {
  id: '1',
  name: 'Title',
  parent: {
    id: '1',
    name: 'Title',
    avatarUrl: 'Title',
    serviceUsername: 'Title',
    serviceUserId: 'Title',
    profileURL: 'Title',
    accessToken: 'Title',
    accessTokenSecret: 'Title',
    isConnected: false,
    isTokenExpired: false,
  },
  avatarUrl: 'Title',
  serviceUsername: 'Title',
  serviceUserId: 'Title',
  profileURL: 'Title',
  accessToken: 'Title',
  accessTokenSecret: 'Title',
  isConnected: false,
  isTokenExpired: false,
  store: {
    uniqKey: 'Title'
  }
}

const connectFacebookTestCase = {
  id: 'Connect Facebook Service',
  query: `
      mutation {
        connectProfile (input: {storeId: "Title", code: "Title", service: Facebook, serviceProfile: facebookPage}) {
          id
          name
          parent{
            id
            name
            avatarUrl
            serviceUsername
            serviceUserId
            profileURL
            accessToken
            accessTokenSecret
            isConnected
            isTokenExpired
            
          }
          avatarUrl
          serviceUsername
          serviceUserId
          profileURL
          accessToken
          accessTokenSecret
          isConnected
          isTokenExpired
          
          store {
            uniqKey
          }
        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { connectProfile: [item, item] } }
};

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
const cases = [connectFacebookTestCase];

describe('Schema', () => {
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

  cases.forEach(obj => {
    const { id, query, variables, context: ctx, expected } = obj;
    test(`Testing Query: ${id}`, async () => {
      result = graphql(mockSchema, query, null, { ctx }, variables);
      console.log('expected', expected.data);
      console.log('result', result.data);
      return await expect(result).resolves.toEqual(expected);
    });
  });

});
