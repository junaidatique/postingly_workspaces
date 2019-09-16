const shared = require('shared');
const fetch = require('node-fetch');
const _ = require('lodash');
const moment = require('moment');
const { PARTNERS_SHOPIFY, FACEBOOK_DEFAULT_TEXT, LINK_SHORTNER_SERVICES_POOOST, LINK_SHORTNER_SERVICES_NONE } = require('shared/constants');

const stringHelper = require('shared').stringHelper;
const httpHelper = require('shared').httpHelper
const cognitoHelper = require('shared').cognitoHelper
const jwt = require('shared').jwtHelper;
const StoreModel = require('shared').StoreModel

const querystring = require('querystring')
const jsonwebtoken = require('jsonwebtoken');

let lambda;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
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
        return httpHelper.badRequest("autherization code is already used.");
      }

      const accessToken = response.access_token;
      if (accessToken === undefined) {
        console.log("verifyCallback response[\"access_token\"] is undefined");
        throw new Error("response[\"access_token\"] is undefined");
      }
      const shop = await this.getShop(shopDomain, accessToken);
      let cognitoUser;
      if (!_.isUndefined(username) && !_.isNull(username)) {
        cognitoUser = await cognitoHelper.createUser(username, email, shopDomain);
      } else {
        cognitoUser = await cognitoHelper.createUser(shop.email, shop.email, shopDomain);
      }
      console.log("TCL: cognitoUser", cognitoUser)
      storeKey = `shopify-${shop.id}`;
      console.log("TCL: storeKey", storeKey)
      let store = await StoreModel.findOne({ uniqKey: storeKey });
      console.log("TCL: store", store)
      let isCharged = false;
      if (store === null) {
        console.log("verifyCallback new signup");
        const shopParams = {
          uniqKey: storeKey,
          userId: cognitoUser,
          partner: 'shopify',
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
        const storePayload = {
          "storeId": store._id,
          "partnerStore": "shopify",
          "collectionId": null
        }
        console.log("TCL: process.env.IS_OFFLINE", process.env.IS_OFFLINE)

      } else {
        isCharged = store.isCharged;
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

    const res = await fetch(url, {
      body,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      method: "POST",
    });

    const json = await res.json();
    console.log("createCharge json", json);
    if ("error_description" in json || "error" in json || "errors" in json) {
      throw new Error(json.error_description || json.error || json.errors);
    }
    return json.recurring_application_charge.confirmation_url;
  },

  exchangeToken: async function (shop, code) {
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
    const res = await fetch(url, {
      body,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const json = await res.json();
    console.log("exchangeToken json", json);
    if ("error_description" in json || "error" in json || "errors" in json) {
      throw new Error(json.error_description || json.error || json.errors);
    }
    return json;
  },

  getShop: async function (shopDomain, accessToken) {
    console.log("getShop shop", shopDomain);
    const resp = await fetch(`https://${shopDomain}/admin/shop.json`, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      method: "GET",
    });
    const json = await resp.json();
    console.log("getShop json", json.shop);
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
    storeKey = `${storePartnerId}`;
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
      if (process.env.IS_OFFLINE === 'false') {
        const syncStoreDataParams = {
          FunctionName: `postingly-functions-${process.env.STAGE}-sync-store-data`,
          InvocationType: 'Event',
          LogType: 'Tail',
          Payload: JSON.stringify(storePayload)
        };
        console.log("TCL: lambda.invoke syncStoreDataParams", syncStoreDataParams)

        const syncStoreDataLambdaResponse = await lambda.invoke(syncStoreDataParams).promise();
        console.log("TCL: syncStoreDataLambdaResponse", syncStoreDataLambdaResponse)
      }
    } catch (err) {
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
    const resp = await fetch(`https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION}/recurring_application_charges/${charge_id}.json`, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      method: "GET",
    });
    const json = await resp.json();
    console.log("getCharge json response", json);
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

    const res = await fetch(url, {
      body,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      method: "POST",
    });

    const json = await res.json();
    console.log("activateCharge json", json);
    if ("error_description" in json || "error" in json || "errors" in json) {
      throw new Error(json.error_description || json.error || json.errors);
    }
    return json.recurring_application_charge;
  },

  syncStoreData: async function (event) {
    console.log('syncStoreData event', event);
    const ProductModel = shared.ProductModel;
    // Collections are reset so that new collections can be assigned to products. 
    const dbCollectionsUpdate = await ProductModel.updateMany({ store: event.storeId }, { collections: [] });
    if (process.env.IS_OFFLINE === 'false') {
      // syncing the custome colltions 
      const syncCustomCollectionPageParams = {
        FunctionName: `postingly-functions-${process.env.STAGE}-sync-collection-page`,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: 'custom_collections', pageInfo: null })
      };
      console.log("TCL: lambda.invoke params", syncCustomCollectionPageParams)
      const syncCustomCollectionPageLambdaResponse = await lambda.invoke(syncCustomCollectionPageParams).promise();
      console.log("TCL: syncCustomCollectionPageLambdaResponse", syncCustomCollectionPageLambdaResponse);
      // syncing the smart collections
      const syncSmartCollectionPageParams = {
        FunctionName: `postingly-functions-${process.env.STAGE}-sync-collection-page`,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: 'smart_collections', pageInfo: null })
      };
      console.log("TCL: lambda.invoke params", syncSmartCollectionPageParams)

      const syncSmartCollectionPageLambdaResponse = await lambda.invoke(syncSmartCollectionPageParams).promise();
      console.log("TCL: syncSmartCollectionPageLambdaResponse", syncSmartCollectionPageLambdaResponse)
      // syncing products
      const syncProductPageParams = {
        FunctionName: `postingly-functions-${process.env.STAGE}-sync-product-page`,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null })
      };
      console.log("TCL: lambda.invoke params", syncProductPageParams)

      const syncProductPageLambdaResponse = await lambda.invoke(syncProductPageParams).promise();
      console.log("TCL: syncProductPageLambdaResponse", syncProductPageLambdaResponse)

    } else {
      // await this.syncCollectionPage({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: 'custom_collections', pageInfo: null });
      // await this.syncCollectionPage({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: 'smart_collections', pageInfo: null });
      // await this.syncProductPage({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null });

    }
  },

  syncCollectionPage: async function (event) {
    console.log('syncCollectionPage event', event);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    let url;

    if (_.isNull(event.pageInfo)) {
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/${event.collectionType}.json?limit=250`;
    } else {
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/${event.collectionType}.json?limit=250&page_info=${event.pageInfo}`;
    }
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });

    const json = await res.json();
    // console.log("TCL: json", json)
    let collectionUniqKeys = [];
    const bulkCollectionInsert = json[event.collectionType].map(collection => {
      collectionUniqKeys.push(`${PARTNERS_SHOPIFY}-${collection.id}`);
      return {
        updateOne: {
          filter: { uniqKey: `${PARTNERS_SHOPIFY}-${collection.id}` },
          update: {
            title: collection.title,
            partnerId: collection.id,
            partnerName: collection.title,
            partneCreatedAt: collection.published_at,
            partnerUpdatedAt: collection.updated_at,
            partner: PARTNERS_SHOPIFY,
            uniqKey: `${PARTNERS_SHOPIFY}-${collection.id}`,
            description: stringHelper.stripTags(collection.body_html),
            active: (collection.published_at.blank) ? true : false,
            store: event.storeId,
          },
          upsert: true
        }
      }
    });
    console.log("TCL: res.headers", res.headers.get('x-shopify-shop-api-call-limit'))
    const retryAfter = res.headers.get('Retry-After');
    if (!_.isNull(retryAfter)) {
      console.log("TCL: retryAfter the given shop. ", retryAfter)
    }

    const r = await CollectionModel.bulkWrite(bulkCollectionInsert);
    if (!_.isNull(res.headers.get('link')) && !_.isUndefined(res.headers.get('link'))) {
      const pageInfo = stringHelper.getShopifyPageInfo(res.headers.get('link'));
      if (!_.isNull(pageInfo)) {
        if (process.env.IS_OFFLINE === 'false') {
          const syncCustomCollectionPageParams = {
            FunctionName: `postingly-functions-${process.env.STAGE}-sync-collection-page`,
            InvocationType: 'Event',
            LogType: 'Tail',
            Payload: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: event.collectionType, pageInfo: pageInfo })
          };
          console.log("TCL: lambda.invoke syncCustomCollectionPageParams", syncCustomCollectionPageParams)

          const syncCustomCollectionPageLambdaResponse = await lambda.invoke(syncCustomCollectionPageParams).promise();
          console.log("TCL: syncCustomCollectionPageLambdaResponse", syncCustomCollectionPageLambdaResponse)
        } else {
          // await this.syncCollectionPage({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: event.collectionType, pageInfo: pageInfo });
        }
      }
    }
    const dbCollections = await CollectionModel.where('uniqKey').in(collectionUniqKeys.map(collection => collection)).select('_id');
    await Promise.all(dbCollections.map(async collection => {
      if (process.env.IS_OFFLINE === 'false') {
        // syncing products
        const syncProductPageParams = {
          FunctionName: `postingly-functions-${process.env.STAGE}-sync-product-page`,
          InvocationType: 'Event',
          LogType: 'Tail',
          Payload: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: collection._id, pageInfo: null })
        };
        console.log("TCL: lambda.invoke syncProductPageParams", syncProductPageParams);
        const syncProductPageLambdaResponse = await lambda.invoke(syncProductPageParams).promise();
        console.log("TCL: syncProductPageLambdaResponse", syncProductPageLambdaResponse);
      } else {
        // await this.syncProductPage({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: collection._id, pageInfo: null })
      }
    }));

  },

  syncProductPage: async function (event) {
    console.log('syncProductPage event', event);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const ProductModel = shared.ProductModel;
    const ImageModel = shared.ImageModel;
    const VariantModel = shared.VariantModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    let url;
    if (!_.isNull(event.collectionId)) {
      const collectionDetail = await CollectionModel.findById(event.collectionId);
      if (_.isNull(event.pageInfo)) {
        url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?collection_id=${collectionDetail.partnerId}&limit=250`;
      } else {
        url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?collection_id=${collectionDetail.partnerId}&limit=250&page_infor=${event.pageInfo}`;
      }

    } else {
      if (_.isNull(event.pageInfo)) {
        url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?limit=250`;
      } else {
        url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?limit=250&page_info=${event.pageInfo}`;
      }
    }
    // console.log("TCL: url", url)
    let res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    let json = await res.json();
    // console.log("TCL: res", res)
    const apiProducts = json.products;
    // console.log("TCL: apiProducts", apiProducts)
    let productImages = [], productVariants = [], variantImages = [];
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
            store: event.storeId,
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
    if (!_.isEmpty(bulkProductInsert)) {
      const products = await ProductModel.bulkWrite(bulkProductInsert);
    }
    const dbProducts = await ProductModel.where('uniqKey').in(apiProducts.map(product => `${PARTNERS_SHOPIFY}-${product.id}`)).select('_id uniqKey postableByImage collections partnerSpecificUrl description');
    if (!_.isNull(event.collectionId)) {
      const bulkCollectionUpdate = dbProducts.map(product => {
        let collections = product.collections;
        collections.push(event.collectionId);
        return {
          updateOne: {
            filter: { _id: product._id },
            update: {
              collections: collections
            }
          }
        }
      });
      if (!_.isEmpty(bulkCollectionUpdate)) {
        const collections = await ProductModel.bulkWrite(bulkCollectionUpdate);
      }
    } else {

      // set active to false so that deleted images and variants are eliminated. 
      const dbImagesUpdate = await ImageModel.updateMany({ product: { $in: dbProducts.map(product => product._id) } }, { active: false });
      const dbVariantsUpdate = await VariantModel.updateMany({ product: { $in: dbProducts.map(product => product._id) } }, { active: false });

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

      // sync variants for the product
      let bulkVariantInsert = [];
      apiProducts.forEach(product => {
        const productForVariant = dbProducts.find(dbProduct => dbProduct.uniqKey === `${PARTNERS_SHOPIFY}-${product.id}`);

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
      if (!_.isEmpty(bulkVariantInsert)) {
        const variants = await VariantModel.bulkWrite(bulkVariantInsert);
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
      // creating productVariants to add variants that are recently synced for the product.
      const dbVariants = await VariantModel.where('product').in(dbProducts.map(product => product._id)).select('_id product uniqKey');
      dbVariants.forEach(image => {
        if (_.isEmpty(productVariants[image.product])) {
          productVariants[image.product] = [];
        }
        productVariants[image.product].push(image._id)
      })
      // query to update variants and images for the products. 
      bulkProductUpdate = dbProducts.map(product => {
        return {
          updateOne: {
            filter: { _id: product._id },
            update: {
              images: productImages[product._id],
              variants: productVariants[product._id],
            }
          }
        }
      })
      const r = await ProductModel.bulkWrite(bulkProductUpdate);

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
      const dbVariantImages = await ImageModel.where('variant').in(dbVariants.map(variant => variant._id));

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
      if (!_.isNull(res.headers.get('link')) && !_.isUndefined(res.headers.get('link'))) {
        const pageInfo = stringHelper.getShopifyPageInfo(res.headers.get('link'));
        if (!_.isNull(pageInfo)) {
          if (process.env.IS_OFFLINE === 'false') {
            const syncProductPageParams = {
              FunctionName: `postingly-functions-${process.env.STAGE}-sync-product-page`,
              InvocationType: 'Event',
              LogType: 'Tail',
              Payload: JSON.stringify({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: event.collectionId, pageInfo: pageInfo })
            };
            console.log("TCL: lambda.invoke syncProductPageParams", syncProductPageParams)

            const syncProductPageParamsLambdaResponse = await lambda.invoke(syncProductPageParams).promise();
            console.log("TCL: syncProductPageParamsLambdaResponse", syncProductPageParamsLambdaResponse)
          } else {
            // await this.syncProductPage({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: event.collectionId, pageInfo: pageInfo });
          }
        }
      }
      // all done.
    }
  },
}