// this test case tests that the system should schedule those products which are not already scheduled.
const graphql = require('graphql').graphql;
const mongoose = require('mongoose');
const schema = require('graqphql/__tests__/executableSchema').schema;

const storeStub = require("graqphql/__tests__/store/stubs");
const profileStub = require("graqphql/__tests__/profile/stubs");
const ruleStub = require("graqphql/__tests__/rule/stubs");
const productStub = require("graqphql/__tests__/product/stubs");

const scheduleProducts = require('functions').scheduleProducts.schedule;
const postUpdates = require('functions').postUpdates.share;
const {
  POST_IMMEDIATELY,
  PENDING, APPROVED,
  COLLECTION_OPTION_ALL,
  FACEBOOK_SERVICE,
  RULE_TYPE_OLD,
  POST_AS_OPTION_FB_ALBUM,
  POSTING_SORTORDER_RANDOM,
  QUEUE_OPTIONS_PAUSE,
  FACEBOOK_DEFAULT_TEXT
} = require('shared/constants');

describe('Rule Model', () => {
  let storeId, profiles, rule;
  const service = FACEBOOK_SERVICE;
  const type = RULE_TYPE_OLD;
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
    profiles = await profileStub.createFBPageProfileStub(storeId, true, 1);
    const profileIds = profiles.map(profile => profile._id);
    const ruleParams = {
      store: storeId,
      service: service,
      type: type,
      profiles: profileIds,
      postingTimeOption: POST_IMMEDIATELY,
      postTimings: [
        {
          postingInterval: 60,
        }
      ]
      ,
      postAsOption: POST_AS_OPTION_FB_ALBUM,
      collectionOption: COLLECTION_OPTION_ALL,
      allowZeroQuantity: true,
      postAsVariants: true,
      repeatFrequency: 0,
      postingProductOrder: POSTING_SORTORDER_RANDOM,
      queueOption: QUEUE_OPTIONS_PAUSE,
      captions: [
        {
          collectionOption: COLLECTION_OPTION_ALL,
          isDefault: true,
          captionTexts: [
            {
              text: FACEBOOK_DEFAULT_TEXT
            },
            {
              text: FACEBOOK_DEFAULT_TEXT
            },
          ]
        }
      ]
    }
    rule = await ruleStub.createRuleStub(ruleParams);
    collections = await productStub.createCollectionStub(storeId, 3);
    // console.log('collections', collections)
    products = await productStub.createProductStub(storeId, 3, collections[0]._id);
    await scheduleProducts({ ruleId: rule._id });
    await postUpdates();
    await scheduleProducts({ ruleId: rule._id })
    done();
  });
  test(`List Updates`, async () => {
    const UpdatesExpected = {};
    const listUpdatesTestCase = {
      id: 'List Not Connected Updates',
      query: `
      query {
        listUpdates(filter: { store: { eq: "${storeId}"}, service: { eq: "${service}"}, scheduleState: [${PENDING}, ${APPROVED}]}) {
          scheduleTime
        }
      }
    `,
      variables: {},
      context: {},
      expected: { data: { listUpdates: [UpdatesExpected] } }
    };
    const result = await graphql(schema, listUpdatesTestCase.query, null, listUpdatesTestCase.context, listUpdatesTestCase.variables);
    // console.log('result', result);
    // console.log('result', result.data.listUpdates.length);
    expect(result.data.listUpdates.length).toBe(15);
    // expect(result).not.toBeNull();
  }, 30000);


});