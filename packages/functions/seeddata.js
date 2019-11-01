// const faker = require('faker');
// const productStubs = require('../graqphql/__tests__/product/stubs')
// const shared = require('shared');
// const dbConnection = require('./db');
// const createUpdates = require('./createUpdates');
const fetch = require('node-fetch');
// const { FACEBOOK_SERVICE, RULE_TYPE_OLD, POST_BETWEEN_WITH_INTERVAL, POST_AS_OPTION_FB_PHOTO, COLLECTION_OPTION_ALL, POSTING_SORTORDER_RANDOM, FACEBOOK_DEFAULT_TEXT } = require('shared/constants')
module.exports = {
  // createStore: async function (event, context) {
  //   console.log("TCL: event", event)
  //   await dbConnection.createConnection(context);
  //   const StoreModel = shared.StoreModel;
  //   shop = {
  //     id: faker.random.number({ min: 10000000 }),
  //     plan_name: faker.lorem.word(),
  //     name: faker.company.companyName(),
  //     domain: faker.internet.domainName(),
  //     myshopify_domain: faker.internet.domainName(),
  //     created_at: faker.date.past(),
  //     updated_at: faker.date.past(),
  //     timezone: "America/New_York",
  //     money_format: "$",
  //     money_with_currency_format: "$ USD",
  //   }
  //   storeKey = `shopify-${shop.id}`;
  //   userName = faker.internet.email();
  //   accessToken = faker.random.uuid();
  //   const shopParams = {
  //     uniqKey: storeKey,
  //     userId: userName,
  //     partner: 'shopify',
  //     partnerId: shop.id,
  //     partnerPlan: shop.plan_name,
  //     title: shop.name,
  //     storeUrl: shop.domain,
  //     partnerSpecificUrl: shop.myshopify_domain,
  //     partnerCreatedAt: shop.created_at,
  //     partnerUpdatedAt: shop.updated_at,
  //     partnerToken: accessToken,
  //     timezone: shop.iana_timezone,
  //     moneyFormat: shop.money_format,
  //     moneyWithCurrencyFormat: shop.money_with_currency_format,
  //     isCharged: false,
  //     // chargedMethod: '',
  //     // chargeId: '',
  //     isUninstalled: false,
  //   };
  //   console.log("shopParams", shopParams);
  //   const storeInstance = new StoreModel(shopParams);
  //   store = await storeInstance.save();

  //   console.log("store", store);

  //   // userResponse = {
  //   //   id: faker.random.number({ min: 10000000 }),
  //   //   name: faker.name.title(),
  //   //   picture: {
  //   //     data: {
  //   //       url: faker.image.avatar()
  //   //     }
  //   //   },
  //   //   serviceUserId: faker.random.number({ min: 10000000 }),
  //   //   serviceUsername: faker.name.title(),
  //   //   profileURL: faker.internet.url(),

  //   // }
  //   // const userParams = {
  //   //   id: `facebook_profile-${userResponse.id}`,
  //   //   name: userResponse.name,
  //   //   avatarUrl: userResponse.picture.data.url,
  //   //   serviceUserId: userResponse.id,
  //   //   // serviceUsername: userResponse.link,
  //   //   profileURL: userResponse.link,
  //   //   accessToken: accessToken,
  //   //   // accessTokenSecret: "",
  //   //   service: "facebook",
  //   //   serviceProfile: "facebook_profile",
  //   //   // bufferId: "",
  //   //   isConnected: true,
  //   //   isTokenExpired: false,
  //   //   isSharePossible: false,
  //   //   profileStoreId: storeKey
  //   // };
  //   // console.log("userparams", userParams);
  //   // fb_profile = await Profile.create(userParams);
  //   // console.log("fb_profile", fb_profile);

  //   // for (i = 0; i < 4; i++) {
  //   //   pageProfile = {
  //   //     id: faker.random.number({ min: 10000000 }),
  //   //     name: faker.name.title(),
  //   //     picture: {
  //   //       data: {
  //   //         url: faker.image.avatar()
  //   //       }
  //   //     },
  //   //     serviceUserId: faker.random.number({ min: 10000000 }),
  //   //     serviceUsername: faker.name.title(),
  //   //     link: faker.internet.url(),
  //   //   }
  //   //   const pageParams = {
  //   //     id: `facebook_page-${pageProfile.id}`,
  //   //     name: pageProfile.name,
  //   //     avatarUrl: pageProfile.picture.data.url,
  //   //     serviceUserId: pageProfile.id,
  //   //     // serviceUsername: userResponse.link,
  //   //     profileURL: pageProfile.link,
  //   //     accessToken: accessToken,
  //   //     // accessTokenSecret: "",
  //   //     service: "facebook",
  //   //     serviceProfile: "facebook_page",
  //   //     // bufferId: "",
  //   //     isConnected: true,
  //   //     isTokenExpired: false,
  //   //     isSharePossible: true,
  //   //     storeId: storeKey,
  //   //     parent: userResponse.id
  //   //   };
  //   //   console.log("pageParams", pageParams);
  //   //   fb_page = await Profile.create(pageParams);
  //   // }

  //   // profile = await query.putItem(process.env.PROFILE_TABLE, pageParams);
  // },
  // testData: async function (event, context) {
  //   await dbConnection.createConnection(context);
  //   const StoreModel = shared.StoreModel;
  //   const CollectionModel = shared.CollectionModel;
  //   const ImageModel = shared.ImageModel;
  //   const ProductModel = shared.ProductModel;
  //   const VariantModel = shared.VariantModel;
  //   const UpdateModel = shared.UpdateModel;

  //   const storeDetail = await StoreModel.findOne()
  //   await UpdateModel.collection.deleteMany({ _id: { $exists: true } });
  //   await CollectionModel.collection.deleteMany({ _id: { $exists: true } });
  //   await ImageModel.collection.deleteMany({ _id: { $exists: true } });
  //   await ProductModel.collection.deleteMany({ _id: { $exists: true } });
  //   await VariantModel.collection.deleteMany({ _id: { $exists: true } });

  //   await productStubs.createCollectionStub(storeDetail._id, 6);
  //   const collections = await CollectionModel.find({ store: storeDetail._id });
  //   await productStubs.createProductStub(storeDetail._id, 6, [collections[0]._id]);
  //   await productStubs.createProductStub(storeDetail._id, 6, [collections[0]._id, collections[1]._id]);
  //   await productStubs.createProductStub(storeDetail._id, 6, [collections[1]._id, collections[2]._id]);
  //   await productStubs.createProductStub(storeDetail._id, 6, [collections[2]._id, collections[3]._id]);
  //   await productStubs.createProductStub(storeDetail._id, 6, [collections[3]._id, collections[4]._id]);
  //   await productStubs.createProductStub(storeDetail._id, 6, [collections[4]._id, collections[5]._id]);
  //   await productStubs.createProductStub(storeDetail._id, 6, [collections[5]._id]);
  // },
  // testRules: async function (event, context) {
  //   await dbConnection.createConnection(context);
  //   const RuleModel = shared.RuleModel;
  //   const ProfileModel = shared.ProfileModel;
  //   const StoreModel = shared.StoreModel;
  //   const UpdateModel = shared.UpdateModel;

  //   const storeDetail = await StoreModel.findOne()
  //   await UpdateModel.collection.deleteMany({ _id: { $exists: true } });

  //   await RuleModel.collection.deleteMany({ store: storeDetail._id });
  //   const profiles = await ProfileModel.find({ store: storeDetail._id, service: FACEBOOK_SERVICE, isConnected: true, isSharePossible: true });
  //   const createRuleInput = {
  //     store: storeDetail._id,
  //     service: FACEBOOK_SERVICE,
  //     type: RULE_TYPE_OLD,
  //     profiles: [
  //       profiles[0]._id,
  //       // profiles[1]._id
  //     ],
  //     postingTimeOption: POST_BETWEEN_WITH_INTERVAL,
  //     postTimings: [
  //       {
  //         postingInterval: 120,
  //         startPostingHour: 6,
  //         endPostingHour: 20,
  //         postingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  //       }
  //     ]
  //     ,
  //     postAsOption: POST_AS_OPTION_FB_PHOTO,
  //     collectionOption: COLLECTION_OPTION_ALL,
  //     collections: [],
  //     allowZeroQuantity: true,
  //     postAsVariants: false,
  //     rotateImages: false,
  //     repeatFrequency: 0,
  //     postingProductOrder: POSTING_SORTORDER_RANDOM,
  //     captions: [
  //       {
  //         captionTexts: FACEBOOK_DEFAULT_TEXT,
  //         isDefault: true,
  //         collections: []
  //       },
  //     ]

  //   }
  //   // console.log("TCL: createRuleInput", createRuleInput)
  //   const ruleDetail = await RuleModel.create(createRuleInput);
  //   await storeDetail.rules.push(ruleDetail);
  //   await storeDetail.save();
  //   await createUpdates.createUpdates({ ruleId: ruleDetail._id });
  //   await schedule({ ruleId: ruleDetail._id });

  //   const lastUpdate = await UpdateModel.findOne({ store: storeDetail._id }).sort({ scheduleTime: -1 });
  //   console.log("TCL: lastUpdate", lastUpdate)
  //   await createUpdates.createUpdates({ ruleId: ruleDetail._id, scheduleWeek: lastUpdate.scheduleTime });
  // },
  testFetch: async function (event, context) {

    const code = "1234";
    const body = JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_SECRET,
      code,
    });
    console.log("exchangeToken body", body);
    const url = `https://plerosys.myshopify.com/admin/oauth/access_token`;
    console.log("exchangeToken url", url);
    const res = await fetch(url, {
      body: body,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    }).then(response => response.json());
    console.log("TCL: exchangeToken res", res)
  }
}