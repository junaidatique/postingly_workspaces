const graphql = require('graphql').graphql;
const mongoose = require('mongoose');
const schema = require('../executableSchema').schema;

const storeStub = require("../store/stubs");
const profileStub = require("../profile/stubs");

const { POST_BETWEEN_WITH_INTERVAL } = require('shared/constants');

describe('Rule Model', () => {
  let storeId, profiles, ruleId;
  const service = 'Facebook';
  const type = 'old';
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

  test(`Create Rule with ${POST_BETWEEN_WITH_INTERVAL} Option `, async () => {
    createRuleInput = {
      store: storeId,
      service: service,
      type: type,
      profiles: [
        profiles[0]._id,
        profiles[1]._id
      ],
      postingTimeOption: POST_BETWEEN_WITH_INTERVAL,
      postTimings: [
        {
          postingInterval: 120,
          startPostingHour: 6,
          endPostingHour: 18
        }
      ]
      ,
      postAsOption: 'facebookPostAsAlbum',
      collectionOption: 'selectProductsFromAll',
      allowZeroQuantity: true,
      postAsVariants: true,
      repeatFrequency: 2,
      postingProductOrder: 'random',
      queueOption: 'pause',
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
    createRuleInputJson = createRuleInputJson.replace(`"${POST_BETWEEN_WITH_INTERVAL}"`, `${POST_BETWEEN_WITH_INTERVAL}`);
    createRuleInputJson = createRuleInputJson.replace('"facebookPostAsAlbum"', 'facebookPostAsAlbum');
    createRuleInputJson = createRuleInputJson.replace('"selectProductsFromAll"', 'selectProductsFromAll');
    createRuleInputJson = createRuleInputJson.replace('"random"', 'random');
    createRuleInputJson = createRuleInputJson.replace('"old"', 'old');
    createRuleInputJson = createRuleInputJson.replace('"pause"', 'pause');
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
  test(`Update Rule with ${POST_BETWEEN_WITH_INTERVAL} Option `, async () => {
    updateRuleInput = {
      id: ruleId,
      store: storeId,
      service: service,
      type: type,
      profiles: [
        profiles[0]._id,
        profiles[1]._id
      ],
      postingTimeOption: POST_BETWEEN_WITH_INTERVAL,
      postTimings: [
        {
          postingInterval: 60,
          startPostingHour: 9,
          endPostingHour: 21
        }
      ]
      ,
      postAsOption: 'facebookPostAsLink',
      collectionOption: 'selectProductsFromAll',
      allowZeroQuantity: true,
      postAsVariants: true,
      repeatFrequency: 2,
      postingProductOrder: 'random',
      queueOption: 'pause',
      captions: [
        {
          text: 'Same Text 3'
        },
        {
          text: 'Same Text 4'
        },
      ]

    }

    let updateRuleInputJson = JSON.stringify(updateRuleInput).replace(/\"([^(\")"]+)\":/g, "$1:")
    updateRuleInputJson = updateRuleInputJson.replace('"Facebook"', 'Facebook');
    updateRuleInputJson = updateRuleInputJson.replace(`"${POST_BETWEEN_WITH_INTERVAL}"`, `${POST_BETWEEN_WITH_INTERVAL}`);
    updateRuleInputJson = updateRuleInputJson.replace('"facebookPostAsLink"', 'facebookPostAsLink');
    updateRuleInputJson = updateRuleInputJson.replace('"selectProductsFromAll"', 'selectProductsFromAll');
    updateRuleInputJson = updateRuleInputJson.replace('"random"', 'random');
    updateRuleInputJson = updateRuleInputJson.replace('"old"', 'old');
    updateRuleInputJson = updateRuleInputJson.replace('"pause"', 'pause');
    const updateRuleTestCase = {
      id: 'Update Rule',
      query: `
        mutation {
          manageRule(input: ${updateRuleInputJson})
          {
            service
          }
        }
      `,
      variables: {},
      context: {},
      expected: { data: { manageRule: [updateRuleInput] } }
    };
    const result = await graphql(schema, updateRuleTestCase.query, null, updateRuleTestCase.context, updateRuleTestCase.variables);
    expect(result.data.manageRule.service).toEqual(service);
  }, 30000);


  test(`List Rules`, async () => {
    const profilesExpected = {}
    const listRulesTestCase = {
      id: 'List Rules',
      query: `
      query {
        listRules(filter: {storeId: "${storeId}", service: Facebook, type: ${type}}) {
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
