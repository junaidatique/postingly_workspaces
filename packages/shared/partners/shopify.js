const shared = require('shared');
const fetch = require('node-fetch');
const _ = require('lodash');
const moment = require('moment');

const {
  PARTNERS_SHOPIFY, FACEBOOK_DEFAULT_TEXT,
  LINK_SHORTNER_SERVICES_POOOST,
  WEBHOOKS, PENDING, APPROVED,
  RULE_TYPE_NEW
} = require('shared/constants');

const stringHelper = require('shared').stringHelper;
const httpHelper = require('shared').httpHelper
const cognitoHelper = require('shared').cognitoHelper
const jwt = require('shared').jwtHelper;
const StoreModel = require('shared').StoreModel

const querystring = require('querystring')
const jsonwebtoken = require('jsonwebtoken');

let lambda;
let sqs;

const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
  AWS.config.update({ region: process.env.AWS_REGION });
  sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
}
module.exports = {
  getAuthURL: async function (event, now) {
    try {
      console.log("-----------------------------getAuthURL Start-----------------------------");
      const shopifyApiKey = process.env.SHOPIFY_API_KEY;
      const shopifyScope = process.env.SHOPIFY_SCOPE;

      if (!shopifyApiKey) {
        return httpHelper.badRequest("SHOPIFY_API_KEY environment variable not set");
      }

      if (!shopifyScope) {
        return httpHelper.badRequest("SHOPIFY_SCOPE environment variable not set");
      }

      if (!event.queryStringParameters) {
        console.log("TCL: event.queryStringParameters", event.queryStringParameters)
        const response = httpHelper.badRequest("No query string paramters found");
        console.log("TCL: response", response)
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

      console.log("-----------------------------getAuthURL Completed-----------------------------")
      // Return the authURL
      return httpHelper.ok(
        {
          authUrl,
          token: jwt.createJWT(shop, eNonce, now, 600)
        }
      );

    } catch (e) {
      console.log("-----------------------------getAuthURL Error-----------------------------", e);
      return httpHelper.internalError();
    }
  },

  verifyCallback: async function (event, now) {
    try {
      console.group('verifyCallback');
      console.log("-----------------------------verifyCallback Start-----------------------------");
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
      console.log("verifyCallback params", params);
      console.log("verifyCallback username", username);
      console.log("verifyCallback email", email);
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
        console.log("TCL: verifyCallback exchangeToken err", err.message)
        return httpHelper.badRequest("autherization code is already used.");
      }

      const accessToken = response.access_token;
      if (accessToken === undefined) {
        console.log("verifyCallback response[\"access_token\"] is undefined");
        throw new Error("response[\"access_token\"] is undefined");
      }
      const shop = await this.getShop(shopDomain, accessToken);


      const storeKey = `shopify-${shop.id}`;
      console.log("TCL: storeKey", storeKey)
      let store = await StoreModel.findOne({ uniqKey: storeKey });
      console.log("TCL: store", store)
      let isCharged = false;
      let createUserUsername = shop.email;
      let createUserEmail = shop.email;
      if (!_.isUndefined(username) && !_.isNull(username) && username !== 'undefined' && username !== 'null') {
        createUserUsername = username;
      }
      if (!_.isUndefined(email) && !_.isNull(email) && email !== 'undefined' && email !== 'null') {
        createUserEmail = email;
      }
      const cognitoUser = await cognitoHelper.createUser(createUserUsername, createUserEmail, shopDomain);
      if (store === null) {
        console.log("verifyCallback new signup");
        const shopParams = {
          uniqKey: storeKey,
          userId: cognitoUser,
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
          shortLinkService: LINK_SHORTNER_SERVICES_POOOST,
          // chargedMethod: '',
          // chargeId: '',
          isUninstalled: false,
        };
        const storeInstance = new StoreModel(shopParams);
        store = await storeInstance.save();
        console.log("TCL: store", store);
      } else {

        isCharged = store.isCharged;
        store.isUninstalled = false;
        await store.save();
      }
      let chargeAuthorizationUrl = null
      if (!isCharged) {
        chargeAuthorizationUrl = await this.createCharge(shop.myshopify_domain, accessToken);
      }
      console.log("chargeAuthorizationUrl:", chargeAuthorizationUrl)
      nonce = stringHelper.getRandomString(32);
      console.log("-----------------------------verifyCallback Completed-----------------------------");
      console.groupEnd();
      return httpHelper.ok({
        chargeURL: chargeAuthorizationUrl,
        userName: cognitoUser,
        storePartnerId: storeKey,
        token: jwt.createJWT(cognitoUser, nonce, now, 600),
      });
    } catch (error) {
      console.log("-----------------------------verifyCallback Error-----------------------------", error);
      return httpHelper.internalError();
    }

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
    if (shopDomain.match(/^[a-z][a-z0-9\-]*\.myshopify\.com$/i) === null) {
      console.log("Shop validation failed", shopDomain);
      return false;
    }

    return true;
  },

  // Validate the HMAC parameter
  validateHMAC: function (params) {
    return true;
    // const shopifyApiSecret = process.env.SHOPIFY_SECRET;
    // const shopifyApiSecret = 'ShtespOxGicviv9';
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

  createCharge: async function (shop, accessToken) {
    console.log("createCharge shop", shop);
    const body = JSON.stringify({
      recurring_application_charge: {
        name: `${process.env.APP_TITLE}`,
        price: 10,
        return_url: `${process.env.FRONTEND_URL}${process.env.SHOPIFY_PAYMENT_REUTRN}?shop=${shop}`,
        test: (process.env.STAGE === 'prod') ? false : true,
        trial_days: process.env.SHOPIFY_TRAIL_DAYS,
      }
    });
    const url = `https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION}/recurring_application_charges.json`;
    const { json, res } = await this.shopifyAPICall(url, body, 'post', accessToken);
    console.log("createCharge json", json);
    if ("error_description" in json || "error" in json || "errors" in json) {
      throw new Error(json.error_description || json.error || json.errors);
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
    const { json, res } = await this.shopifyAPICall(`https://${shopDomain}/admin/shop.json`, null, 'get', accessToken);
    console.log("getShop json", json.shop);
    if ("error_description" in json || "error" in json || "errors" in json) {
      throw new Error(json.error_description || json.error || json.errors);
    }
    return json.shop;
  },

  activatePayment: async function (event) {
    console.log("-----------------------------activatePayment Start-----------------------------");
    if (!event.body) {
      return httpHelper.badRequest("body is empty");
    }
    const json = JSON.parse(event.body);
    const { token, params } = json;
    if (!token) {
      return httpHelper.badRequest("'token' is missing");
    }
    if (!params) {
      return httpHelper.badRequest("'params' is missing");
    }
    console.log("activatePayment params", params);
    const { charge_id, shop, storePartnerId } = params;
    if (!this.validateShopDomain(shop)) {
      return httpHelper.badRequest("Invalid 'shop'");
    }
    const storeKey = `${storePartnerId}`;
    console.log("activatePayment storeKey", storeKey);
    const store = await StoreModel.findOne({ uniqKey: storeKey });
    // let store = await query.getItem(process.env.STORES_TABLE, { storeKey: storeKey });
    console.log("activatePayment store", store);
    const accessToken = store.partnerToken;
    console.log("activatePayment accessToken", accessToken);
    let chargeResponse;
    try {
      chargeResponse = await this.getCharge(shop, charge_id, accessToken)
    } catch (err) {
      console.log("get charge error", err);
      return httpHelper.badRequest("charge not found.");
    }

    try {
      const activateResponse = await this.activateCharge(shop, chargeResponse, accessToken);
    } catch (err) {
      console.log("activate charge erro", err);
      return httpHelper.badRequest("charge not activated.");
    }
    store.isCharged = true;
    store.chargedMethod = 'shopify';
    store.chargeId = charge_id;
    store.chargeDate = (new Date()).toISOString();;
    try {
      await store.save();
      const storePayload = {
        "storeId": store._id,
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
        this.syncStoreData(storePayload);
      }
      const webhookPayload = {
        partnerStore: PARTNERS_SHOPIFY,
        shopURL: store.url,
        accessToken: store.partnerToken
      }
      if (process.env.IS_OFFLINE === 'false') {
        const webhookParams = {
          FunctionName: `postingly-functions-${process.env.STAGE}-get-webhooks`,
          InvocationType: 'Event',
          LogType: 'Tail',
          Payload: JSON.stringify(webhookPayload)
        };
        console.log("TCL: lambda.invoke webhookParams", webhookParams)

        const webhookLambdaResponse = await lambda.invoke(webhookParams).promise();
        console.log("TCL: webhookLambdaResponse", webhookLambdaResponse)
      } else {
        // this.getWebhooks(webhookPayload);
      }
    } catch (err) {
      console.log("TCL: err", err.message)
      console.log("activatePayment: Store can't be saved");
    }
    console.log("-----------------------------activatePayment Completed-----------------------------");

    return httpHelper.ok({
      message: "Done",
    });

  },

  getCharge: async function (shop, charge_id, accessToken) {
    console.log("getCharge shop", shop);
    console.log("getCharge charge_id", charge_id);
    const url = `https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION}/recurring_application_charges/${charge_id}.json`;
    const { json, res } = await this.shopifyAPICall(url, null, 'get', accessToken);
    console.log("getCharge json response", json);
    if ("error_description" in json || "error" in json || "errors" in json) {
      throw new Error(json.error_description || json.error || json.errors);
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
    const { json, res } = await this.shopifyAPICall(url, body, 'post', accessToken);
    console.log("activateCharge json", json);
    if ("error_description" in json || "error" in json || "errors" in json) {
      console.log("TCL: json", json)
      throw new Error(json.error_description || json.error || json.errors);
    }
    return json.recurring_application_charge;
  },

  syncStoreData: async function (event) {
    console.log('syncStoreData event', event);
    await this.syncProductCount(event);
    const ProductModel = shared.ProductModel;
    // Collections are reset so that new collections can be assigned to products. 
    const dbCollectionsUpdate = await ProductModel.updateMany({ store: event.storeId }, { collections: [] });
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
      pageInfo: null
    }
    const syncVariantPayload = {
      storeId: event.storeId,
      partnerStore: PARTNERS_SHOPIFY,
      collectionId: null,
      pageInfo: null
    }
    // console.log("TCL: syncCustomCollectionPayload", syncCustomCollectionPayload)
    // console.log("TCL: syncSmartCollectionPayload", syncSmartCollectionPayload)
    // console.log("TCL: syncProductPayload", syncProductPayload)
    if (process.env.IS_OFFLINE === 'false') {
      // syncing the custome colltions 
      const QueueUrlCustomCollectionPayload = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncCollectionPage`;
      console.log("TCL: QueueUrlCustomCollectionPayload", QueueUrlCustomCollectionPayload)
      const paramsCustomCollectionPayload = {
        MessageBody: JSON.stringify(syncCustomCollectionPayload),
        QueueUrl: QueueUrlCustomCollectionPayload
      };
      console.log("TCL: paramsCustomCollectionPayload", paramsCustomCollectionPayload)
      const responseCustomCollectionPayload = await sqs.sendMessage(paramsCustomCollectionPayload).promise();
      console.log("TCL: responseCustomCollectionPayload", responseCustomCollectionPayload)

      // syncing the smart collections
      // syncing the custome colltions 
      const QueueUrlSmartCollectionPayload = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncCollectionPage`;
      console.log("TCL: QueueUrlSmartCollectionPayload", QueueUrlSmartCollectionPayload)
      const paramsSmartCollectionPayload = {
        MessageBody: JSON.stringify(syncSmartCollectionPayload),
        QueueUrl: QueueUrlSmartCollectionPayload
      };
      console.log("TCL: paramsSmartCollectionPayload", paramsSmartCollectionPayload)
      const responseSmartCollectionPayload = await sqs.sendMessage(paramsSmartCollectionPayload).promise();
      console.log("TCL: responseSmartCollectionPayload", responseSmartCollectionPayload)

      // syncing products
      const QueueUrlProductPayload = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncProductPage`;
      console.log("TCL: QueueUrlProductPayload", QueueUrlProductPayload)
      const paramsProductPayload = {
        MessageBody: JSON.stringify(syncProductPayload),
        QueueUrl: QueueUrlProductPayload
      };
      console.log("TCL: paramsProductPayload", paramsProductPayload)
      const responseProductPayload = await sqs.sendMessage(paramsProductPayload).promise();
      console.log("TCL: responseProductPayload", responseProductPayload)

      // syncing Variants
      const QueueUrlVariantPayload = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncVariantPage`;
      console.log("TCL: QueueUrlVariantPayload", QueueUrlVariantPayload)
      const paramsVariantPayload = {
        MessageBody: JSON.stringify(syncVariantPayload),
        QueueUrl: QueueUrlVariantPayload
      };
      console.log("TCL: paramsVariantPayload", paramsVariantPayload)
      const responseVariantPayload = await sqs.sendMessage(paramsVariantPayload).promise();
      console.log("TCL: responseVariantPayload", responseVariantPayload)

    } else {
      await this.syncCollectionPage(syncCustomCollectionPayload);
      await this.syncCollectionPage(syncSmartCollectionPayload);
      await this.syncProductPage(syncProductPayload);
    }
  },

  syncCollectionPage: async function (event) {
    console.log('syncCollectionPage event', event);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const storeDetail = await StoreModel.findById(event.storeId);
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
    const { json, res } = await this.shopifyAPICall(url, null, 'get', storeDetail.partnerToken);
    if ("error_description" in json || "error" in json || "errors" in json) {
      console.log("TCL: syncCollectionPage json", json)
      throw new Error(json.error_description || json.error || json.errors);
    }
    console.log("TCL: syncCollectionPage json", json[event.collectionType].length);
    let collectionUniqKeys = await this.syncCollections(storeDetail._id, json[event.collectionType]);
    console.log("TCL: syncCollectionPage collectionUniqKeys", collectionUniqKeys)

    if (!_.isNull(event.productId)) {
      return collectionUniqKeys;
    } else {
      if (!_.isNull(res.headers.get('link')) && !_.isUndefined(res.headers.get('link'))) {
        const pageInfo = stringHelper.getShopifyPageInfo(res.headers.get('link'));
        if (!_.isNull(pageInfo)) {
          if (process.env.IS_OFFLINE === 'false') {
            // syncing the custome colltions 
            const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncCollectionPage`;
            console.log("TCL: QueueUrl", QueueUrl)
            const params = {
              MessageBody: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: event.collectionType, pageInfo: pageInfo }),
              QueueUrl: QueueUrl
            };
            console.log("TCL: params", params)
            const response = await sqs.sendMessage(params).promise();
            console.log("TCL: response", response)
          } else {
            await this.syncCollectionPage({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: event.collectionType, pageInfo: pageInfo });
          }
        }
      }
      const dbCollections = await CollectionModel.where('uniqKey').in(collectionUniqKeys.map(collection => collection)).select('_id');
      console.log("TCL: syncCollectionPage dbCollections", dbCollections);
      await Promise.all(dbCollections.map(async collection => {
        if (process.env.IS_OFFLINE === 'false') {
          // syncing products
          const QueueUrlProductPayload = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncProductPage`;
          console.log("TCL: QueueUrlProductPayload", QueueUrlProductPayload)
          const paramsProductPayload = {
            MessageBody: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: collection._id, pageInfo: null }),
            QueueUrl: QueueUrlProductPayload
          };
          console.log("TCL: paramsProductPayload", paramsProductPayload)
          const responseProductPayload = await sqs.sendMessage(paramsProductPayload).promise();
          console.log("TCL: responseProductPayload", responseProductPayload)

        } else {
          const payload = { storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: collection._id, pageInfo: null };
          console.log("TCL: syncCollectionPage payload", payload)
          await this.syncProductPage(payload);
        }
      }));
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
    const url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products/count.json?published_status=published`;
    console.log("TCL: syncProductCount url", url)
    const { json, res } = await this.shopifyAPICall(url, null, 'get', storeDetail.partnerToken);
    if ("error_description" in json || "error" in json || "errors" in json) {
      console.log("TCL: syncProductCount json", json)
      throw new Error(json.error_description || json.error || json.errors);
    }
    console.log("TCL: syncProductCount json", json);
    storeDetail.numberOfProducts = json.count;
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
    let collectionQuery = '';
    let pageInfoQuery = '';

    if (!_.isNull(event.pageInfo)) {
      pageInfoQuery = `&page_info=${event.pageInfo}`;
    } else {
      pageInfoQuery = '&published_status=published'
      if (!_.isNull(event.collectionId)) {
        const collectionDetail = await CollectionModel.findById(event.collectionId);
        collectionQuery = `&collection_id=${collectionDetail.partnerId}`;
      }
    }
    const url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?limit=75${collectionQuery}${pageInfoQuery}`;
    console.log("TCL: syncProductPage url", url)
    const { json, res } = await this.shopifyAPICall(url, null, 'get', storeDetail.partnerToken);
    if ("error_description" in json || "error" in json || "errors" in json) {
      console.log("TCL: syncProductPage json error", json)
      // 
      if ((json.error_description || json.error || json.errors).indexOf('Exceeded') >= 0) {
        if (process.env.IS_OFFLINE === 'false') {
          // syncing products
          const QueueUrlSyncProductPage = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncProductPage`;
          console.log("TCL: QueueUrlSyncProductPage", QueueUrlSyncProductPage)
          const paramsSyncProductPage = {
            MessageBody: JSON.stringify(event),
            QueueUrl: QueueUrlSyncProductPage
          };
          console.log("TCL: paramsSyncProductPage", paramsSyncProductPage)
          const responseSyncProductPage = await sqs.sendMessage(paramsSyncProductPage).promise();
          console.log("TCL: responseSyncProductPage", responseSyncProductPage)

        }
      } else {
        throw new Error(json.error_description || json.error || json.errors);
      }

    } else {
      const apiProducts = json.products;
      console.log("TCL: apiProducts.length", apiProducts.length);
      if (!_.isUndefined(context)) {
        console.log('syncProductPage event after api call', (context.getRemainingTimeInMillis() / 1000));
      }
      if (apiProducts.length > 0) {
        await this.syncProducts(event, apiProducts, storeDetail, context);
      }
      if (!_.isUndefined(context)) {
        console.log('syncProductPage event after syncProducts', (context.getRemainingTimeInMillis() / 1000));
      }
      if (!_.isNull(res.headers.get('link')) && !_.isUndefined(res.headers.get('link'))) {
        console.log("TCL: There is next page. ")
        const pageInfo = stringHelper.getShopifyPageInfo(res.headers.get('link'));
        if (!_.isNull(pageInfo)) {
          if (process.env.IS_OFFLINE === 'false') {
            // syncing products
            const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncProductPage`;
            console.log("TCL: QueueUrl", QueueUrl)
            const params = {
              MessageBody: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: event.collectionId, pageInfo: pageInfo }),
              QueueUrl: QueueUrl
            };
            console.log("TCL: params", params)
            const response = await sqs.sendMessage(params).promise();
            console.log("TCL: response", response)
          } else {
            const payload = { storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: event.collectionId, pageInfo: pageInfo };
            await this.syncProductPage(payload);
          }
        }
        if (!_.isUndefined(context)) {
          console.log('syncProductPage event after lambda.invoke', (context.getRemainingTimeInMillis() / 1000));
        }
      } else {
        console.log("All products are now sycned. its time to sync variants. ")
        if (process.env.IS_OFFLINE === 'false') {
          // sync variant products
          // syncing Variants
          const QueueUrlVariantPayload = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncVariantPage`;
          console.log("TCL: QueueUrl", QueueUrlVariantPayload)
          const paramsVariantPayload = {
            MessageBody: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: event.collectionId, pageInfo: null }),
            QueueUrl: QueueUrlVariantPayload
          };
          console.log("TCL: paramsVariantPayload", paramsVariantPayload)
          const responseVariantPayload = await sqs.sendMessage(paramsVariantPayload).promise();
          console.log("TCL: responseVariantPayload", responseVariantPayload)
        } else {
          await this.syncVariantPage({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: event.collectionId, pageInfo: null });
        }
      }
      console.log("TCL: Sync Prdouct completed for this api call. ")
    }
  },
  syncVariantPage: async function (event, context) {
    console.log('syncVariantPage event', event);
    if (!_.isUndefined(context)) {
      console.log('syncVariantPage event start', (context.getRemainingTimeInMillis() / 1000));
    }
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    let collectionQuery = '';
    let pageInfoQuery = '';

    if (!_.isNull(event.pageInfo)) {
      pageInfoQuery = `&page_info=${event.pageInfo}`;
    } else {
      pageInfoQuery = '&published_status=published'
      if (!_.isNull(event.collectionId)) {
        const collectionDetail = await CollectionModel.findById(event.collectionId);
        collectionQuery = `&collection_id=${collectionDetail.partnerId}`;
      }
    }
    const url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?limit=20${collectionQuery}${pageInfoQuery}`;
    console.log("TCL: syncVariantPage url", url)
    const { json, res } = await this.shopifyAPICall(url, null, 'get', storeDetail.partnerToken);
    if ("error_description" in json || "error" in json || "errors" in json) {
      console.log("TCL: syncVariantPage json error", json);
      if ((json.error_description || json.error || json.errors).indexOf('Exceeded') >= 0) {
        if (process.env.IS_OFFLINE === 'false') {
          // syncing Variants
          const QueueUrlSyncVariantPage = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncVariantPage`;
          console.log("TCL: QueueUrlSyncVariantPage", QueueUrlSyncVariantPage)
          const paramsSyncVariantPage = {
            MessageBody: JSON.stringify(event),
            QueueUrl: QueueUrlSyncVariantPage
          };
          console.log("TCL: paramsSyncVariantPage", paramsSyncVariantPage)
          const responseSyncVariantPage = await sqs.sendMessage(paramsSyncVariantPage).promise();
          console.log("TCL: responseSyncVariantPage", responseSyncVariantPage)
        }
      } else {
        throw new Error(json.error_description || json.error || json.errors);
      }
    } else {


      const apiProducts = json.products;
      console.log("TCL: apiProducts.length", apiProducts.length);
      if (!_.isUndefined(context)) {
        console.log('syncVariantPage event after api call', (context.getRemainingTimeInMillis() / 1000));
      }
      if (apiProducts.length > 0) {
        await this.syncVariants(event, apiProducts, storeDetail, context);
      }
      if (!_.isUndefined(context)) {
        console.log('syncVariantPage event after syncVariants', (context.getRemainingTimeInMillis() / 1000));
      }
      if (!_.isNull(res.headers.get('link')) && !_.isUndefined(res.headers.get('link'))) {
        console.log("TCL: There is next page. ")
        const pageInfo = stringHelper.getShopifyPageInfo(res.headers.get('link'));
        if (!_.isNull(pageInfo)) {
          if (process.env.IS_OFFLINE === 'false') {
            // syncing Variants
            const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncVariantPage`;
            console.log("TCL: QueueUrl", QueueUrl)
            const params = {
              MessageBody: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: event.collectionId, pageInfo: pageInfo }),
              QueueUrl: QueueUrl
            };
            console.log("TCL: params", params)
            const response = await sqs.sendMessage(params).promise();
            console.log("TCL: response", response)
          } else {
            const payload = { storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: event.collectionId, pageInfo: pageInfo };
            await this.syncVariantPage(payload);
          }
        }
        if (!_.isUndefined(context)) {
          console.log('syncVariantPage event after lambda.invoke', (context.getRemainingTimeInMillis() / 1000));
        }
      }
      console.log("TCL: Sync Prdouct completed for this api call. ")
    }
  },
  addCollectiontoItems: async function (model, items, collectionId) {
    if (items.length > 0) {
      const bulkCollectionUpdate = items.map(item => {
        let collections = item.collections;
        collections.push(collectionId);
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
  syncProducts: async function (event, apiProducts, storeDetail, context) {
    // console.log("TCL: apiProducts", apiProducts)
    let productImages = [];
    const ProductModel = shared.ProductModel;
    const ImageModel = shared.ImageModel;

    // sync products
    const bulkProductInsert = apiProducts.map(product => {
      const quantity = product.variants.map(variant => variant.inventory_quantity).reduce((prev, curr) => prev + curr, 0);
      const minimumPrice = product.variants.map(variant => (variant.price)).reduce((p, v) => ((p < v && p > 0) ? p : v));
      const maximumPrice = product.variants.map(variant => (variant.price)).reduce((p, v) => ((p > v) ? p : v));
      const onSale = product.variants.map(variant => (variant.compare_at_price != variant.price) ? true : false).includes(true);
      const partnerSpecificUrl = `https://${storeDetail.url}/${product.handle}`;
      return {
        updateOne: {
          filter: { uniqKey: `${PARTNERS_SHOPIFY}-${product.id}` },
          update: {
            title: product.title,
            description: stringHelper.stripTags(product.body_html),
            suggestedText: stringHelper.formatCaptionText(FACEBOOK_DEFAULT_TEXT, product.title, partnerSpecificUrl, minimumPrice, stringHelper.stripTags(product.body_html)),
            partnerSpecificUrl: partnerSpecificUrl,
            partner: PARTNERS_SHOPIFY,
            partnerId: product.id,
            partnerName: product.title,
            partnerCreatedAt: product.created_at,
            partnerUpdatedAt: product.updated_at,
            uniqKey: `${PARTNERS_SHOPIFY}-${product.id}`,
            active: (product.published_at) ? true : false,
            store: storeDetail._id,
            quantity: quantity,
            minimumPrice: minimumPrice,
            maximumPrice: maximumPrice,
            onSale: onSale,
            postableByImage: (product.images.length > 0) ? true : false,
            postableByQuantity: (quantity > 0) ? true : false,
            postableByPrice: (minimumPrice > 0) ? true : false,
            postableIsNew: (moment(product.created_at).isAfter(moment().subtract(1, 'days'))) ? true : false,
            postableBySale: onSale
          },
          upsert: true
        }
      }
    });
    try {
      if (!_.isEmpty(bulkProductInsert)) {
        const products = await ProductModel.bulkWrite(bulkProductInsert);
      }
    } catch (error) {
      console.log("TCL: bulkProductInsert error", error.message)

    }

    console.log("TCL: syncProducts bulkProductInsert.length", bulkProductInsert.length)
    if (!_.isUndefined(context)) {
      console.log('syncProducts event after bulkProductInsert', (context.getRemainingTimeInMillis() / 1000));
    }
    const dbProducts = await ProductModel.where('uniqKey').in(apiProducts.map(product => `${PARTNERS_SHOPIFY}-${product.id}`)).select('_id uniqKey postableByImage collections partnerSpecificUrl description');
    if (!_.isNull(event.collectionId)) {
      await this.addCollectiontoItems(ProductModel, dbProducts, event.collectionId);
    } else {
      if (dbProducts.length > 0) {
        // set active to false so that deleted images and variants are eliminated. 
        const dbImagesUpdate = await ImageModel.updateMany({ product: { $in: dbProducts.map(product => product._id) } }, { active: false });
        // sync images for the products.
        const bulkImageInsert = apiProducts.map(product => {
          const productId = dbProducts.find(dbProduct => dbProduct.uniqKey === `${PARTNERS_SHOPIFY}-${product.id}`)._id;
          return product.images.map(productImage => {
            const thumbnailUrl = `${productImage.src.slice(0, productImage.src.lastIndexOf('.'))}_small.${productImage.src.slice(productImage.src.lastIndexOf('.') + 1)}`;
            return {
              updateOne: {
                filter: { imgUniqKey: `product-${PARTNERS_SHOPIFY}-${productImage.id}` },
                update: {
                  partnerSpecificUrl: productImage.src,
                  partnerId: productImage.id,
                  partneCreatedAt: productImage.published_at,
                  partnerUpdatedAt: productImage.updated_at,
                  partner: PARTNERS_SHOPIFY,
                  imgUniqKey: `product-${PARTNERS_SHOPIFY}-${productImage.id}`,
                  position: productImage.position,
                  thumbnailUrl,
                  active: true,
                  store: event.storeId,
                  product: productId,
                },
                upsert: true
              }
            }
          })
        });
        if (!_.isEmpty(bulkImageInsert)) {
          const images = await ImageModel.bulkWrite([].concat.apply([], bulkImageInsert));
        }
        console.log("TCL: syncProducts bulkImageInsert.length", bulkImageInsert.length)
        if (!_.isUndefined(context)) {
          console.log('syncProducts event after images', (context.getRemainingTimeInMillis() / 1000));
        }


        // now all the images and variants are synced. now we need to create relationship with products
        // first images that are recently synced.
        const dbImages = await ImageModel.where('product').in(dbProducts.map(product => product._id));
        dbImages.forEach(image => {
          if (_.isEmpty(productImages[image.product])) {
            productImages[image.product] = [];
          }
          productImages[image.product].push(image._id)
        })

        // query to update variants and images for the products. 
        bulkProductUpdate = dbProducts.map(product => {
          return {
            updateOne: {
              filter: { _id: product._id },
              update: {
                images: productImages[product._id],
              }
            }
          }
        })
        const r = await ProductModel.bulkWrite(bulkProductUpdate);
        if (!_.isUndefined(context)) {
          console.log('syncProducts event after bulkProductUpdate', (context.getRemainingTimeInMillis() / 1000));
        }
        const productCount = await ProductModel.countDocuments({ store: storeDetail._id, active: true });
        console.log("TCL: productCount", productCount)
        storeDetail.noOfActiveProducts = productCount;
        await storeDetail.save();
        console.log("TCL: All Done")
        // all done.
      }
    }
  },
  syncVariants: async function (event, apiProducts, storeDetail, context) {
    let productVariants = [], variantImages = [];
    const ProductModel = shared.ProductModel;
    const ImageModel = shared.ImageModel;
    const VariantModel = shared.VariantModel;

    const dbProducts = await ProductModel.where('uniqKey').in(apiProducts.map(product => `${PARTNERS_SHOPIFY}-${product.id}`)).select('_id uniqKey postableByImage collections partnerSpecificUrl description');

    const dbVariantsUpdate = await VariantModel.updateMany({ product: { $in: dbProducts.map(product => product._id) } }, { active: false });
    // sync variants for the product
    let bulkVariantInsert = [];
    apiProducts.forEach(product => {
      const productForVariant = dbProducts.find(dbProduct => dbProduct.uniqKey === `${PARTNERS_SHOPIFY}-${product.id}`);
      if (_.isUndefined(productForVariant)) {
        return;
      }
      // console.log("TCL: product.variants", product.variants)
      product.variants.forEach(variant => {
        const onSale = ((variant.compare_at_price != variant.price)) ? true : false;
        if (variant.image_id) {
          variantImages.push({ variantUniqKey: `${PARTNERS_SHOPIFY}-${variant.id}`, imagePartnerId: variant.image_id });
        }
        bulkVariantInsert.push({
          updateOne: {
            filter: { uniqKey: `${PARTNERS_SHOPIFY}-${variant.id}` },
            update: {
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
              store: event.storeId,
              suggestedText: stringHelper.formatCaptionText(FACEBOOK_DEFAULT_TEXT, variant.title, productForVariant.partnerSpecificUrl, variant.price, stringHelper.stripTags(productForVariant.description)),
              product: productForVariant._id,
              postableByImage: productForVariant.postableByImage,
              postableByQuantity: (variant.inventory_quantity > 0) ? true : false,
              postableByPrice: (variant.price > 0) ? true : false,
              postableIsNew: (moment(variant.created_at).isAfter(moment().subtract(7, 'days'))) ? true : false,
              postableBySale: onSale,
              active: true
            },
            upsert: true
          }
        });
      })
    });

    console.log("TCL: syncVariants bulkVariantInsert.length", bulkVariantInsert.length);
    try {
      if (!_.isEmpty(bulkVariantInsert)) {
        const variants = await VariantModel.bulkWrite(bulkVariantInsert);
      }
    } catch (error) {
      console.log("TCL: bulkVariantInsert error", error.message)
    }
    if (!_.isUndefined(context)) {
      console.log('syncVariants event after variants', (context.getRemainingTimeInMillis() / 1000));
    }
    const dbVariants = await VariantModel.where('product').in(dbProducts.map(product => product._id)).select('_id product collections uniqKey');
    if (!_.isNull(event.collectionId)) {
      await this.addCollectiontoItems(VariantModel, dbVariants, event.collectionId);
    } else {
      // now all the images and variants are synced. now we need to create relationship with products      
      // creating productVariants to add variants that are recently synced for the product.
      if (dbVariants.length > 0) {
        dbVariants.forEach(variant => {
          if (_.isEmpty(productVariants[variant.product])) {
            productVariants[variant.product] = [];
          }
          productVariants[variant.product].push(variant._id)
        })
        // query to update variants and images for the products. 
        bulkProductUpdate = dbProducts.map(product => {
          return {
            updateOne: {
              filter: { _id: product._id },
              update: {
                variants: productVariants[product._id],
              }
            }
          }
        })
        const r = await ProductModel.bulkWrite(bulkProductUpdate);
        if (!_.isUndefined(context)) {
          console.log('syncVariants event after bulkProductUpdate', (context.getRemainingTimeInMillis() / 1000));
        }
        const dbImages = await ImageModel.where('product').in(dbProducts.map(product => product._id));
        // variants may also have images. so syncing images with varaints. 
        const bulkVariantImages = variantImages.map(variantImage => {
          const image = dbImages.find(dbImage => dbImage.imgUniqKey === `product-${PARTNERS_SHOPIFY}-${variantImage.imagePartnerId}`);
          const variant = dbVariants.find(dbVariant => dbVariant.uniqKey === variantImage.variantUniqKey);
          return {
            updateOne: {
              filter: { imgUniqKey: `variant-${PARTNERS_SHOPIFY}-${variantImage.imagePartnerId}` },
              update: {
                partnerSpecificUrl: image.partnerSpecificUrl,
                partnerId: image.partnerId,
                partneCreatedAt: image.partneCreatedAt,
                partnerUpdatedAt: image.partnerUpdatedAt,
                partner: PARTNERS_SHOPIFY,
                position: image.position,
                thumbnailUrl: image.thumbnailUrl,
                active: true,
                store: event.storeId,
                variant: variant._id,
              },
              upsert: true
            }
          }
        });

        if (!_.isEmpty(bulkVariantImages)) {
          const t = await ImageModel.bulkWrite(bulkVariantImages);
        }
        console.log("TCL: syncVariants bulkVariantImages.length", bulkVariantImages.length)
        if (!_.isUndefined(context)) {
          console.log('syncVariants event after VariantImages', (context.getRemainingTimeInMillis() / 1000));
        }
        const dbVariantImages = await ImageModel.where('variant').in(dbVariants.map(variant => variant._id));
        console.log("TCL: syncVariants dbVariantImages.length", dbVariantImages.length);
        if (!_.isUndefined(context)) {
          console.log('syncVariants event after dbVariantImages', (context.getRemainingTimeInMillis() / 1000));
        }
        const bulkVariantUpdate = dbVariantImages.map(variantImage => {
          return {
            updateOne: {
              filter: { _id: variantImage.variant },
              update: {
                images: variantImage._id,
              }
            }
          }
        });
        if (!_.isEmpty(bulkVariantUpdate)) {
          const s = await VariantModel.bulkWrite(bulkVariantUpdate);
        }
        console.log("TCL: syncVariants bulkVariantUpdate.length", bulkVariantUpdate.length);
        if (!_.isUndefined(context)) {
          console.log('syncVariants event after bulkVariantUpdate', (context.getRemainingTimeInMillis() / 1000));
        }
        // update number of products for store    
        console.log("TCL: All Variant Done")
        // all done.
      }
    }
  },
  getWebhooks: async function (event) {
    const webhooksAPIUrl = `https://${event.shopURL}/admin/api/${process.env.SHOPIFY_API_VERSION}/webhooks.json`;
    const { json, res } = await this.shopifyAPICall(webhooksAPIUrl, null, 'get', event.accessToken);
    if ("error_description" in json || "error" in json || "errors" in json) {
      console.log("TCL: getWebhooks json", json)
      throw new Error(json.error_description || json.error || json.errors);
    }
    if (json.webhooks.length < WEBHOOKS[PARTNERS_SHOPIFY].length) {
      await this.createWebhooks(event);
    }
  },
  createWebhooks: async function (event) {
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

      const { json, res } = await this.shopifyAPICall(webhooksAPIUrl, body, 'post', event.accessToken);
      if ("error_description" in json || "error" in json || "errors" in json) {
        console.log("TCL: createWebhooks json", json)
        console.error(json.error_description || json.error || json.errors);
      }
    }));
  },
  deleteWebhooks: async function (event) {
    const webhooksAPIUrl = `https://${event.shopURL}/admin/api/${process.env.SHOPIFY_API_VERSION}/webhooks.json`;
    const { json, res } = await this.shopifyAPICall(webhooksAPIUrl, null, 'get', event.accessToken);
    if ("error_description" in json || "error" in json || "errors" in json) {
      console.log("TCL: deleteWebhooks json", json)
      throw new Error(json.error_description || json.error || json.errors);
    }
    let deleteWebhookURL = '';
    if (json.webhooks.length > 0) {
      await Promise.all(json.webhooks.map(async item => {
        deleteWebhookURL = `https://${event.shopURL}/admin/api/${process.env.SHOPIFY_API_VERSION}/webhooks/${item.id}.json`;
        const { json, res } = await this.shopifyAPICall(deleteWebhookURL, null, 'delete', event.accessToken);
      }));
    }
  },
  productsCreate: async function (event, context) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['x-shopify-shop-domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ url: shopDomain });
      const apiProducts = [JSON.parse(event.body)];

      const syncEvent = {
        "storeId": storeDetail._id,
        "partnerStore": PARTNERS_SHOPIFY,
        "collectionId": null
      }
      await this.syncProducts(syncEvent, apiProducts, storeDetail, context);
      await this.syncVariants(syncEvent, apiProducts, storeDetail, context);
      await this.syncWebhookProductCollections(apiProducts, storeDetail);
      if (process.env.IS_OFFLINE === 'false') {
        const rules = await shared.RuleModel.find({ store: storeDetail._id, type: RULE_TYPE_NEW })
        await Promise.all(rules.map(async rule => {
          const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}ShareUpdates`;
          console.log("TCL: QueueUrl", QueueUrl)
          const params = {
            MessageBody: JSON.stringify({ ruleId: rule }),
            QueueUrl: QueueUrl
          };
          console.log("TCL: params", params)
          const response = await sqs.sendMessage(params).promise();
          console.log("TCL: response", response)
        }));
      }
      return httpHelper.ok(
        {
          message: "Recieved"
        }
      );
    }
  },
  productsUpdate: async function (event, context) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['x-shopify-shop-domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ url: shopDomain });
      const apiProducts = [JSON.parse(event.body)];
      const syncEvent = {
        "storeId": storeDetail._id,
        "partnerStore": PARTNERS_SHOPIFY,
        "collectionId": null
      }
      await this.syncProducts(syncEvent, apiProducts, storeDetail, context);
      await this.syncVariants(syncEvent, apiProducts, storeDetail, context);
      await this.syncWebhookProductCollections(apiProducts, storeDetail);
      return httpHelper.ok(
        {
          message: "Recieved"
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
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const productDetail = await shared.ProductModel.findOne({ partnerId: JSON.parse(event.body).id });
      if (!_.isNull(productDetail)) {
        const variantDelete = await shared.VariantModel.deleteMany({ product: productDetail._id });
        const imageDelete = await shared.ImageModel.deleteMany({ product: productDetail._id });
        const updateDelete = await shared.UpdateModel.deleteMany({ product: productDetail._id, scheduleState: { $in: [PENDING, APPROVED] }, });
        const productDelete = await shared.ProductModel.deleteOne({ _id: productDetail._id });
      }
      return httpHelper.ok(
        {
          message: "Recieved"
        }
      );
    }
  },
  collectionsCreate: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['x-shopify-shop-domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ url: shopDomain });
      const apiCollections = [JSON.parse(event.body)];
      await this.syncCollections(storeDetail._id, apiCollections);
      return httpHelper.ok(
        {
          message: "Recieved"
        }
      );
    }
  },
  collectionsUpdate: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['x-shopify-shop-domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ url: shopDomain });
      const apiCollections = [JSON.parse(event.body)];
      await this.syncCollections(storeDetail._id, apiCollections);
      return httpHelper.ok(
        {
          message: "Recieved"
        }
      );
    }
  },
  collectionsDelete: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const collectionDetail = await shared.CollectionModel.findOne({ partnerId: JSON.parse(event.body).id })
      const rules = await shared.RuleModel.where('collections').in(collectionDetail._id);
      console.log("TCL: collectionDetail._id", collectionDetail._id)
      if (rules.length > 0) {
        console.log("TCL: rules", rules)
        await Promise.all(rules.map(async rule => {
          console.log("TCL: rule.collections", rule.collections)
          collections = rule.collections.filter(item => item === collectionDetail._id);
          console.log("TCL: collections", collections)
          rule.collections = collections;
          await rule.save();
        }));
      }
      const collectionDelete = await shared.CollectionModel.deleteOne({ partnerId: JSON.parse(event.body).id });
      return httpHelper.ok(
        {
          message: "Recieved"
        }
      );
    }
  },
  appUninstalled: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['x-shopify-shop-domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ url: shopDomain });
      if (!_.isNull(storeDetail)) {
        const collectionDelete = await shared.CollectionModel.deleteMany({ store: storeDetail._id });
        const imageDelete = await shared.ImageModel.deleteMany({ store: storeDetail._id });
        const productDelete = await shared.ProductModel.deleteMany({ store: storeDetail._id });
        const profileDelete = await shared.ProfileModel.deleteMany({ store: storeDetail._id });
        const ruleDelete = await shared.RuleModel.deleteMany({ store: storeDetail._id });
        const updateDelete = await shared.UpdateModel.deleteMany({ store: storeDetail._id });
        const variantDelete = await shared.VariantModel.deleteMany({ store: storeDetail._id });
        storeDetail.isUninstalled = true;
        storeDetail.uninstalledDate = new Date().toISOString();
        storeDetail.isCharged = false;
        await storeDetail.save();
      }
      return httpHelper.ok(
        {
          message: "Recieved"
        }
      );
    }
  },
  shopUpdate: async function (event) {
    if (!_.isNull(event.body) && !_.isUndefined(event.body)) {
      const shopDomain = event.headers['x-shopify-shop-domain'];
      const StoreModel = shared.StoreModel;
      const storeDetail = await StoreModel.findOne({ url: shopDomain });
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
      console.log("TCL: shopUpdate", shopUpdate)
      const update = await StoreModel.updateOne({ _id: storeDetail._id }, shopUpdate);
      return httpHelper.ok(
        {
          message: "Recieved"
        }
      );
    }
  },
  shopifyAPICall: async function (url, body, method, accessToken) {
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
      console.log("TCL: shopifyAPICall error url", url)
      console.error(json.error_description || json.error || json.errors);
      // return {json: json};
    }
    return { json: json, res: res };
  },
  sleep: async function (seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds));
  }
}