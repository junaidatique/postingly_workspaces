const graphql = require('graphql').graphql;
const mongoose = require('mongoose');
const schema = require('graqphql/__tests__/executableSchema').schema;

const storeStub = require("graqphql/__tests__/store/stubs");
const profileStub = require("graqphql/__tests__/profile/stubs");
const ruleStub = require("graqphql/__tests__/rule/stubs");
const productStub = require("graqphql/__tests__/product/stubs");

const scheduleProducts = require('functions').scheduleProducts.schedule;
const { POST_IMMEDIATELY, PENDING, APPROVED, COLLECTION_OPTION_NOT_SELECTED } = require('shared/constants');

describe('Rule Model', () => {
  let storeId, profiles, rule;
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
    profiles = await profileStub.createFBPageProfileStub(storeId, true, 1);
    const profileIds = profiles.map(profile => profile._id);
    collections = await productStub.createCollectionStub(storeId, 3);
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
      ],
      collections: [
        collections[0]._id,
        collections[1]._id
      ],
      postAsOption: 'facebookPostAsAlbum',
      collectionOption: COLLECTION_OPTION_NOT_SELECTED,
      allowZeroQuantity: true,
      postAsVariants: false,
      repeatFrequency: 0,
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
    rule = await ruleStub.createRuleStub(ruleParams);

    // console.log('collections', collections)
    products = await productStub.createProductStub(storeId, 3, collections[0]._id);
    products = await productStub.createProductStub(storeId, 3, collections[1]._id);
    products = await productStub.createProductStub(storeId, 4, collections[2]._id);
    // TODO
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
    expect(result.data.listUpdates.length).toBe(4);
    // expect(result).not.toBeNull();
  }, 30000);


});