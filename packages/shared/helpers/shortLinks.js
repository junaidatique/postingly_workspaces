const _ = require('lodash');
const fetch = require("node-fetch");

module.exports = {
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