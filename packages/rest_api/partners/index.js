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
  activatePayment: async function (req, now) {
    partner_object = this.getPartner(req);
    const response = await partner_object.activatePayment(req, now);
    return response
  },
}