const shared = require('shared');
const fetch = require('node-fetch');
const FacebookService = require('shared').FacebookService;
const TwitterService = require('shared').TwitterService;
const BufferService = require('shared').BufferService;
const { FACEBOOK_SERVICE, TEST, TWITTER_SERVICE, BUFFER_SERVICE } = require('shared/constants');
const formattedProfile = require('./functions').formattedProfile;
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;
const _ = require('lodash')
const profileFns = require('shared').profileFns;
const formattedStore = require('../Store/functions').formattedStore
module.exports = {
  connectProfile: async (obj, args, context, info) => {
    try {
      if (args.input.service === FACEBOOK_SERVICE) {
        if (process.env.STAGE == TEST) {
          response = await FacebookService.getProfile(args.input.storeId, args.input.code, args.input.serviceProfile);
        } else {
          response = await FacebookService.login(args.input.storeId, args.input.code, args.input.serviceProfile);

        }
      } else if (args.input.service === TWITTER_SERVICE && !_.isNull(args.input.oauthToken)) {
        response = await TwitterService.getProfile(args.input.storeId, args.input.oauthToken, args.input.oauthRequestTokenSecret, args.input.oauthVerifier);
      } else if (args.input.service === BUFFER_SERVICE) {
        response = await BufferService.getProfile(args.input.storeId, args.input.code, args.input.serviceProfile);
      }
      return response;
    } catch (error) {
      throw error;
    }

  },
  listProfiles: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    try {
      let query = ProfileModel.find({ store: args.storeId, service: args.service });
      if (args.isConnected === true) {
        query = query.where({ isConnected: true });
      } else {
        if (args.service !== TWITTER_SERVICE) {
          query = query.where('isConnected').ne(true);
        }
      }
      if (!_.isUndefined(args.isTokenExpired)) {
        if (args.isTokenExpired === true) {
          query = query.where({ isTokenExpired: true });
        } else {
          query = query.where('isTokenExpired').ne(true);
        }

      }
      query = query.where('isSharePossible').equals(true);
      if ((!_.isUndefined(args.parent) && !_.isNull(args.parent)) && args.service !== TWITTER_SERVICE) {
        query = query.where('parent').equals(args.parent);
      }
      // console.log("TCL: query", query)
      const profiles = await query;
      // console.log("TCL: profiles", profiles);
      return profiles.map(profile => {
        return formattedProfile(profile);
      })
    } catch (error) {
      throw error;
    }
  },
  updateProfile: async (obj, args, context, info) => {
    try {
      let res;
      console.log("TCL: updateProfile args", args)
      if (!_.isEmpty(args)) {
        console.log("TCL: updateProfile args.input", args.input)
        await Promise.all(args.input.map(async value => {
          // _.each(args.input, async (value, key) => {
          if (value.isConnected) {
            console.log("TCL: updateProfile value", value)
            res = await ProfileModel.updateOne({ _id: value.id }, { isConnected: value.isConnected });
            console.log("TCL: updateProfile res", res)
          }
        }));
      }
      const profiles = await ProfileModel.where('store').eq(args.storeId);
      connectedProfiles = profiles.map(profile => {
        if (profile.isConnected && profile.isSharePossible) {
          return profile;
        } else {
          return undefined;
        }
      }).filter(item => !_.isUndefined(item));
      const storeDetail = await StoreModel.findById(args.storeId);
      storeDetail.numberOfConnectedProfiles = connectedProfiles.length;
      await storeDetail.save();
      console.log("TCL: connectedProfiles", connectedProfiles);

      return profiles.map(profile => {
        return formattedProfile(profile);
      })
    } catch (error) {
      throw error;
    }
  },
  deleteProfile: async (obj, args, context, info) => {
    console.log("TCL: deleteProfile args", args)
    try {
      let res;
      profileDetail = await ProfileModel.findById(args.profileId);
      await profileFns.deleteProfile(profileDetail);
      const profiles = await ProfileModel.where('store').eq(profileDetail.store);
      return profiles.map(profile => {
        return formattedProfile(profile);
      })
    } catch (error) {
      throw error;
    }
  },
  syncProfiles: async (obj, args, context, info) => {
    console.log("TCL: syncProfiles args", args)
    try {
      let res;
      const storeDetail = await StoreModel.findById(args.storeId);
      const shopifyAPI = shared.PartnerShopify;
      const url = `https://posting.ly/cron/sync_store/${storeDetail.partnerId}`;
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
        }));
      }
      const storeResult = formattedStore(storeDetail);
      return storeResult;
    } catch (error) {
      throw error;
    }
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