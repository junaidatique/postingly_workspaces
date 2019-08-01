const _ = require('lodash');
const fetch = require("node-fetch");
const { LINK_SHORTNER_SERVICES_NONE, LINK_SHORTNER_SERVICES_POOOST } = require('shared/constants');

const shortLink = {
  getItemShortLink: async function (defaultLinkSettings, partnerSpecificUrl, ProductDetailUrls) {
    let url = null;
    if (_.isEmpty(defaultLinkSettings) || defaultLinkSettings.service == LINK_SHORTNER_SERVICES_NONE) {
      url = partnerSpecificUrl;
    } else {
      url = ProductDetailUrls.map(link => {
        if (defaultLinkSettings.service == link.service) {
          return link.url;
        }
      })

      if (_.isEmpty(url)) {
        if (defaultLinkSettings.service === LINK_SHORTNER_SERVICES_POOOST) {
          url = await shortLink.pooostURL(productDetail.partnerSpecificUrl);
        }
      }
    }
    if (_.isNull(url)) {
      return partnerSpecificUrl;
    }
    return url;
  },
  pooostURL: async function (longURL) {
    const url = `${process.env.POOST_URL_SHORTNER_LINK}/api/v2/action/shorten?key=`
      + `${process.env.POOOST_URL_SHORTNER_API_KEY} &url=${longURL}&custom_ending=&is_secret=false&response_type=json`;
    console.log('purl', url);
    const resp = await fetch(url);
    const json = await resp.json();
    console.log('json', json);
    return json.result;
  }
}

module.exports = shortLink;