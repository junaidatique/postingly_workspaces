const striptags = require('striptags');
const _ = require('lodash');
module.exports = {
  getRandomString: function (len) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWYZYabcdefghijklmnopqrstuvwxyz0123456789";

    let random = "";
    for (let i = 0; i < len; i++) {
      random = random + alphabet[Math.round(Math.random() * alphabet.length)];
    }
    return random;
  },
  stripTags: function (text) {
    if (_.isNull(text)) {
      return text;
    }
    let formatedText = text.replace(/<script(.*?)>(.*?)<\/script>/is, '');
    formatedText = formatedText.replace(/<br>/ig, '\n');
    formatedText = formatedText.replace(/<br \/>/ig, '\n');
    formatedText = formatedText.replace(/<p>/ig, '');
    formatedText = formatedText.replace(/<\/p>/ig, '\n');
    formatedText = formatedText.replace(/<li>\n/ig, '<li>');
    formatedText = formatedText.replace(/<li>/ig, '\n➤ ');
    formatedText = formatedText.replace(/<\/li>/ig, '');
    formatedText = formatedText.replace(/&amp;/ig, ' ');
    formatedText = striptags(formatedText);
    formatedText = formatedText.replace('#cb-yzsehx-detail-wrap *{max-width: 100% !important;box-sizing: border-box;}', '');
    return formatedText;
  },
  formatCaptionText: function (captionText, title, url, price, description, currency) {
    let formattedCaption = captionText;
    if (!formattedCaption) {
      return '';
    }
    formattedCaption = formattedCaption.split('[product-title]').join(title);
    formattedCaption = formattedCaption.split('[product-price]').join(price);
    formattedCaption = formattedCaption.split('[product-url]').join(url);
    formattedCaption = formattedCaption.split('[product-description]').join(description);
    formattedCaption = formattedCaption.split('[short-description]').join('');
    formattedCaption = formattedCaption.split('[product-currency]').join(currency);
    return formattedCaption;
  },
  getShopifyPageInfo: function (link) {
    if (link.includes('rel="next"')) {
      let linkHeader = link;
      if (linkHeader.includes('rel="previous"')) {
        linkHeader = linkHeader.split('https')[2];
      }
      linkHeader = linkHeader.replace('>;', '');
      linkHeader = linkHeader.replace('rel="next"', '');
      return linkHeader.split('page_info=')[1].split('&')[0];
    } else {
      return null;
    }
  }

}