const PartnerShopify = require('shared').PartnerShopify;
module.exports = {
  getPartner: function (req) {
    partner = req.pathParameters.partner_slug;
    switch (partner) {
      case 'shopify':
        return PartnerShopify;
      default:
        break;
    }
  },
  getAuthURL: function (req, now) {
    partner_object = this.getPartner(req);
    return partner_object.getAuthURL(req, now);
  },
  verifyCallback: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.verifyCallback(req, now);
    return response;
  },
  getChargeURL: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.getChargeURL(req, now);
    return response
  },
  activatePayment: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.activatePayment(req, now);
    return response
  },
  productsCreate: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.productsCreate(req, now);
    return response
  },
  productsUpdate: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.productsUpdate(req, now);
    return response
  },
  productsDelete: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.productsDelete(req, now);
    return response
  },
  collectionsCreate: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.collectionsCreate(req, now);
    return response
  },
  collectionsUpdate: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.collectionsUpdate(req, now);
    return response
  },
  collectionsDelete: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.collectionsDelete(req, now);
    return response
  },
  appUninstalled: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.appUninstalled(req, now);
    return response
  },
  shopUpdate: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.shopUpdate(req, now);
    return response
  },

}