const shared = require('shared');
const fetch = require('node-fetch');
const _ = require('lodash');
const moment = require('moment');
const { PARTNERS_SHOPIFY, FACEBOOK_DEFAULT_TEXT } = require('shared/constants');

const str = require('shared').stringHelper;
const httpHelper = require('shared').httpHelper
const cognitoHelper = require('shared').cognitoHelper
const jwt = require('shared').jwtHelper;
const StoreModel = require('shared').StoreModel

const querystring = require('querystring')
const jsonwebtoken = require('jsonwebtoken');


module.exports = {
  getAuthURL: function (event, now, res) {
    console.log("-----------------------------getAuthURL Start-----------------------------");
    try {
      const shopifyApiKey = process.env.SHOPIFY_API_KEY;
      const shopifyScope = process.env.SHOPIFY_SCOPE;

      if (!shopifyApiKey) {
        return httpHelper.badRequest("SHOPIFY_API_KEY environment variable not set", res);
      }

      if (!shopifyScope) {
        return httpHelper.badRequest("SHOPIFY_SCOPE environment variable not set", res);
      }

      if (!event.query) {
        return httpHelper.badRequest("No query string paramters found", res);
      }

      const { "callback-url": callbackUrl, "per-user": perUser, shop } = event.query;

      if (!callbackUrl) {
        return httpHelper.badRequest("'callback-url' parameter missing", res);
      }

      if (!shop) {
        return httpHelper.badRequest("'shop' parameter missing", res);
      }

      if (!shop.match(/[a-z0-9][a-z0-9\-]*\.myshopify\.com/i)) {
        return httpHelper.badRequest("'shop' parameter must end with .myshopify.com and may only contain a-z, 0-9, - and .", res);
      }

      // Build our authUrl
      const eNonce = querystring.escape(str.getRandomString(32));
      const eClientId = querystring.escape(shopifyApiKey);
      const eScope = querystring.escape(shopifyScope.replace(":", ","));
      const eCallbackUrl = querystring.escape(callbackUrl);
      const option = perUser === "true" ? "&option=per-user" : "";
      // tslint:disable-next-line:max-line-length
      const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${eClientId}&scope=${eScope}&redirect_uri=${eCallbackUrl}&state=${eNonce}${option}`;
      // const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${eClientId}&scope=${eScope}&state=${eNonce}${option}`;

      console.log("-----------------------------getAuthURL Completed-----------------------------")
      // Return the authURL
      return httpHelper.ok(
        {
          authUrl,
          token: jwt.createJWT(shop, eNonce, now, 600)
        },
        res
      );

    } catch (e) {
      console.log("-----------------------------getAuthURL Error-----------------------------", e);
      return httpHelper.internalError(res);
    }
  },

  verifyCallback: async function (event, now, res) {
    console.log("-----------------------------verifyCallback Start-----------------------------");
    if (!event.body) {
      return httpHelper.badRequest("body is empty", res);
    }
    const json = JSON.parse(event.body);
    const { token, params, username, email } = json;
    if (!token) {
      return httpHelper.badRequest("'token' is missing", res);
    }
    if (!params) {
      return httpHelper.badRequest("'params' is missing", res);
    }
    console.log("verifyCallback params", params);
    console.log("verifyCallback username", username);
    console.log("verifyCallback email", email);
    const { code, shop: shopDomain } = params;
    if (!this.validateNonce(token, params)
      || !this.validateShopDomain(shopDomain)
    ) {
      return httpHelper.badRequest("Invalid 'token'", res);
    }
    let response;
    try {
      response = await this.exchangeToken(shopDomain, code);
    } catch (err) {
      return httpHelper.badRequest("autherization code is already used.", res);
    }

    const accessToken = response.access_token;
    if (accessToken === undefined) {
      console.log("verifyCallback response[\"access_token\"] is undefined");
      throw new Error("response[\"access_token\"] is undefined");
    }
    const shop = await this.getShop(shopDomain, accessToken);
    let cognitoUser;
    if (!_.isUndefined(username) || !_.isNull(username)) {
      cognitoUser = await cognitoHelper.createUser(username, email, shopDomain);
    } else {
      cognitoUser = await cognitoHelper.createUser(shop.email, shop.email, shopDomain);
    }
    console.log("TCL: cognitoUser", cognitoUser)
    storeKey = `shopify-${shop.id}`;

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
        // chargedMethod: '',
        // chargeId: '',
        isUninstalled: false,
      };
      // store = await StoreModel.create(shopParams);
      // store = await query.putItem(process.env.STORES_TABLE, shopParams);
      const storeInstance = new StoreModel(shopParams);
      store = await storeInstance.save();
    } else {
      isCharged = store.isCharged;
    }
    let chargeAuthorizationUrl = null
    if (!isCharged) {
      chargeAuthorizationUrl = await this.createCharge(shop.myshopify_domain, accessToken);
    }
    console.log("chargeAuthorizationUrl:", chargeAuthorizationUrl)
    nonce = str.getRandomString(32);
    console.log("-----------------------------verifyCallback Completed-----------------------------");
    return httpHelper.ok({
      chargeURL: chargeAuthorizationUrl,
      userName: cognitoUser,
      storePartnerId: storeKey,
      token: jwt.createJWT(cognitoUser, nonce, now, 600),
    }, res);
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
    console.log("getShop json", json);
    return json.shop;
  },

  activatePayment: async function (event, now, res) {
    console.log("-----------------------------activatePayment Start-----------------------------");
    if (!event.body) {
      return httpHelper.badRequest("body is empty", res);
    }
    const json = JSON.parse(event.body);
    const { token, params } = json;
    if (!token) {
      return httpHelper.badRequest("'token' is missing", res);
    }
    if (!params) {
      return httpHelper.badRequest("'params' is missing", res);
    }
    console.log("activatePayment params", params);
    const { charge_id, shop, storePartnerId } = params;
    if (!this.validateShopDomain(shop)) {
      return httpHelper.badRequest("Invalid 'shop'", res);
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
      return httpHelper.badRequest("charge not found.", res);
    }

    try {
      const activateResponse = await this.activateCharge(shop, chargeResponse, accessToken);
    } catch (err) {
      console.log("activate charge erro", err);
      return httpHelper.badRequest("charge not activated.", res);
    }
    store.isCharged = true;
    store.chargedMethod = 'shopify';
    store.chargeId = charge_id;
    store.chargeDate = (new Date()).toISOString();;
    try {
      await store.save();
    } catch (err) {
      console.log("activatePayment: Store can't be saved");
    }
    console.log("-----------------------------activatePayment Completed-----------------------------");

    return httpHelper.ok({
      message: "Done",
    }, res);

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
    if (process.env.IS_OFFLINE) {
      const dbCollectionsUpdate = await ProductModel.updateMany({ store: event.storeId }, { collections: [] });
      await this.syncCollections({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY });
      await this.syncProducts({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: null });
    }
  },
  syncCollections: async function (event) {
    console.log('syncCollections event', event);
    const StoreModel = shared.StoreModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    let url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/custom_collections/count.json`;
    console.log('syncCollections url', url);
    let res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    let json = await res.json();
    const customCollectionsCount = json.count;
    const totalCustomCollections = Math.ceil(customCollectionsCount / 250);
    for (let page = 1; page <= totalCustomCollections; page++) {
      if (process.env.IS_OFFLINE) {
        await this.syncCollectionPage({ storeId: event.storeId, partnerStore: storeDetail.partner, page: page, collectionType: 'custom_collections' })
      }
    }
    url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/smart_collections/count.json`;
    res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    json = await res.json();
    const smartCollectionsCount = json.count;
    const totalSmartCollections = Math.ceil(smartCollectionsCount / 250);
    for (let page = 1; page <= totalSmartCollections; page++) {
      if (process.env.IS_OFFLINE) {
        await this.syncCollectionPage({ storeId: event.storeId, partnerStore: storeDetail.partner, page: page, collectionType: 'smart_collections' })
      }
    }
  },
  syncCollectionPage: async function (event) {
    console.log('syncCollectionPage event', event);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    const url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/${event.collectionType}.json?limit=250&page=${event.page}`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    const json = await res.json();
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
            description: str.stripTags(collection.body_html),
            active: (collection.published_at.blank) ? true : false,
            store: event.storeId,
          },
          upsert: true
        }
      }
    });
    const r = await CollectionModel.bulkWrite(bulkCollectionInsert);
    const dbCollections = await CollectionModel.where('uniqKey').in(collectionUniqKeys.map(collection => collection)).select('_id');
    await Promise.all(dbCollections.map(async collection => {
      if (process.env.IS_OFFLINE) {
        await this.syncProducts({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: collection._id })
      }
    }));

  },
  syncProducts: async function (event) {
    console.log('syncProducts event', event);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    let url;
    if (!_.isNull(event.collectionId)) {
      const collectionDetail = await CollectionModel.findById(event.collectionId);
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products/count.json?collection_id=${collectionDetail.partnerId}`;
    } else {
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products/count.json`;
    }
    let res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    let json = await res.json();
    const productCount = json.count;
    const totalProducts = Math.ceil(productCount / 250);
    for (let page = 1; page <= totalProducts; page++) {
      if (process.env.IS_OFFLINE) {
        await this.syncProductPage({ storeId: event.storeId, partnerStore: storeDetail.partner, page: page, collectionId: event.collectionId })
      }
    }
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
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?collection_id=${collectionDetail.partnerId}&limit=250&page=${event.page}`;
    } else {
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?limit=250&page=${event.page}`;
    }

    let res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    let json = await res.json();
    const apiProducts = json.products;
    let productImages = [], productVariants = [], variantImages = [];
    // sync products
    const bulkProductInsert = apiProducts.map(product => {
      const quantity = product.variants.map(variant => variant.inventory_quantity).reduce((prev, curr) => prev + curr, 0);
      const minimumPrice = product.variants.map(variant => (variant.price)).reduce((p, v) => ((p < v && p > 0) ? p : v));
      const maximumPrice = product.variants.map(variant => (variant.price)).reduce((p, v) => ((p > v) ? p : v));
      const onSale = product.variants.map(variant => (variant.compare_at_price != variant.price) ? true : false).includes(true);
      const url = `https://${storeDetail.url}/${product.handle}`;
      return {
        updateOne: {
          filter: { uniqKey: `${PARTNERS_SHOPIFY}-${product.id}` },
          update: {
            title: product.title,
            description: str.stripTags(product.body_html),
            suggestedCaption: str.formatCaptionText(FACEBOOK_DEFAULT_TEXT, product.title, url, minimumPrice, str.stripTags(product.body_html)),
            partnerSpecificUrl: url,
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
            postableIsNew: (moment(product.created_at).isAfter(moment().subtract(7, 'days'))) ? true : false,
            postableBySale: onSale
          },
          upsert: true
        }
      }
    });
    const products = await ProductModel.bulkWrite(bulkProductInsert);
    const dbProducts = await ProductModel.where('uniqKey').in(apiProducts.map(product => `${PARTNERS_SHOPIFY}-${product.id}`)).select('_id uniqKey postableByImage collections');
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
      })
      const collections = await ProductModel.bulkWrite(bulkCollectionUpdate);
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
      const images = await ImageModel.bulkWrite([].concat.apply([], bulkImageInsert));

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
      const variants = await VariantModel.bulkWrite(bulkVariantInsert);


      // now all the images and variants are synced. now we need to create relationship with products
      // first images that are recently synced.
      const dbImages = await ImageModel.where('product').in(dbProducts.map(product => product._id));
      dbImages.forEach(image => {
        if (_.isEmpty(productImages[image.product])) {
          productImages[image.product] = [];
        }
        productImages[image.product].push(image._id)
      })
      // variants that are recently synced.
      const dbVariants = await VariantModel.where('product').in(dbProducts.map(product => product._id)).select('_id product uniqKey');
      dbVariants.forEach(image => {
        if (_.isEmpty(productVariants[image.product])) {
          productVariants[image.product] = [];
        }
        productVariants[image.product].push(image._id)
      })
      // query to update variants. 
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

      const t = await ImageModel.bulkWrite(bulkVariantImages);
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
      const s = await VariantModel.bulkWrite(bulkVariantUpdate);
      // all done.
    }
  },
}