const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const requireGraphQLFile = require('require-graphql-file');
const graphql = require('graphql').graphql;
const resolvers = require("graqphql/modules/resolvers")
const typeDefs = requireGraphQLFile('../../schema/schema');
const schema = makeExecutableSchema({ typeDefs: typeDefs, resolvers: resolvers })
const mongoose = require('mongoose');
const storeStub = require("../store/stubs");
const profileStub = require("../profile/stubs");

describe('Rule Model', () => {
  let storeId, profiles, ruleId;
  const service = 'Facebook';
  beforeAll(async (done) => {
    if (mongoose.connection.readyState === 2) {
      mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useCreateIndex: true }, async function () {
        for (let i in mongoose.connection.collections) {
          const res = await mongoose.connection.collections[i].deleteMany({ _id: { $exists: true } });
        }
      })
    }
    const storeDetail = await storeStub.createStoreStub();
    storeId = storeDetail._id;
    profiles = await profileStub.createFBPageProfileStub(storeId, true, 3);
    done();
  });

  test(`Create Rule with customTimings Option `, async () => {
    createRuleInput = {
      store: storeId,
      service: service,
      profiles: [
        profiles[0]._id,
        profiles[1]._id
      ],
      postingTimeOption: 'customTimings',
      postTimings: [
        {
          postingHour: 15,
          postingMinute: 0,
          postingDays: [1, 2, 3, 4, 5, 6, 7]
        },
        {
          postingHour: 18,
          postingMinute: 0,
          postingDays: [1, 2, 3, 4, 5, 6, 7]
        },
        {
          postingHour: 21,
          postingMinute: 0,
          postingDays: [1, 2, 3, 4, 5, 6, 7]
        },
      ]
      ,
      postAsOption: 'facebookPostAsAlbum',
      collectionOption: 'selectProductsFromAll',
      allowZeroQuantity: true,
      postAsVariants: true,
      postingProductOrder: 'random',
      captions: [
        {
          text: 'Same Text 1'
        },
        {
          text: 'Same Text 2'
        },
      ]

    }

    let createRuleInputJson = JSON.stringify(createRuleInput).replace(/\"([^(\")"]+)\":/g, "$1:")
    createRuleInputJson = createRuleInputJson.replace('"Facebook"', 'Facebook');
    createRuleInputJson = createRuleInputJson.replace('"customTimings"', 'customTimings');
    createRuleInputJson = createRuleInputJson.replace('"facebookPostAsAlbum"', 'facebookPostAsAlbum');
    createRuleInputJson = createRuleInputJson.replace('"selectProductsFromAll"', 'selectProductsFromAll');
    createRuleInputJson = createRuleInputJson.replace('"random"', 'random');
    const createRuleTestCase = {
      id: 'Create Rule',
      query: `
        mutation {
          manageRule(input: ${createRuleInputJson})
          {
            id
            service
          }
        }
      `,
      variables: {},
      context: {},
      expected: { data: { manageRule: { service: service } } }
    };
    const result = await graphql(schema, createRuleTestCase.query, null, createRuleTestCase.context, createRuleTestCase.variables);
    console.log('result', result);
    expect(result.data.manageRule.service).toEqual(service);
    ruleId = result.data.manageRule.id;
  }, 30000);
  test(`Update Rule with customTimings Option `, async () => {
    createRuleInput = {
      id: ruleId,
      store: storeId,
      service: service,
      profiles: [
        profiles[0]._id,
        profiles[1]._id
      ],
      postingTimeOption: 'customTimings',
      postTimings: {
        postingInterval: 30
      },
      postAsOption: 'facebookPostAsLink',
      collectionOption: 'selectProductsFromAll',
      allowZeroQuantity: true,
      postAsVariants: true,
      postingProductOrder: 'random',
      captions: [
        {
          text: 'Same Text 3'
        },
        {
          text: 'Same Text 4'
        },
      ]

    }

    let createRuleInputJson = JSON.stringify(createRuleInput).replace(/\"([^(\")"]+)\":/g, "$1:")
    createRuleInputJson = createRuleInputJson.replace('"Facebook"', 'Facebook');
    createRuleInputJson = createRuleInputJson.replace('"customTimings"', 'customTimings');
    createRuleInputJson = createRuleInputJson.replace('"facebookPostAsLink"', 'facebookPostAsLink');
    createRuleInputJson = createRuleInputJson.replace('"selectProductsFromAll"', 'selectProductsFromAll');
    createRuleInputJson = createRuleInputJson.replace('"random"', 'random');
    const createRuleTestCase = {
      id: 'Update Rule',
      query: `
        mutation {
          manageRule(input: ${createRuleInputJson})
          {
            service
          }
        }
      `,
      variables: {},
      context: {},
      expected: { data: { manageRule: [createRuleInput] } }
    };
    const result = await graphql(schema, createRuleTestCase.query, null, createRuleTestCase.context, createRuleTestCase.variables);
    expect(result.data.manageRule.service).toEqual(service);
  }, 30000);


  test(`List Not Connected Profiles`, async () => {
    const profilesExpected = {}
    const listRulesTestCase = {
      id: 'List Rules',
      query: `
      query {
        listRules(filter: {storeId: "${storeId}", service: Facebook}) {
          service
          
        }
      }
    `,
      variables: {},
      context: {},
      expected: { data: { listRules: [profilesExpected] } }
    };
    const result = await graphql(schema, listRulesTestCase.query, null, listRulesTestCase.context, listRulesTestCase.variables);
    expect(result.data.listRules.length).toBe(1);
  }, 30000);
});
