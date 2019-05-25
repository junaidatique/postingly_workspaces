const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const requireGraphQLFile = require('require-graphql-file');
const graphql = require('graphql').graphql;
const faker = require('faker');
const resolvers = require("graqphql/modules/resolvers")
const typeDefs = requireGraphQLFile('../../schema/schema');
const schema = makeExecutableSchema({ typeDefs: typeDefs, resolvers: resolvers })
const mongoose = require('mongoose');
const connectToDb = require('shared').mongodb;
const StoreModel = require('shared').StoreModel;

describe('Profile Model', () => {

  const partner = 'shopify';
  const partnerStoreId = faker.random.number({ min: 10000000 });
  const userName = faker.internet.email();
  const accessToken = process.env.SHOPIFY_TEST_ACCESS_TOKEN;
  const storeKey = `${partner}-${partnerStoreId}`;
  let storeId;

  const shopCreateStoreParams = {
    userId: userName,
    title: faker.company.companyName(),
    partnerToken: accessToken,
    partner: partner,
    partnerId: partnerStoreId,
    uniqKey: storeKey
  };

  beforeAll(async (done) => {
    if (mongoose.connection.readyState === 2) {
      mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useCreateIndex: true }, async function () {
        for (let i in mongoose.connection.collections) {
          const res = await mongoose.connection.collections[i].deleteMany({ _id: { $exists: true } });
        }
      })
    }
    const storeInstance = new StoreModel(shopCreateStoreParams);
    const storeDetail = await storeInstance.save();
    storeId = storeDetail._id;
    done();
  });

  // -------------------------- connectFacebookTestCase --------------------------

  const fbItem = {
    service: 'Facebook'
  }

  const connectFacebookInvalidTestCase = {
    id: 'Connect Facebook Service with Invalid Code',
    query: `
     mutation {
      connectProfile(input: {storeId: "${storeId}", code: "abc", service: Facebook, serviceProfile: facebookPage})
      {
        service
      }
    }
    `,
    variables: {},
    context: {},
    expected: { data: { connectProfile: [fbItem] } }
  };



  test(`${connectFacebookInvalidTestCase.id}`, async () => {
    const result = await graphql(schema, connectFacebookInvalidTestCase.query, null, connectFacebookInvalidTestCase.context, connectFacebookInvalidTestCase.variables)
    return expect(result.data.connectProfile).toBeNull();
  })
  const code = process.env.FB_TOKEN_TO_TEST;

  test(`Connect Facebook Service with Valid Code`, async () => {
    const connectFacebookValidTestCase = {
      id: 'Connect Facebook Service with Valid Code',
      query: `
     mutation {
      connectProfile(input: {storeId: "${storeId}", code: "${code}", service: Facebook, serviceProfile: facebookPage})
      {
        service
      }
    }
    `,
      variables: {},
      context: {},
      expected: { data: { connectProfile: [fbItem] } }
    };
    const result = await graphql(schema, connectFacebookValidTestCase.query, null, connectFacebookValidTestCase.context, connectFacebookValidTestCase.variables);
    return expect(result.data.connectProfile).not.toBeNull();
    // return expect(result.data.connectProfile.length).toBeGreaterThan(0);
  })
})


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