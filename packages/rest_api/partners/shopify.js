const http_helper = require('shared').http_helper
const cognito_helper = require('shared').cognito_helper
const str = require('shared').string_helper
const jwt = require('shared').jwt_helper
const StoreModel = require('shared').StoreModel

const querystring = require('querystring')
// const query = require('../helpers/model')

const jsonwebtoken = require('jsonwebtoken');
const fetch = require("node-fetch");



module.exports = {
  getAuthURL: function (event, now, res) {
    console.log("-----------------------------getAuthURL Start-----------------------------");
    try {
      const shopifyApiKey = process.env.SHOPIFY_API_KEY;
      const shopifyScope = process.env.SHOPIFY_SCOPE;

      if (!shopifyApiKey) {
        return http_helper.badRequest("SHOPIFY_API_KEY environment variable not set", res);
      }

      if (!shopifyScope) {
        return http_helper.badRequest("SHOPIFY_SCOPE environment variable not set", res);
      }

      if (!event.query) {
        return http_helper.badRequest("No query string paramters found", res);
      }

      const { "callback-url": callbackUrl, "per-user": perUser, shop } = event.query;

      if (!callbackUrl) {
        return http_helper.badRequest("'callback-url' parameter missing", res);
      }

      if (!shop) {
        return http_helper.badRequest("'shop' parameter missing", res);
      }

      if (!shop.match(/[a-z0-9][a-z0-9\-]*\.myshopify\.com/i)) {
        return http_helper.badRequest("'shop' parameter must end with .myshopify.com and may only contain a-z, 0-9, - and .", res);
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
      return http_helper.ok(
        {
          authUrl,
          token: jwt.createJWT(shop, eNonce, now, 600)
        },
        res
      );

    } catch (e) {
      console.log("-----------------------------getAuthURL Error-----------------------------", e);
      return http_helper.internalError(res);
    }
  },

  verifyCallback: async function (event, now, res) {
    console.log("-----------------------------verifyCallback Start-----------------------------");
    if (!event.body) {
      return http_helper.badRequest("body is empty", res);
    }
    const json = JSON.parse(event.body);
    const { token, params } = json;
    if (!token) {
      return http_helper.badRequest("'token' is missing", res);
    }
    if (!params) {
      return http_helper.badRequest("'params' is missing", res);
    }
    console.log("verifyCallback params", params);
    const { code, shop: shopDomain } = params;
    if (!this.validateNonce(token, params)
      || !this.validateShopDomain(shopDomain)
    ) {
      return http_helper.badRequest("Invalid 'token'", res);
    }
    let response;
    try {
      response = await this.exchangeToken(shopDomain, code);
    } catch (err) {
      return http_helper.badRequest("autherization code is already used.", res);
    }

    const accessToken = response.access_token;
    if (accessToken === undefined) {
      console.log("verifyCallback response[\"access_token\"] is undefined");
      throw new Error("response[\"access_token\"] is undefined");
    }
    const shop = await this.getShop(shopDomain, accessToken);
    const userName = await cognito_helper.createUser(shop.email, shopDomain);

    storeKey = `shopify-${shop.id}`;

    let store = await StoreModel.get({ id: storeKey });

    // let store = await query.getItem(process.env.STORES_TABLE, { id: storeKey });
    let isCharged = false;
    if (store === undefined) {
      console.log("verifyCallback new signup");
      const shopParams = {
        id: storeKey,
        userId: userName,
        partner: 'shopify',
        partnerId: shop.id,
        partnerPlan: shop.plan_name,
        title: shop.name,
        storeUrl: shop.domain,
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
      store = await StoreModel.create(shopParams);
      // store = await query.putItem(process.env.STORES_TABLE, shopParams);
    } else {
      isCharged = store.isCharged;
    }
    let chargeAuthorizationUrl = null
    if (!isCharged) {
      chargeAuthorizationUrl = await this.createCharge(shop.id, accessToken);
    }
    console.log("chargeAuthorizationUrl:", chargeAuthorizationUrl)
    nonce = str.getRandomString(32);
    console.log("-----------------------------verifyCallback Completed-----------------------------");
    return http_helper.ok({
      chargeURL: chargeAuthorizationUrl,
      userName: userName,
      token: jwt.createJWT(userName, nonce, now, 600),
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
      return http_helper.badRequest("body is empty", res);
    }
    const json = JSON.parse(event.body);
    const { token, params } = json;
    if (!token) {
      return http_helper.badRequest("'token' is missing", res);
    }
    if (!params) {
      return http_helper.badRequest("'params' is missing", res);
    }
    console.log("activatePayment params", params);
    const { charge_id, shop } = params;
    if (!this.validateShopDomain(shop)) {
      return http_helper.badRequest("Invalid 'shop'", res);
    }
    storeKey = `shopify-${shop}`;
    console.log("activatePayment storeKey", storeKey);
    let store = await StoreModel.get({ id: storeKey });
    // let store = await query.getItem(process.env.STORES_TABLE, { storeKey: storeKey });
    console.log("activatePayment store", store);
    const accessToken = store.partnerToken;
    console.log("activatePayment accessToken", accessToken);
    let chargeResponse;
    try {
      chargeResponse = await this.getCharge(shop, charge_id, accessToken)
    } catch (err) {
      console.log("get charge error", err);
      return http_helper.badRequest("charge not found.", res);
    }

    try {
      const activateResponse = await this.activateCharge(shop, chargeResponse, accessToken);
    } catch (err) {
      console.log("activate charge erro", err);
      return http_helper.badRequest("charge not activated.", res);
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

    return http_helper.ok({
      message: "Done",
    }, res);

  },
  getCharge: async function (shop, charge_id, accessToken) {
    console.log("getCharge shop", shop);
    console.log("getCharge charge_id", charge_id);
    const resp = await fetch(`https://${shop}/admin/api/2019-04/recurring_application_charges/${charge_id}.json`, {
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
  }

}