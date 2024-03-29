const shared = require('shared');
const fetch = require('node-fetch');
const _ = require('lodash');
const moment = require('moment');
const Intercom = require('intercom-client');

const {
  PARTNERS_SHOPIFY, FACEBOOK_DEFAULT_TEXT,
  LINK_SHORTENER_SERVICES_POOOST,
  WEBHOOKS, PENDING, APPROVED,
  RULE_TYPE_NEW, PAYMENT_PLANS,
  BASIC_PLAN, PRO_PLAN, FREE_PLAN, PAUSED
} = require('shared/constants');

const stringHelper = require('shared').stringHelper;
const httpHelper = require('shared').httpHelper
// const cognitoHelper = require('shared').cognitoHelper
const jwt = require('shared').jwtHelper;
const sqsHelper = require('shared').sqsHelper;
const StoreModel = require('shared').StoreModel

const querystring = require('querystring')
const jsonwebtoken = require('jsonwebtoken');


module.exports = {
  getAuthURL: async function (event, now) {
    try {
      const shopifyApiKey = process.env.SHOPIFY_API_KEY;
      const shopifyScope = process.env.SHOPIFY_SCOPE;

      if (!shopifyApiKey) {
        return httpHelper.badRequest("SHOPIFY_API_KEY environment variable not set");
      }

      if (!shopifyScope) {
        return httpHelper.badRequest("SHOPIFY_SCOPE environment variable not set");
      }

      if (!event.queryStringParameters) {
        const response = httpHelper.badRequest("No query string parameters found");
        return response;
      }

      const { "callback-url": callbackUrl, "per-user": perUser, shop } = event.queryStringParameters;

      if (!callbackUrl) {
        return httpHelper.badRequest("'callback-url' parameter missing");
      }

      if (!shop) {
        return httpHelper.badRequest("'shop' parameter missing");
      }

      if (!shop.match(/[a-z0-9][a-z0-9\-]*\.myshopify\.com/i)) {
        return httpHelper.badRequest("'shop' parameter must end with .myshopify.com and may only contain a-z, 0-9, - and .");
      }

      // Build our authUrl
      const eNonce = querystring.escape(stringHelper.getRandomString(32));
      const eClientId = querystring.escape(shopifyApiKey);
      const eScope = querystring.escape(shopifyScope.replace(":", ","));
      const eCallbackUrl = querystring.escape(callbackUrl);
      const option = perUser === "true" ? "&option=per-user" : "";
      const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${eClientId}&scope=${eScope}&redirect_uri=${eCallbackUrl}&state=${eNonce}${option}`;
      // Return the authURL
      return httpHelper.ok(
        {
          authUrl,
          token: jwt.createJWT(shop, eNonce, now, 600)
        }
      );

    } catch (e) {
      return httpHelper.internalError();
    }
  },

  verifyCallback: async function (event, now) {
    try {
      console.group('verifyCallback');
      console.log("TCL: event.body", event.body)
      if (!event.body) {
        return httpHelper.badRequest("body is empty");
      }
      const json = JSON.parse(event.body);
      const { token, params, username, email } = json;
      if (!token) {
        return httpHelper.badRequest("'token' is missing");
      }
      if (!params) {
        return httpHelper.badRequest("'params' is missing");
      }
      const { code, shop: shopDomain } = params;
      if (!this.validateNonce(token, params)
        || !this.validateShopDomain(shopDomain)
      ) {
        return httpHelper.badRequest("Invalid 'token'");
      }
      let response;
      try {
        response = await this.exchangeToken(shopDomain, code);
      } catch (err) {
        return httpHelper.badRequest("code is already used.");
      }

      const accessToken = response.access_token;
      if (accessToken === undefined) {
        console.error("verifyCallback response[\"access_token\"] is undefined");
        throw new Error("response[\"access_token\"] is undefined");
      }
      const shop = await this.getShop(shopDomain, accessToken);


      const storeKey = `shopify-${shop.id}`;
      console.log("TCL: storeKey", storeKey)
      let store = await StoreModel.findOne({ uniqKey: storeKey });
      let isCharged = false;
      let createUserUsername = shop.email;
      let createUserEmail = shop.email;
      if (!_.isUndefined(username) && !_.isNull(username) && username !== 'undefined' && username !== 'null') {
        createUserUsername = username;
      }
      if (!_.isUndefined(email) && !_.isNull(email) && email !== 'undefined' && email !== 'null') {
        createUserEmail = email;
      }
      // const cognitoUser = await cognitoHelper.createUser(createUserUsername, createUserEmail, shopDomain);
      let isNewSignUpStore = false;
      if (store === null) {
        console.log("verifyCallback new sign up");
        const shopParams = {
          uniqKey: storeKey,
          userId: createUserUsername,
          email: shop.email,
          partner: PARTNERS_SHOPIFY,
          partnerId: shop.id,
          partnerPlan: shop.plan_name,
          title: shop.name,
          url: shop.domain,
          partnerSpecificUrl: shop.myshopify_domain,
          partnerCreatedAt: shop.created_at,
          partnerUpdatedAt: shop.updated_at,
          partnerToken: accessToken,
          timezone: shop.iana_timezone,
          moneyFormat: shop.money_format,
          moneyWithCurrencyFormat: shop.money_with_currency_format,
          isCharged: false,
          shortLinkService: LINK_SHORTENER_SERVICES_POOOST,
          paymentPlan: FREE_PLAN,
          isUninstalled: false,
          freeProActivated: false
        };
        const storeInstance = new StoreModel(shopParams);
        store = await storeInstance.save();
        isNewSignUpStore = true;
      } else {
        if (!store.active) {
          return httpHelper.badRequest("Please contact administrator.");
        }
        if (store.isUninstalled) {
          isNewSignUpStore = true;
        }
        isCharged = store.isCharged;
        const shopUpdateParams = {
          userId: createUserUsername,
          partnerToken: accessToken,
          isUninstalled: false,
        };
        console.log("TCL: shopUpdateParams", shopUpdateParams)
        store.isUninstalled = false;
        store.userId = createUserUsername;
        store.partnerToken = accessToken;
        await StoreModel.updateOne({ _id: store._id }, shopUpdateParams);
      }
      if (isNewSignUpStore) {
        const profileDelete = await shared.ProfileModel.deleteMany({ store: store._id });
        const ruleDelete = await shared.RuleModel.deleteMany({ store: store._id });
        const updateDelete = await shared.UpdateModel.deleteMany({ store: store._id });
        try {
          const storePayload = {
            "storeId": store._id,
            "partnerStore": PARTNERS_SHOPIFY,
            "collectionId": null
          }
          if (process.env.IS_OFFLINE === 'false') {
            await sqsHelper.addToQueue('SyncStoreData', storePayload);
          } else {
            this.syncStoreData(storePayload);
          }

          const webhooksAPIUrl = `https://${shop.myshopify_domain}/admin/api/${process.env.SHOPIFY_API_VERSION}/webhooks.json`;
          const webhookRequestBody = JSON.stringify({
            webhook: {
              "topic": 'app/uninstalled',
              "address": `${process.env.REST_API_URL}partners/${PARTNERS_SHOPIFY}/appUninstalled`,
              "format": "json"
            }
          });

          const { json, res, error } = await this.shopifyAPICall(webhooksAPIUrl, webhookRequestBody, 'post', accessToken);
          if (_.isNull(json)) {
            if (!_.isNull(error)) {
              throw new Error(error);
            }
            return;
          }
        } catch (err) {
          console.log("TCL: err", err.message)
          console.log("activatePayment: Store can't be saved");
        }
      }
      if (!store.intercomId) {
        // create intercom user
        const intercomClient = new Intercom.Client({ token: process.env.INTERCOM_API_TOKEN });
        user = await intercomClient.users.create({
          user_id: store.uniqKey, email: shop.email,
          custom_attributes: {
            storeTitle: store.title,
            partner: store.partner
          }
        });
        store.intercomId = user.body.id;
        await store.save();
      }

      nonce = stringHelper.getRandomString(32);
      console.log("verifyCallback Completed");
      console.groupEnd();
      const responseAPI = {
        isNewSignUpStore: isNewSignUpStore,
        userName: createUserUsername,
        email: shop.email,
        storePartnerId: storeKey,
        token: jwt.createJWT(createUserUsername, nonce, now, 600),
      };
      console.log("responseAPI", responseAPI)
      return httpHelper.ok(responseAPI);
    } catch (error) {
      console.error("verifyCallback Error", error);
      return httpHelper.internalError();
    }

  },
  getChargeURL: async function (event, now) {
    console.log("TCL: getChargeURL event", event)
    const { storePartnerId, planName } = event;
    if (!storePartnerId) {
      return httpHelper.badRequest("storePartnerId is missing");
    }
    if (!planName || !PAYMENT_PLANS.includes(planName)) {
      return httpHelper.badRequest("planName is missing or invalid");
    }
    const storeKey = `${storePartnerId}`;
    console.log("activatePayment storeKey", storeKey);
    const store = await StoreModel.findOne({ uniqKey: storeKey });
    let price = process.env.PLAN_AMOUNT_BASIC;
    if (planName === PRO_PLAN) {
      price = process.env.PLAN_AMOUNT_PRO;
    }
    if (store.enableCustomPricing) {
      price = store.basicPackagePrice;
      if (planName === PRO_PLAN) {
        price = store.proPackagePrice;
      }
    }
    console.log("TCL: price", price)
    chargeAuthorizationUrl = await this.createCharge(store.partnerSpecificUrl, store.partnerToken, planName, price, store.noOfTrialDays);
    return {
      chargeURL: chargeAuthorizationUrl
    };

  },

  validateNonce: function (token, params) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is not set");
    }

    try {
      jsonwebtoken.verify(token, jwtSecret, {
        clockTolerance: 600,
        issuer: process.env.JWT_ISS,
        jwtid: params.state,
        subject: params.shop,
      });
      return true;
    } catch (err) {
      console.log("Error verifying nonce");
      return false;
    }
  },

  // Check that the shopDomain is a valid myshop.com domain. This is required by Shopify
  validateShopDomain: function (shopDomain) {
    if (shopDomain.match(/^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/i) === null) {
      console.log("Shop validation failed", shopDomain);
      return false;
    }

    return true;
  },

  // Validate the HMAC parameter
  validateHMAC: function (params) {
    return true;
    // const shopifyApiSecret = process.env.SHOPIFY_SECRET;
    // console.log("shopifyApiSecret", shopifyApiSecret);
    // if (!shopifyApiSecret) {
    //   throw new Error("SHOPIFY_API_SECRET environment variable not set");
    // }

    // const p = [];
    // for (const k in params) {
    //   if (k !== "hmac") {
    //     k.replace("%", "%25");
    //     p.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k].toString()));
    //   }
    // }
    // const map = JSON.parse(JSON.stringify(params));
    // console.log("map", map);
    // delete map['signature'];
    // delete map['hmac'];
    // const message = querystring.stringify(map);
    // // console.log("p", p);
    // // const message = p.sort().join("&");
    // console.log("message", message);
    // const digest = crypto.createHmac("sha256", shopifyApiSecret).update(message).digest("hex");
    // console.log("digest", digest);
    // console.log("params", params);
    // return (digest === params.hmac);

  },

  createCharge: async function (shop, accessToken, planName, price, noOfTrialDays) {
    console.log("createCharge shop", shop);
    const body = JSON.stringify({
      recurring_application_charge: {
        name: `${process.env.APP_TITLE} - ${planName}`,
        price: price,
        return_url: `${process.env.FRONTEND_URL}${process.env.SHOPIFY_PAYMENT_REUTRN}?shop=${shop}`,
        trial_days: noOfTrialDays || process.env.SHOPIFY_TRAIL_DAYS,
        test: (process.env.STAGE === 'production' && shop !== 'march2019teststore1.myshopify.com') ? false : true,
      }
    });
    const url = `https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION}/recurring_application_charges.json`;
    const { json, res, error } = await this.shopifyAPICall(url, body, 'post', accessToken);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        throw new Error(error);
      }
      return;
    }
    return json.recurring_application_charge.confirmation_url;
  },

  exchangeToken: async function (shop, code) {
    try {
      console.log("exchangeToken shop", shop);
      const body = JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_SECRET,
        code,
      });
      console.log("exchangeToken body", body);
      const url = `https://${shop}/admin/oauth/access_token`;
      console.log("exchangeToken url", url);
      console.log("exchangeToken body", body);
      const json = await fetch(url, {
        body: body,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      }).then(response => response.json());
      console.log("TCL: exchangeToken json", json)

      // const json = ''; //await res.json();
      // console.log("exchangeToken json", json);
      if ("error_description" in json || "error" in json || "errors" in json) {
        throw new Error(json.error_description || json.error || json.errors);
      }
      return json;
    } catch (error) {
      console.log("TCL: exchangeToken error", error.message)
      throw new Error(error)
    }

  },

  getShop: async function (shopDomain, accessToken) {
    console.log("getShop shop", shopDomain);
    const { json, res, error } = await this.shopifyAPICall(`https://${shopDomain}/admin/shop.json`, null, 'get', accessToken);
    // console.log("getShop json", json.shop);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        throw new Error(error);
      }
      return;
    }
    return json.shop;
  },

  activatePayment: async function (event) {
    console.log("activatePayment Start");
    if (!event.body) {
      return httpHelper.badRequest("body is empty");
    }
    const json = JSON.parse(event.body);
    const { params } = json;

    if (!params) {
      return httpHelper.badRequest("'params' is missing");
    }
    console.log("activatePayment params", params);
    const { charge_id, shop, storePartnerId } = params;
    if (!charge_id) {
      return httpHelper.badRequest("'charge' is missing");
    }
    const storeKey = `${storePartnerId}`;
    console.log("activatePayment storeKey", storeKey);
    const store = await StoreModel.findOne({ partnerSpecificUrl: shop });
    const accessToken = store.partnerToken;
    console.log("activatePayment accessToken", accessToken);
    let chargeResponse;
    try {
      chargeResponse = await this.getCharge(shop, charge_id, accessToken)
    } catch (err) {
      console.log("get charge error", err);
      return httpHelper.badRequest("charge not found.");
    }
    console.log("TCL: chargeResponse", chargeResponse)
    let activateResponse;
    try {
      activateResponse = await this.activateCharge(shop, chargeResponse, accessToken);
    } catch (err) {
      console.log("activate charge erro", err);
      return httpHelper.badRequest("charge not activated.");
    }
    if (activateResponse && activateResponse.name.indexOf(BASIC_PLAN) >= 0) {
      store.paymentPlan = BASIC_PLAN;
    } else if (activateResponse && activateResponse.name.indexOf(PRO_PLAN) >= 0) {
      store.paymentPlan = PRO_PLAN;
    }
    store.freeProActivated = false;
    store.isCharged = true;
    store.chargedMethod = 'shopify';
    store.chargeId = charge_id;
    store.chargeDate = (new Date()).toISOString();;
    await store.save();
    try {
      const webhookPayload = {
        partnerStore: PARTNERS_SHOPIFY,
        shopURL: store.partnerSpecificUrl,
        accessToken: store.partnerToken,
        storeId: store._id
      }
      if (process.env.IS_OFFLINE === 'false') {
        await sqsHelper.addToQueue('CreateWebhooks', webhookPayload);

      } else {
        // this.getWebhooks(webhookPayload);
      }


    } catch (err) {
      console.log("TCL: err", err.message)
      console.log("activatePayment: Store can't be saved");
    }
    console.log("activatePayment Completed");

    return httpHelper.ok({
      message: "Done",
    });

  },

  getCharge: async function (shop, charge_id, accessToken) {
    console.log("getCharge shop", shop);
    console.log("getCharge charge_id", charge_id);
    const url = `https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION}/recurring_application_charges/${charge_id}.json`;
    const { json, res, error } = await this.shopifyAPICall(url, null, 'get', accessToken);
    console.log("getCharge json response", json);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        throw new Error(error);
      }
      return;
    }
    return json.recurring_application_charge;
  },

  activateCharge: async function (shop, chargeResponse, accessToken) {
    console.log("activateCharge shop", shop);
    console.log("activateCharge chargeResponse", chargeResponse);
    const body = JSON.stringify({
      recurring_application_charge: {
        "id": chargeResponse.id,
        "name": chargeResponse.name,
        "api_client_id": chargeResponse.api_client_id,
        "price": chargeResponse.price,
        "status": chargeResponse.status,
        "return_url": chargeResponse.return_url,
        "billing_on": chargeResponse.billing_on,
        "created_at": chargeResponse.created_at,
        "updated_at": chargeResponse.updated_at,
        "test": chargeResponse.test,
        "activated_on": chargeResponse.activated_on,
        "cancelled_on": chargeResponse.cancelled_on,
        "trial_days": chargeResponse.trial_days,
        "trial_ends_on": chargeResponse.trial_ends_on,
        "decorated_return_url": chargeResponse.decorated_return_url
      }
    });
    const url = `https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION}/recurring_application_charges/${chargeResponse.id}/activate.json`;
    const { json, res, error } = await this.shopifyAPICall(url, body, 'post', accessToken);
    console.log("activateCharge json", json);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        throw new Error(error);
      }
      return;
    }
    return json.recurring_application_charge;
  },

  syncStoreData: async function (event) {
    console.log('syncStoreData event', event);
    await this.syncProductCount(event);
    const ProductModel = shared.ProductModel;
    // Collections are reset so that new collections can be assigned to products. 
    // const dbCollectionsUpdate = await ProductModel.updateMany({ store: event.storeId }, { collections: [] });

    const collectionsUpdateForProduct = [{
      updateOne: {
        filter: { store: event.storeId },
        update: {
          collections: []
        }
      }
    }];
    const productUpdates = await ProductModel.bulkWrite(collectionsUpdateForProduct);

    const syncCustomCollectionPayload = {
      storeId: event.storeId,
      partnerStore: PARTNERS_SHOPIFY,
      collectionType: 'custom_collections',
      pageInfo: null, productId: null
    };
    const syncSmartCollectionPayload = {
      storeId: event.storeId,
      partnerStore: PARTNERS_SHOPIFY,
      collectionType: 'smart_collections',
      pageInfo: null, productId: null
    };
    const syncProductPayload = {
      storeId: event.storeId,
      partnerStore: PARTNERS_SHOPIFY,
      collectionId: null,
      pageInfo: null,
      productCount: 0
    }

    // console.log("TCL: syncCustomCollectionPayload", syncCustomCollectionPayload)
    // console.log("TCL: syncSmartCollectionPayload", syncSmartCollectionPayload)
    // console.log("TCL: syncProductPayload", syncProductPayload)
    if (process.env.IS_OFFLINE === 'false') {
      // syncing the custome colltions 
      await sqsHelper.addToQueue('SyncCollectionPage', syncCustomCollectionPayload);
      // syncing the custome colltions 
      await sqsHelper.addToQueue('SyncCollectionPage', syncSmartCollectionPayload);
      // syncing products
      await sqsHelper.addToQueue('SyncProductPage', syncProductPayload);
    } else {
      // await this.syncCollectionPage(syncCustomCollectionPayload);
      // await this.syncCollectionPage(syncSmartCollectionPayload);
      await this.syncProductPage(syncProductPayload);
    }
  },

  syncCollectionPage: async function (event) {
    console.log('syncCollectionPage event', event);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    if (storeDetail.isUninstalled) {
      console.log("TCL: storeDetail.isUninstalled", storeDetail.isUninstalled)
      return false;
    }
    let productQuery = '';

    let pageInfoQuery = '';
    if (!_.isNull(event.pageInfo)) {
      pageInfoQuery = `&page_info=${event.pageInfo}`;
    } else {
      pageInfoQuery = "&published_status=published";
      if (!_.isNull(event.productId) && !_.isUndefined(event.productId)) {
        productQuery = `&product_id=${event.productId}`
      }
    }
    const url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/${event.collectionType}.json?limit=250${productQuery}${pageInfoQuery}`;
    const { json, res, error } = await this.shopifyAPICall(url, null, 'get', storeDetail.partnerToken);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        console.log("TCL: syncCollectionPage error", error)
        if (error.indexOf('Exceeded') >= 0) {
          if (process.env.IS_OFFLINE === 'false') {
            // retry this event
            await sqsHelper.addToQueue('SyncCollectionPage', event);
          }
          return;
        } else {
          throw new Error(error);
        }
      }
      return;
    }
    console.log("TCL: syncCollectionPage json", json[event.collectionType].length);
    let collectionUniqKeys;
    if (json[event.collectionType].length > 0) {
      collectionUniqKeys = await this.syncCollections(storeDetail._id, json[event.collectionType]);
    }

    if (!_.isNull(event.productId)) {
      return collectionUniqKeys;
    } else {
      if (!_.isNull(res.headers.get('link')) && !_.isUndefined(res.headers.get('link'))) {
        const pageInfo = stringHelper.getShopifyPageInfo(res.headers.get('link'));
        if (!_.isNull(pageInfo)) {
          if (process.env.IS_OFFLINE === 'false') {
            const collectionPayload = { storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: event.collectionType, pageInfo: pageInfo, productId: null };
            await sqsHelper.addToQueue('SyncCollectionPage', collectionPayload);
          } else {
            await this.syncCollectionPage({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: event.collectionType, pageInfo: pageInfo, productId: null });
          }
        }
      }
      if (!_.isUndefined(collectionUniqKeys)) {
        const dbCollections = await CollectionModel.where('uniqKey').in(collectionUniqKeys.map(collection => collection)).select('_id');
        await Promise.all(dbCollections.map(async collection => {
          if (process.env.IS_OFFLINE === 'false') {
            // syncing products for this collection
            await sqsHelper.addToQueue('SyncProductPage',
              {
                storeId: event.storeId,
                partnerStore: PARTNERS_SHOPIFY,
                collectionId: collection._id,
                pageInfo: null,
                productCount: 0
              }
            );
          } else {
            const payload = { storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: collection._id, pageInfo: null };
            console.log("TCL: syncCollectionPage payload", payload)
            await this.syncProductPage(payload);
          }
        }));
      }

    }

  },
  syncCollections: async function (storeId, apiCollections) {
    let collectionUniqKeys = [];
    const CollectionModel = shared.CollectionModel;
    const bulkCollectionInsert = apiCollections.map(collection => {
      collectionUniqKeys.push(`${PARTNERS_SHOPIFY}-${collection.id}`);
      return {
        updateOne: {
          filter: { uniqKey: `${PARTNERS_SHOPIFY}-${collection.id}` },
          update: {
            title: collection.title,
            partnerId: collection.id,
            partnerCreatedAt: collection.published_at,
            partnerUpdatedAt: collection.updated_at,
            partner: PARTNERS_SHOPIFY,
            uniqKey: `${PARTNERS_SHOPIFY}-${collection.id}`,
            description: stringHelper.stripTags(collection.body_html),
            active: (!_.isNull(collection.published_at)) ? true : false,
            store: storeId,
          },
          upsert: true
        }
      }
    });
    if (!_.isEmpty(bulkCollectionInsert)) {
      const r = await CollectionModel.bulkWrite(bulkCollectionInsert);
    }
    return collectionUniqKeys;
  },
  syncProductCount: async function (event) {
    console.log('syncProductCount event', event);
    const StoreModel = shared.StoreModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    if (storeDetail.isUninstalled) {
      console.log("TCL: storeDetail.isUninstalled", storeDetail.isUninstalled)
      return false;
    }
    const url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products/count.json?published_status=published`;
    console.log("TCL: syncProductCount url", url)
    const { json, res, error } = await this.shopifyAPICall(url, null, 'get', storeDetail.partnerToken);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        if (error.indexOf('Exceeded') >= 0) {
          return;
        }
        throw new Error(error);
      }
      return;
    }
    console.log("TCL: syncProductCount json", json);
    storeDetail.numberOfProducts = json.count;
    storeDetail.noOfActiveProducts = json.count;
    await storeDetail.save();
  },
  syncProductPage: async function (event, context) {
    console.log('syncProductPage event', event);
    if (!_.isUndefined(context)) {
      console.log('syncProductPage event start', (context.getRemainingTimeInMillis() / 1000));
    }
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    if (storeDetail.isUninstalled) {
      console.log("TCL: storeDetail.isUninstalled", storeDetail.isUninstalled)
      return false;
    }
    let collectionQuery = '';
    let pageInfoQuery = '';

    if (!_.isNull(event.pageInfo)) {
      pageInfoQuery = `&page_info=${event.pageInfo}`;
    } else {
      pageInfoQuery = ''
      if (!_.isNull(event.collectionId)) {
        const collectionDetail = await CollectionModel.findById(event.collectionId);
        collectionQuery = `&collection_id=${collectionDetail.partnerId}`;
      }
    }
    const url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?limit=100${collectionQuery}${pageInfoQuery}`;
    console.log("TCL: syncProductPage url", url)
    const { json, res, error } = await this.shopifyAPICall(url, null, 'get', storeDetail.partnerToken);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        if (error.indexOf('Exceeded') >= 0) {
          if (process.env.IS_OFFLINE === 'false') {
            // retry this event
            await sqsHelper.addToQueue('SyncProductPage', event);
          }
          return;
        } else {
          throw new Error(error);
        }
      }
      return;
    }
    const apiProducts = json.products;
    console.log("TCL: apiProducts.length", apiProducts.length);
    if (!_.isUndefined(context)) {
      console.log('syncProductPage event after api call', (context.getRemainingTimeInMillis() / 1000));
    }
    if (apiProducts.length > 0) {
      await this.syncProducts(event, apiProducts, storeDetail, null, context);
    }
    if (!_.isUndefined(context)) {
      console.log('syncProductPage event after syncProduct', (context.getRemainingTimeInMillis() / 1000));
    }
    if (!_.isNull(res.headers.get('link')) && !_.isUndefined(res.headers.get('link'))) {
      console.log("TCL: There is next page. ")
      const pageInfo = stringHelper.getShopifyPageInfo(res.headers.get('link'));
      if (!_.isNull(pageInfo)) {
        if (process.env.IS_OFFLINE === 'false') {
          // syncing products
          const pageInfoProductPayload = {
            storeId: event.storeId,
            partnerStore: PARTNERS_SHOPIFY,
            collectionId: event.collectionId,
            pageInfo: pageInfo,
            productCount: parseInt(event.productCount) + 100
          };
          await sqsHelper.addToQueue('SyncProductPage', pageInfoProductPayload);
        } else {
          const payload = { storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: event.collectionId, pageInfo: pageInfo };
          await this.syncProductPage(payload);
        }
      }
      if (!_.isUndefined(context)) {
        console.log('syncProductPage event after sqs', (context.getRemainingTimeInMillis() / 1000));
      }
    }
    console.log("TCL: Sync Product completed for this api call. ")
  },

  getSingleProduct: async function (event, context) {
    console.log('getSingleProduct event', event);
    const StoreModel = shared.StoreModel;
    const ProductModel = shared.ProductModel;
    const productDetail = await ProductModel.findById(event.productId)
    if (!productDetail || _.isNull(productDetail)) {
      return false;
    }
    const storeDetail = await StoreModel.findById(event.storeId);
    if (storeDetail.isUninstalled) {
      console.log("TCL: storeDetail.isUninstalled", storeDetail.isUninstalled)
      return false;
    }
    let collectionQuery = '';
    let pageInfoQuery = '';

    const url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products/${productDetail.partnerId}.json`;
    const { json, res, error } = await this.shopifyAPICall(url, null, 'get', storeDetail.partnerToken);
    if (_.isNull(json)) {
      return;
    }
    const apiProducts = [json.product];
    console.log("TCL: apiProducts.length", apiProducts);
    if (apiProducts.length > 0) {
      await this.syncProducts(event, apiProducts, storeDetail, null, context);
    }
    return true;
  },

  uniqueArray1: function (ar) {
    var j = {};

    ar.forEach(function (v) {
      j[v + '::' + typeof v] = v;
    });

    return Object.keys(j).map(function (v) {
      return j[v];
    });
  },

  addCollectionsToItems: async function (model, items, collectionId) {
    if (items.length > 0) {
      let collections;

      const bulkCollectionUpdate = items.map(item => {
        collections = item.collections;
        collections.push(collectionId);
        collections = this.uniqueArray1(collections);
        collections = collections.slice(0, 15);
        return {
          updateOne: {
            filter: { _id: item._id },
            update: {
              collections: collections
            }
          }
        }
      });
      if (!_.isEmpty(bulkCollectionUpdate)) {
        const collections = await model.bulkWrite(bulkCollectionUpdate);
      }
    }
  },

  formatVariants: function (varaintsFromAPI, varaintsFromDb, imagesFromAPI) {
    variantsToReturn = [];
    varaintsFromAPI.forEach(variant => {
      const varaintImages = imagesFromAPI.map(productImage => {
        const thumbnailUrl = `${productImage.src.slice(0, productImage.src.lastIndexOf('.'))}_small.${productImage.src.slice(productImage.src.lastIndexOf('.') + 1)}`;
        if (productImage.id === variant.image_id) {
          return {
            partnerId: productImage.id,
            partnerSpecificUrl: productImage.src,
            partneCreatedAt: productImage.published_at,
            partnerUpdatedAt: productImage.updated_at,
            position: productImage.position,
            thumbnailUrl,
            active: true,
          }
        }
      }).filter(item => !_.isUndefined(item));
      const dbVariant = varaintsFromDb.find(dbVar => dbVar.uniqKey === `${PARTNERS_SHOPIFY}-${variant.id}`);
      const onSale = ((variant.compare_at_price != variant.price)) ? true : false;
      variantsToReturn.push({
        title: variant.title,
        price: variant.price,
        salePrice: variant.compare_at_price,
        onSale: onSale,
        uniqKey: `${PARTNERS_SHOPIFY}-${variant.id}`,
        partner: PARTNERS_SHOPIFY,
        partnerId: variant.id,
        partnerCreatedAt: variant.created_at,
        partnerUpdatedAt: variant.updated_at,
        position: variant.position,
        quantity: variant.inventory_quantity,
        postableByQuantity: (variant.inventory_quantity > 0) ? true : false,
        postableByPrice: (variant.price > 0) ? true : false,
        postableIsNew: (moment(variant.created_at).isAfter(moment().subtract(7, 'days'))) ? true : false,
        postableBySale: onSale,
        active: true,
        shareHistory: (_.isUndefined(dbVariant)) ? [] : dbVariant.shareHistory,
        images: varaintImages,
      })
    });
    return variantsToReturn;
  },

  formatImagesForProduct: function (imagesFromAPI, imagesFromDB) {
    const returnImages = imagesFromAPI.map(productImage => {
      const dbImage = imagesFromDB.find(img => img.partnerId === productImage.id);
      const thumbnailUrl = `${productImage.src.slice(0, productImage.src.lastIndexOf('.'))}_small.${productImage.src.slice(productImage.src.lastIndexOf('.') + 1)}`;
      return {
        partnerId: productImage.id,
        partnerSpecificUrl: productImage.src,
        partneCreatedAt: productImage.created_at,
        partnerUpdatedAt: productImage.updated_at,
        position: productImage.position,
        thumbnailUrl,
        active: true,
        shareHistory: (_.isUndefined(dbImage)) ? [] : dbImage.shareHistory,
      }
    })
    return returnImages;
  },
  formatProductForQuery: function (storeDetail, product, productFromDB, currency, markIsNew, productCount) {
    let productVaraints = [];
    let productImages = [];
    if (!_.isUndefined(productFromDB)) {
      productVaraints = productFromDB.variants;
      productImages = productFromDB.imagesList;
    }
    const embeddedVariants = this.formatVariants(product.variants, productVaraints, product.images);
    const embeddedImages = this.formatImagesForProduct(product.images, productImages);


    const quantity = product.variants.map(variant => variant.inventory_quantity).reduce((prev, curr) => prev + curr, 0);
    const minimumPrice = product.variants.map(variant => (variant.price)).reduce((p, v) => ((p < v && p > 0) ? p : v));
    const maximumPrice = product.variants.map(variant => (variant.price)).reduce((p, v) => ((p > v) ? p : v));
    const onSale = product.variants.map(variant => (variant.compare_at_price != variant.price) ? true : false).includes(true);
    const partnerSpecificUrl = `https://${storeDetail.url}/products/${product.handle}`;
    const suggestedText = stringHelper.formatCaptionText(FACEBOOK_DEFAULT_TEXT, product.title, partnerSpecificUrl, minimumPrice, stringHelper.stripTags(product.body_html), currency);
    return {
      title: product.title,
      description: stringHelper.stripTags(product.body_html),
      suggestedText: suggestedText,
      partnerSpecificUrl: partnerSpecificUrl,
      partner: PARTNERS_SHOPIFY,
      partnerId: product.id,
      partnerCreatedAt: product.created_at,
      partnerUpdatedAt: product.updated_at,
      uniqKey: `${PARTNERS_SHOPIFY}-${product.id}`,
      active: (product.published_at) ? true : false,
      store: storeDetail._id,
      quantity: quantity,
      minimumPrice: minimumPrice,
      maximumPrice: maximumPrice,
      onSale: onSale,
      postableByImage: (embeddedImages.length > 0) ? true : false,
      postableByQuantity: (quantity > 0) ? true : false,
      postableByPrice: (minimumPrice > 0) ? true : false,
      postableIsNew: (!_.isNull(markIsNew)) ? markIsNew : false,
      postableBySale: onSale,
      variants: embeddedVariants,
      imagesList: embeddedImages
    };
  },
  syncProducts: async function (event, apiProducts, storeDetail, markIsNew = null, context) {
    const ProductModel = shared.ProductModel;
    const currencyFormat = stringHelper.stripTags(storeDetail.moneyWithCurrencyFormat);
    const currency = currencyFormat.substr(currencyFormat.length - 3);

    const dbProducts = await ProductModel.where('uniqKey').in(apiProducts.map(product => `${PARTNERS_SHOPIFY}-${product.id}`)).select('_id uniqKey postableByImage collections partnerSpecificUrl description variants imagesList');
    console.log("TCL: dbProducts.length", dbProducts.length)

    // sync products
    const bulkProductInsert = apiProducts.map(product => {
      // get product from the list of dbProducts;
      const productFromDB = dbProducts.find(dbProduct => dbProduct.uniqKey === `${PARTNERS_SHOPIFY}-${product.id}`);
      const formatedProduct = this.formatProductForQuery(storeDetail, product, productFromDB, currency, markIsNew, event.productCount);
      return {
        updateOne: {
          filter: { uniqKey: `${PARTNERS_SHOPIFY}-${product.id}` },
          update: formatedProduct,
          upsert: true
        }
      }
    });
    try {
      if (!_.isEmpty(bulkProductInsert)) {
        // console.log("TCL: bulkProductInsert", bulkProductInsert.map(pro => pro.updateOne.update.variants))
        const products = await ProductModel.bulkWrite(bulkProductInsert);
      }
    } catch (error) {
      console.error("TCL: bulkProductInsert error", error.message)
    }
    // return;

    console.log("TCL: syncProduct bulkProductInsert.length", bulkProductInsert.length)
    if (!_.isUndefined(context)) {
      console.log('syncProduct event after bulkProductInsert', (context.getRemainingTimeInMillis() / 1000));
    }

    if (!_.isNull(event.collectionId)) {
      const collectionProducts = await ProductModel.where('uniqKey').in(apiProducts.map(product => `${PARTNERS_SHOPIFY}-${product.id}`)).select('_id uniqKey postableByImage collections partnerSpecificUrl description variants imagesList');
      await this.addCollectionsToItems(ProductModel, collectionProducts, event.collectionId);
    }
    console.log("TCL: All Done")
  },

  getWebhooks: async function (event) {
    console.log("TCL: event", event)
    const storeDetail = await shared.StoreModel.findById(event.storeId);
    if (storeDetail.isUninstalled) {
      console.log("TCL: storeDetail.isUninstalled", storeDetail.isUninstalled)
      return false;
    }
    const webhooksAPIUrl = `https://${event.shopURL}/admin/api/${process.env.SHOPIFY_API_VERSION}/webhooks.json`;
    const { json, res, error } = await this.shopifyAPICall(webhooksAPIUrl, null, 'get', event.accessToken);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        throw new Error(error);
      }
      return;
    }
    console.log("TCL: WEBHOOKS[PARTNERS_SHOPIFY].length", WEBHOOKS[PARTNERS_SHOPIFY].length)
    console.log("TCL: json.webhooks.length", json.webhooks.length)
    // if (json.webhooks.length < WEBHOOKS[PARTNERS_SHOPIFY].length) {
    //   await this.createWebhooks(event);
    // }
    return json.webhooks;
  },
  createWebhooks: async function (event) {
    console.log("TCL: event", event)
    const storeDetail = await shared.StoreModel.findById(event.storeId);
    if (storeDetail.isUninstalled) {
      console.log("TCL: storeDetail.isUninstalled", storeDetail.isUninstalled)
      return false;
    }
    const webhooksAPIUrl = `https://${event.shopURL}/admin/api/${process.env.SHOPIFY_API_VERSION}/webhooks.json`;
    let body;
    await Promise.all(WEBHOOKS[PARTNERS_SHOPIFY].map(async item => {
      body = JSON.stringify({
        webhook: {
          "topic": item.webhook,
          "address": `${process.env.REST_API_URL}partners/${PARTNERS_SHOPIFY}/${item.endpoint}`,
          "format": "json"
        }
      });
      const { json, res, error } = await this.shopifyAPICall(webhooksAPIUrl, body, 'post', event.accessToken);
      if (_.isNull(json)) {
        if (!_.isNull(error)) {
          throw new Error(error);
        }
        return;
      }
    }));
  },
  deleteWebhooks: async function (event) {
    console.log("TCL: event", event)
    const storeDetail = await shared.StoreModel.findById(event.storeId);
    if (storeDetail.isUninstalled) {
      console.log("TCL: storeDetail.isUninstalled", storeDetail.isUninstalled)
      return false;
    }
    const webhooksAPIUrl = `https://${event.shopURL}/admin/api/${process.env.SHOPIFY_API_VERSION}/webhooks.json`;
    const { json, res, error } = await this.shopifyAPICall(webhooksAPIUrl, null, 'get', event.accessToken);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        throw new Error(error);
      }
      return;
    }
    let deleteWebhookURL = '';
    console.log("TCL: json.webhooks.length", json.webhooks.length)
    if (json.webhooks.length > 0) {
      await Promise.all(json.webhooks.map(async item => {
        await this.deleteSingleWebhook({ shopURL: event.shopURL, itemId: item.id, accessToken: event.accessToken });
      }));
    }
  },
  deleteSingleWebhook: async function (event) {
    deleteWebhookURL = `https://${event.shopURL}/admin/api/${process.env.SHOPIFY_API_VERSION}/webhooks/${event.itemId}.json`;
    const { json, res, error } = await this.shopifyAPICall(deleteWebhookURL, null, 'delete', event.accessToken);
    if (_.isNull(json)) {
      if (!_.isNull(error)) {
        throw new Error(error);
      }
      return;
    }
  },
  createProductFromWebhook: async function (storeDetail, apiProducts, context) {
    const updateClass = require('shared').updateClass;
    const syncEvent = {
      "storeId": storeDetail._id,
      "partnerStore": PARTNERS_SHOPIFY,
      "collectionId": null
    }
    await this.syncProducts(syncEvent, apiProducts, storeDetail, true, context);
    await this.syncProductCount(syncEvent);
    const productFromDBObject = await shared.ProductModel.findOne({ uniqKey: `${PARTNERS_SHOPIFY}-${apiProducts[0].id}` })
    if (process.env.IS_OFFLINE === 'false' && productFromDBObject.postableIsNew && productFromDBObject.active) {
      const rules = await shared.RuleModel.find({ store: storeDetail._id, type: RULE_TYPE_NEW, active: true })
      await Promise.all(rules.map(async rule => {
        await updateClass.deleteScheduledUpdates(rule._id)
        await sqsHelper.addToQueue('CreateUpdates', { ruleId: rule._id, ruleIdForScheduler: rule._id });
      }));
    }
  },
  productsCreate: async function (event, context) {
    if (!_.isNull(event) && !_.isUndefined(event)) {
      const shopDomain = event.headers['X-Shopify-Shop-Domain'];
      console.log("TCL: shopDomain", shopDomain)
      const StoreModel = shared.StoreModel;

      const storeDetail = await StoreModel.findOne({ partnerSpecificUrl: shopDomain });
      if (!storeDetail || !storeDetail.active) {
        return httpHelper.ok(
          {
            message: "Received"
          }
        );
      }

      apiProducts = [JSON.parse(event.body)];
      await this.createProductFromWebhook(storeDetail, apiProducts, context)
      return httpHelper.ok(
        {
          message: "Received"
        }
      );
    }
  },
  productsUpdate: async function (event, context) {
    if (!_.isNull(event) && !_.isUndefined(event)) {
      const ProductModel = shared.ProductModel;
      const updateClass = require('shared').updateClass;
      const shopDomain = event.headers['X-Shopify-Shop-Domain'];
      if (process.env.DISABLED_PRODUCT_UPDATES_STORES.includes(shopDomain)) {
        return;
      }
      console.log("TCL: shopDomain", shopDomain)
      const StoreModel = shared.StoreModel;
      const partnerId = JSON.parse(event.body).id;
      console.log("TCL: partnerId", JSON.parse(event.body).id)
      const storeDetail = await StoreModel.findOne({ partnerSpecificUrl: shopDomain });
      // if store is not found. 
      if (!storeDetail || !storeDetail.active) {
        return httpHelper.ok(
          {
            message: "Received"
          }
        );
      }
      const product = JSON.parse(event.body);
      console.log("`${PARTNERS_SHOPIFY}-${partnerId}`", `${PARTNERS_SHOPIFY}-${partnerId}`);
      const productFromDB = await ProductModel.findOne({ uniqKey: `${PARTNERS_SHOPIFY}-${partnerId}` }).select(
        '_id title partnerSpecificUrl active minimumPrice postableByImage postableByQuantity postableByPrice postableIsNew variants imagesList');
      // console.log("productFromDB", productFromDB._id)

      if (!productFromDB) {
        await this.createProductFromWebhook(storeDetail, [product], context)
        return httpHelper.ok(
          {
            message: "Received"
          }
        );
      }
      const currencyFormat = stringHelper.stripTags(storeDetail.moneyWithCurrencyFormat);
      const currency = currencyFormat.substr(currencyFormat.length - 3);
      // the following function basically change the format of the product from shopify 
      // and convert it into the data structure that is used by the app. 
      const formatedProduct = this.formatProductForQuery(storeDetail, product, productFromDB, currency, productFromDB.postableIsNew, 0);

      // this is the object by the product found in db. 
      const productFromDBObject = {
        title: productFromDB.title,
        partnerSpecificUrl: productFromDB.partnerSpecificUrl,
        active: productFromDB.active,
        postableByImage: productFromDB.postableByImage,
        postableByQuantity: productFromDB.postableByQuantity,
        postableByPrice: productFromDB.postableByPrice,
        postableIsNew: productFromDB.postableIsNew
      }
      // this is the object that we got from shopify
      const formatedProductObject = {
        title: formatedProduct.title,
        partnerSpecificUrl: formatedProduct.partnerSpecificUrl,
        active: formatedProduct.active,
        postableByImage: formatedProduct.postableByImage,
        postableByQuantity: formatedProduct.postableByQuantity,
        postableByPrice: formatedProduct.postableByPrice,
        postableIsNew: formatedProduct.postableIsNew
      }
      // now we compare both object. if both objects are same we don't update the product. 
      if (!_.isEqual(productFromDBObject, formatedProductObject)) {
        const bulkProductInsert = [{
          updateOne: {
            filter: { uniqKey: `${PARTNERS_SHOPIFY}-${product.id}` },
            update: formatedProduct,
            upsert: true
          }
        }];
        const products = await ProductModel.bulkWrite(bulkProductInsert);
        if (process.env.IS_OFFLINE === 'false' && productFromDBObject.postableIsNew) {
          const rules = await shared.RuleModel.find({ store: storeDetail._id, type: RULE_TYPE_NEW, active: true })
          await Promise.all(rules.map(async rule => {
            await updateClass.deleteScheduledUpdates(rule._id)
            await sqsHelper.addToQueue('CreateUpdates', { ruleId: rule._id, ruleIdForScheduler: rule._id });
          }));
        }
      }

      return httpHelper.ok(
        {
          message: "Received"
        }
      );
    }
  },
  syncWebhookProductCollections: async function (apiProducts, storeDetail) {
    const productDetail = await shared.ProductModel.findOne({ partnerId: apiProducts[0].id });
    const productCustomCollections = await this.syncCollectionPage(
      {
        storeId: storeDetail._id,
        partnerStore: PARTNERS_SHOPIFY,
        collectionType: 'custom_collections',
        pageInfo: null,
        productId: apiProducts[0].id
        // productId: "3831387914326"
      }
    );
    if (!_.isNull(productCustomCollections) && !_.isEmpty(productCustomCollections)) {
      const dbCollections = await shared.CollectionModel.where('uniqKey').in(productCustomCollections.map(collection => collection)).select('_id');
      const productCollections = dbCollections.map(collection => collection._id);
      productDetail.collections = [...productDetail.collections, ...productCollections];
      await productDetail.save();
    }


    const productSmartCollections = await this.syncCollectionPage(
      {
        storeId: storeDetail._id,
        partnerStore: PARTNERS_SHOPIFY,
        collectionType: 'smart_collections',
        pageInfo: null,
        productId: productDetail._id
        // productId: "3831387914326"
      }
    );
    if (!_.isNull(productSmartCollections) && !_.isEmpty(productSmartCollections)) {
      const dbCollections = await shared.CollectionModel.where('uniqKey').in(productSmartCollections.map(collection => collection)).select('_id');
      const productCollectionsSmart = dbCollections.map(collection => collection._id);
      productDetail.collections = [...productDetail.collections, ...productCollectionsSmart];
      await productDetail.save();
    }
  },
  productsDelete: async function (event, context) {
    if (!_.isNull(event) && !_.isUndefined(event)) {
      const productDetail = await shared.ProductModel.findOne({ partnerId: JSON.parse(event.body).id });
      if (!_.isNull(productDetail)) {
        const updateDelete = await shared.UpdateModel.deleteMany({ product: productDetail._id, scheduleState: { $in: [PENDING, APPROVED] }, });
        const productDelete = await shared.ProductModel.deleteOne({ _id: productDetail._id });
      }
      return httpHelper.ok(
        {
          message: "Received"
        }
      );
    }
  },
  collectionsCreate: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['X-Shopify-Shop-Domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ partnerSpecificUrl: shopDomain });
      if (!storeDetail || !storeDetail.active) {
        return httpHelper.ok(
          {
            message: "Received"
          }
        );
      }
      const apiCollections = [JSON.parse(event.body)];
      await this.syncCollections(storeDetail._id, apiCollections);
      return httpHelper.ok(
        {
          message: "Received"
        }
      );
    }
  },
  collectionsUpdate: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['X-Shopify-Shop-Domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ partnerSpecificUrl: shopDomain });
      if (!storeDetail || !storeDetail.active) {
        return httpHelper.ok(
          {
            message: "Received"
          }
        );
      }
      const apiCollections = [JSON.parse(event.body)];
      await this.syncCollections(storeDetail._id, apiCollections);
      return httpHelper.ok(
        {
          message: "Received"
        }
      );
    }
  },
  collectionsDelete: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const collectionDetail = await shared.CollectionModel.findOne({ partnerId: JSON.parse(event.body).id })
      if (!_.isNull(collectionDetail)) {
        const collectionDelete = await shared.CollectionModel.deleteOne({ partnerId: JSON.parse(event.body).id });
      }
      return httpHelper.ok(
        {
          message: "Received"
        }
      );
    }
  },
  appUninstalled: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['X-Shopify-Shop-Domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ partnerSpecificUrl: shopDomain });
      if (!_.isNull(storeDetail)) {
        await this.confirmUninstalled(storeDetail._id);
      }
      return httpHelper.ok(
        {
          message: "Received"
        }
      );
    }
  },
  shopUpdate: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['X-Shopify-Shop-Domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ partnerSpecificUrl: shopDomain });
      if (!storeDetail || !storeDetail.active) {
        return httpHelper.ok(
          {
            message: "Received"
          }
        );
      }

      const shop = JSON.parse(event.body);
      const shopUpdate = {
        partnerPlan: shop.plan_name,
        title: shop.name,
        url: shop.domain,
        partnerSpecificUrl: shop.myshopify_domain,
        partnerCreatedAt: shop.created_at,
        partnerUpdatedAt: shop.updated_at,
        timezone: shop.iana_timezone,
        moneyFormat: shop.money_format,
        moneyWithCurrencyFormat: shop.money_with_currency_format,
      }
      const update = await StoreModel.updateOne({ _id: storeDetail._id }, shopUpdate);
      return httpHelper.ok(
        {
          message: "Received"
        }
      );
    }
  },
  shopifyAPICall: async function (url, body, method, accessToken) {
    if (!url || !accessToken) {
      throw new Error(" url or accessToken not found. ");
    }
    let res;
    res = await fetch(url, {
      body,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      method: method
    })
    console.log(`TCL: x-shopify-shop-api-call-limit ${url}`, res.headers.get('x-shopify-shop-api-call-limit'))
    const retryAfter = res.headers.get('Retry-After');
    if (!_.isNull(retryAfter)) {
      console.log(`TCL: retryAfter the given shop. ${url}`, retryAfter)
      await this.sleep(12000);
    }
    const json = await res.json();
    await this.sleep(1000);
    if ("error_description" in json || "error" in json || "errors" in json) {
      console.log("TCL: error json", json)
      console.error("TCL: shopifyAPICall error url", url)
      let errorResponse;
      if (!_.isUndefined(json.error_description)) {
        errorResponse = JSON.stringify(json.error_description);
      } else if (!_.isUndefined(json.errors)) {
        errorResponse = JSON.stringify(json.errors);
      } else if (!_.isUndefined(json.error)) {
        errorResponse = JSON.stringify(json.error);
      }
      const shopUrl = url.split('/admin')[0].replace('https://', '');;
      console.log("TCL: errorResponse", errorResponse)
      if (errorResponse.indexOf('[API] Invalid API') >= 0) {
        return { json: null, res: res, error: null };
      } else if (errorResponse.indexOf('Not Found') >= 0) {
        return { json: null, res: res, error: null };
      } else if (errorResponse.indexOf('for this topic has already been taken') >= 0) {
      } else if (errorResponse.indexOf('page_info') >= 0 && errorResponse.indexOf('Invalid value') >= 0) {
        return { json: null, res: res, error: null };
      } else if (errorResponse.indexOf('for this topic has already been taken') >= 0) {
        return { json: null, res: res, error: null };
      } else if (errorResponse.indexOf('Unavailable Shop') >= 0) {
        return { json: null, res: res, error: null };
      } else if (errorResponse.indexOf('Internal') >= 0) {
        return { json: null, res: res, error: null };
      } else {
        return { json: null, res: res, error: errorResponse };
      }
    }
    return { json: json, res: res, error: null };
  },
  sleep: async function (seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds));
  },
  confirmUninstalled: async function (storeId) {
    try {
      console.log("TCL: confirmUninstalled storeId", storeId)
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findById(storeId);
      if (!_.isNull(storeDetail)) {
        const collectionDelete = await shared.CollectionModel.deleteMany({ store: storeDetail._id });
        const productDelete = await shared.ProductModel.deleteMany({ store: storeDetail._id });
        const ruleDelete = await shared.RuleModel.updateMany({ store: storeDetail._id }, { active: false });
        const updateDelete = await shared.UpdateModel.updateMany(
          {
            store: storeDetail._id,
            scheduleTime: { $gte: moment().utc() }
          },
          { scheduleState: PAUSED, isStoreDeleted: true }
        );
        storeDetail.isUninstalled = true;
        storeDetail.uninstalledDate = new Date().toISOString();
        storeDetail.isCharged = false;
        storeDetail.paymentPlan = FREE_PLAN;
        storeDetail.intercomId = "";
        storeDetail.freeProActivated = false;
        await storeDetail.save();

        intercomDeleteBody = JSON.stringify({ intercom_user_id: storeDetail.intercomId });
        const res = await fetch("https://api.intercom.io/user_delete_requests", {
          body: intercomDeleteBody,
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.INTERCOM_API_TOKEN}`,
          },
          method: "POST"
        })
      }
    } catch (error) {
      console.error("TCL: error", error)

    }
  }
}