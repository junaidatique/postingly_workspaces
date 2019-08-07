const shopify = require('shared').PartnerShopify;
module.exports = {
  getPartner: function (req) {
    partner = req.params.partner_slug;
    switch (partner) {
      case 'shopify':
        return shopify;
      default:
        break;
    }
  },
  getAuthURL: function (req, now, res) {
    partner_object = this.getPartner(req);
    partner_object.getAuthURL(req, now, res);
  },
  verifyCallback: function (req, now, res) {
    partner_object = this.getPartner(req);
    partner_object.verifyCallback(req, now, res);
  },
  activatePayment: function (req, now, res) {
    partner_object = this.getPartner(req);
    partner_object.activatePayment(req, now, res);
  },
}