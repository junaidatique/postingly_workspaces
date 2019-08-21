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
  formatCaptionText: function (captionText, title, url, price, description) {
    let formattedCaption = captionText;
    formattedCaption = formattedCaption.replace('[product-title]', title);
    formattedCaption = formattedCaption.replace('[product-price]', price);
    formattedCaption = formattedCaption.replace('[product-url]', url);
    formattedCaption = formattedCaption.replace('[product-description]', description);
    return formattedCaption;
  }

}