module.exports = {
  getRandomString: function (len) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWYZYabcdefghijklmnopqrstuvwxyz0123456789";

    let random = "";
    for (let i = 0; i < len; i++) {
      random = random + alphabet[Math.round(Math.random() * alphabet.length)];
    }

    return random;
  }
}