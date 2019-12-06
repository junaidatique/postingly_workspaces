const faker = require('faker');
// const productStubs = require('../graqphql/__tests__/product/stubs');
const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const moment = require('moment');
const _ = require('lodash');
const dbConnection = require('./db');
// const createUpdates = require('./createUpdates');
// const scheduleProductUpdates = require('./scheduleProductUpdates');
// const shareUpdates = require('./shareUpdates');
// const changeCaption = require('./changeCaption');
const fetch = require('node-fetch');
let lambda;
let sqs;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
  // Create an SQS service object
  AWS.config.update({ region: process.env.AWS_REGION });
  sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
}
const {
  PARTNERS_SHOPIFY,
  FACEBOOK_SERVICE,
  TWITTER_SERVICE,
  BUFFER_SERVICE,
  RULE_TYPE_OLD,
  POST_BETWEEN_WITH_INTERVAL,
  POST_AS_OPTION_FB_PHOTO,
  COLLECTION_OPTION_ALL,
  POSTING_SORTORDER_RANDOM,
  POSTING_SORTORDER_NEWEST,
  FACEBOOK_DEFAULT_TEXT,
  LINK_SHORTNER_SERVICES_POOOST,
  FACEBOOK_PROFILE,
  FACEBOOK_PAGE,
  FACEBOOK_GROUP,
  TWITTER_PROFILE,
  BUFFER_FACEBOOK_PROFILE,
  BUFFER_FACEBOOK_PAGE,
  BUFFER_FACEBOOK_GROUP,
  BUFFER_TWITTER_PROFILE,
  BUFFER_LINKEDIN_PROFILE,
  BUFFER_LINKEDIN_PAGE,
  BUFFER_LINKEDIN_GROUP,
  BUFFER_INSTAGRAM_PROFILE,
  BUFFER_INSTAGRAM_BUSINESS,
  APPROVED,

} = require('shared/constants')
module.exports = {

  testData: async function (event, context) {
    await dbConnection.createConnection(context);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const ImageModel = shared.ImageModel;
    const ProductModel = shared.ProductModel;
    const VariantModel = shared.VariantModel;
    const UpdateModel = shared.UpdateModel;

    const storeDetail = await StoreModel.findOne()
    await UpdateModel.collection.deleteMany({ _id: { $exists: true } });
    await CollectionModel.collection.deleteMany({ _id: { $exists: true } });
    await ImageModel.collection.deleteMany({ _id: { $exists: true } });
    await ProductModel.collection.deleteMany({ _id: { $exists: true } });
    await VariantModel.collection.deleteMany({ _id: { $exists: true } });
    console.log(".");
    await productStubs.createCollectionStub(storeDetail._id, 6);
    console.log(".");
    const collections = await CollectionModel.find({ store: storeDetail._id });
    await productStubs.createProductStub(storeDetail._id, 6, [collections[0]._id]);
    console.log(".");
    await productStubs.createProductStub(storeDetail._id, 6, [collections[0]._id, collections[1]._id]);
    console.log(".");
    await productStubs.createProductStub(storeDetail._id, 6, [collections[1]._id, collections[2]._id]);
    console.log(".");
    await productStubs.createProductStub(storeDetail._id, 6, [collections[2]._id, collections[3]._id]);
    console.log(".");
    await productStubs.createProductStub(storeDetail._id, 6, [collections[3]._id, collections[4]._id]);
    console.log(".");
    await productStubs.createProductStub(storeDetail._id, 6, [collections[4]._id, collections[5]._id]);
    console.log(".");
    await productStubs.createProductStub(storeDetail._id, 6, [collections[5]._id]);
    console.log(".");
  },
  testRules: async function (event, context) {
    await dbConnection.createConnection(context);
    const RuleModel = shared.RuleModel;
    const ProfileModel = shared.ProfileModel;
    const StoreModel = shared.StoreModel;
    const UpdateModel = shared.UpdateModel;

    const storeDetail = await StoreModel.findOne()

    await UpdateModel.collection.deleteMany({ _id: { $exists: true } });
    await RuleModel.collection.deleteMany({ store: storeDetail._id });

    const profiles = await ProfileModel.find({ store: storeDetail._id, service: FACEBOOK_SERVICE, isConnected: true, isSharePossible: true });
    const createRuleInput = {
      store: storeDetail._id,
      service: FACEBOOK_SERVICE,
      type: RULE_TYPE_OLD,
      profiles: [
        profiles[0]._id,
        // profiles[1]._id
      ],
      postingTimeOption: POST_BETWEEN_WITH_INTERVAL,
      postTimings: [
        {
          postingInterval: 120,
          startPostingHour: 6,
          endPostingHour: 20,
          postingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        }
      ]
      ,
      postAsOption: POST_AS_OPTION_FB_PHOTO,
      collectionOption: COLLECTION_OPTION_ALL,
      collections: [],
      allowZeroQuantity: true,
      postAsVariants: true,
      rotateImages: false,
      repeatFrequency: 0,
      postingProductOrder: POSTING_SORTORDER_NEWEST,
      captions: [
        {
          captionTexts: FACEBOOK_DEFAULT_TEXT,
          isDefault: true,
          collections: []
        },
      ]

    }
    // console.log("TCL: createRuleInput", createRuleInput)
    const ruleDetail = await RuleModel.create(createRuleInput);
    await storeDetail.rules.push(ruleDetail);
    await storeDetail.save();

  },
  testUpdates: async function (event, context) {
    const StoreModel = shared.StoreModel;
    const UpdateModel = shared.UpdateModel;
    const RuleModel = shared.RuleModel;

    const storeDetail = await StoreModel.findOne()
    const ruleDetail = await RuleModel.findOne({ store: storeDetail._id })
    const lastUpdate = await UpdateModel.findOne({ store: storeDetail._id }).sort({ scheduleTime: -1 });
    console.log("TCL: lastUpdate", lastUpdate)
    console.log("createUpdates");
    if (_.isNull(lastUpdate)) {
      await createUpdates.createUpdates({ ruleId: ruleDetail._id });
    } else {
      await createUpdates.createUpdates({ ruleId: ruleDetail._id, scheduleWeek: lastUpdate.scheduleTime });
    }
    console.log("scheduleProductUpdates");
    await scheduleProductUpdates.schedule({ ruleId: ruleDetail._id });
    console.log("changeCaption");
    await changeCaption.update({ service: FACEBOOK_SERVICE, storeId: null });
    console.log("updates");
    updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } });
    console.log("shareUpdates");
    await Promise.all(updates.map(async update => {
      await shareUpdates.share({ updateId: update._id });
      console.log(".");
    }));
  },
  testFetch: async function (event, context) {

    await dbConnection.createConnection(context);
    const RuleModel = require('shared').RuleModel;
    const store = await RuleModel.distinct('store',
      {
        profiles: { $exists: true, $not: { $size: 0 } },
        store: { $nin: ['5dc42115f5629e79652729c2', '5dc4cfc8f5de180714e125c0'] }
      }
    );
    console.log("TCL: store", store[0])
    const rules = await RuleModel.find({ store: store[0] }); //.populate('profiles');
    console.log("TCL: rules", rules)
    await Promise.all(rules.map(async rule => {
      console.log("TCL: rule", rule._id)
      if (_.isEmpty(rule.profiles)) {
        return;
      }
      const newRule = JSON.parse(JSON.stringify(rule));
      const profiles = rule.profiles;
      console.log("TCL: profiles", profiles)
      delete newRule.profiles;
      delete newRule._id;
      await Promise.all(profiles.map(async profile => {
        newRule.profile = profile;
        newRule.active = true;
        await RuleModel.create(newRule);
      }));
      await RuleModel.deleteOne({ _id: rule._id });

    }));
  },
  handleMyQueue: async function (event, context) {
    console.log("TCL: context", context)
    console.log("TCL: event", event.Records[0].body)
    console.log("TCL: event", JSON.parse(event.Records[0].body).store)
    console.log("TCL: event", event.Records[0].body.store)

  },
  syncStores: async function (event, context) {
    console.log("TCL: event", event)
    await dbConnection.createConnection(context);
    if (process.env.STAGE === 'production') {
      try {
        const shopifyAPI = shared.PartnerShopify;
        const StoreModel = shared.StoreModel;
        const ProfileModel = shared.ProfileModel;
        const url = `https://posting.ly/cron/exportStores`;
        const response = await fetch(url, {
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          method: "GET",
        }).then(response => response.json());
        console.log("TCL: response", response)
        let parentIds = [];
        if (!_.isEmpty(response.stores)) {
          await Promise.all(response.stores.map(async store => {
            console.log("TCL: store", store);
            const shop = await shopifyAPI.getShop(store.partnerSpecificUrl, store.partnerToken);
            console.log("TCL: shop1", shop)
            const storeKey = `shopify-${shop.id}`;
            console.log("TCL: storeKey1", storeKey)
            let dbStore = await StoreModel.findOne({ uniqKey: storeKey });
            console.log("TCL: dbStore1", dbStore)
            if (dbStore === null) {
              const shopParams = {
                uniqKey: storeKey,
                userId: shop.email,
                partner: PARTNERS_SHOPIFY,
                partnerId: shop.id,
                partnerPlan: shop.plan_name,
                title: shop.name,
                url: shop.domain,
                partnerSpecificUrl: shop.myshopify_domain,
                partnerCreatedAt: shop.created_at,
                partnerUpdatedAt: shop.updated_at,
                partnerToken: store.partnerToken,
                timezone: shop.iana_timezone,
                moneyFormat: shop.money_format,
                moneyWithCurrencyFormat: shop.money_with_currency_format,
                isCharged: true,
                shortLinkService: LINK_SHORTNER_SERVICES_POOOST,
                chargedMethod: PARTNERS_SHOPIFY,
                chargeId: store.chargeId,
                chargeDate: moment(store.chargeDate).toISOString(),
                isUninstalled: false,
              };
              console.log("TCL: shopParams", shopParams)
              dbStore = await StoreModel.create(shopParams);
            }
            console.log("TCL: dbStore", dbStore)
            const storeId = dbStore._id;
          }));
          let bulkParentProfiles = [];
          await Promise.all(response.profiles.map(async profile => {
            const storeKey = `shopify-${profile.shopId}`;
            console.log("TCL: storeKey2", storeKey)
            let dbStore = await StoreModel.findOne({ uniqKey: storeKey });
            const storeId = dbStore._id;
            let parent = null;
            if (!_.isUndefined(profile.parent)) {
              parent = await module.exports.createProfile(storeId, profile.parent, null)
              bulkParentProfiles.push(parent)
            }
          }));
          console.log("TCL: bulkParentProfiles", bulkParentProfiles);
          if (!_.isEmpty(bulkParentProfiles)) {
            const pageProfiles = await ProfileModel.bulkWrite(bulkParentProfiles);
          }
          let bulkProfiles = [];
          await Promise.all(response.profiles.map(async profile => {
            const storeKey = `shopify-${profile.shopId}`;
            console.log("TCL: storeKey2", storeKey)
            let dbStore = await StoreModel.findOne({ uniqKey: storeKey });
            const storeId = dbStore._id;
            let parent = null;
            if (!_.isUndefined(profile.parent)) {
              parentObject = await module.exports.createProfile(storeId, profile.parent, null);
              parent = await ProfileModel.findOne({ uniqKey: parentObject.updateOne.filter.uniqKey });
              // console.log("TCL: parent", parent.updateOne.filter.uniqKey)
            }
            let dbProfile = await module.exports.createProfile(storeId, profile.profile, parent)
            bulkProfiles.push(dbProfile);
          }));
          const bulkChildProfiles = [];
          if (!_.isEmpty(bulkProfiles)) {
            const childProfiles = await ProfileModel.bulkWrite(bulkProfiles);
          }
          await Promise.all(response.profiles.map(async profile => {
            const storeKey = `shopify-${profile.shopId}`;
            console.log("TCL: storeKey2", storeKey)
            let dbStore = await StoreModel.findOne({ uniqKey: storeKey });
            const storeId = dbStore._id;
            let parent = null;
            if (!_.isUndefined(profile.parent)) {
              parentObject = await module.exports.createProfile(storeId, profile.parent, null);
              parent = await ProfileModel.findOne({ uniqKey: parentObject.updateOne.filter.uniqKey });
              const childProfiles = await ProfileModel.find({ parent: parent._id }).select('_id');
              bulkChildProfiles.push({
                updateOne: {
                  filter: { uniqKey: parentObject.updateOne.filter.uniqKey },
                  update: {
                    children: childProfiles.map(childProfile => childProfile._id),
                  },
                }
              })
            }
          }));
          if (!_.isEmpty(bulkChildProfiles)) {
            const childParentProfiles = await ProfileModel.bulkWrite(bulkChildProfiles);
          }
          await Promise.all(response.stores.map(async store => {
            const storeKey = `shopify-${store.shopId}`;
            console.log("TCL: storeKey1", storeKey)
            let dbStore = await StoreModel.findOne({ uniqKey: storeKey });
            const storeId = dbStore._id;
            const storeProfiles = await ProfileModel.find({ store: storeId }).select('_id');
            dbStore.profiles = storeProfiles;
            await dbStore.save();
            const storePayload = {
              "storeId": dbStore._id,
              "partnerStore": PARTNERS_SHOPIFY,
              "collectionId": null
            }
            if (process.env.IS_OFFLINE === 'false') {
              const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncStoreData`;
              console.log("TCL: QueueUrl", QueueUrl)
              const params = {
                MessageBody: JSON.stringify(storePayload),
                QueueUrl: QueueUrl
              };
              console.log("TCL: params", params)
              const response = await sqs.sendMessage(params).promise();
              console.log("TCL: response", response)
            } else {
              await shopifyAPI.syncStoreData(storePayload);
            }
          }));
        }
      } catch (error) {
        console.log("TCL: error", error)
      }
    }
    // const webhookPayload = {
    //   partnerStore: PARTNERS_SHOPIFY,
    //   shopURL: dbStore.url,
    //   accessToken: dbStore.partnerToken
    // }
    // shopifyAPI.deleteWebhooks(webhookPayload);
    // if (process.env.IS_OFFLINE === 'false') {
    //   const webhookParams = {
    //     FunctionName: `postingly-functions-${process.env.STAGE}-get-webhooks`,
    //     InvocationType: 'Event',
    //     LogType: 'Tail',
    //     Payload: JSON.stringify(webhookPayload)
    //   };
    //   console.log("TCL: lambda.invoke webhookParams", webhookParams)

    //   const webhookLambdaResponse = await lambda.invoke(webhookParams).promise();
    //   console.log("TCL: webhookLambdaResponse", webhookLambdaResponse)
    // }
  },

  createProfile: async function (storeId, profile, parentId) {
    const ProfileModel = shared.ProfileModel;
    let profileService = '';
    let profileServiceProfile = '';
    let isSharePossible = true;
    if (profile.service === 'fb') {
      profileService = FACEBOOK_SERVICE;
      profileServiceProfile = FACEBOOK_PROFILE;
      isSharePossible = false;
    }
    if (profile.service === 'fb_page') {
      profileService = FACEBOOK_SERVICE;
      profileServiceProfile = FACEBOOK_PAGE;
    }
    if (profile.service === 'tw') {
      profileService = TWITTER_SERVICE;
      profileServiceProfile = TWITTER_PROFILE;
    }
    if (profile.service === 'buffer') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_PROFILE;
      isSharePossible = false;
    }
    if (profile.service === 'twitter_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_TWITTER_PROFILE;
    }
    if (profile.service === 'facebook_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_FACEBOOK_PROFILE;
    }
    if (profile.service === 'facebook_page') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_FACEBOOK_PAGE;
    }
    if (profile.service === 'facebook_group') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_FACEBOOK_GROUP;
    }
    if (profile.service === 'linkedin_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_LINKEDIN_PROFILE;
    }
    if (profile.service === 'linkedin_page') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_LINKEDIN_PAGE;
    }
    if (profile.service === 'linkedin_group') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_LINKEDIN_GROUP;
    }
    if (profile.service === 'instagram_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_INSTAGRAM_PROFILE;
    }
    if (profile.service === 'instagram_business') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_INSTAGRAM_BUSINESS;
    }
    const uniqKey = `${profileServiceProfile}-${storeId}-${profile.serviceUserId}`;
    const dbProfile = {
      updateOne: {
        filter: { uniqKey: uniqKey },
        update: {
          store: storeId,
          parent: (!_.isNull(parentId) ? parentId._id : null),
          name: profile.name,
          uniqKey: uniqKey,
          avatarUrl: profile.avatarUrl,
          serviceUserId: profile.serviceUserId,
          serviceUsername: profile.serviceUsername,
          profileURL: profile.profileURL,
          accessToken: profile.accessToken,
          accessTokenSecret: profile.accessTokenSecret,
          service: profileService,
          serviceProfile: profileServiceProfile,
          bufferId: profile.bufferId,
          isConnected: (profile.isConnected === '0') ? false : true,
          isTokenExpired: (profile.isTokenExpired === '0') ? false : true,
          isSharePossible: isSharePossible,
          fbDefaultAlbum: profile.fbDefaultAlbum,
        },
        upsert: true
      }
    }
    console.log('===================');
    console.log("TCL: dbProfile", dbProfile)
    console.log('===================');
    return dbProfile;
  }
}
