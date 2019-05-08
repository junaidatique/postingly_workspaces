const jwt = require('jsonwebtoken')
module.exports = {
  createJWT: function (sub, jti, now, expireIn) {
    const iat = Math.floor(now.getTime() / 1000);
    const exp = iat + expireIn;

    const payload = {
      exp,
      iat,
      iss: process.env.JWT_ISS,
      jti,
      sub,
    };

    return jwt.sign(payload, process.env.JWT_SECRET);
  }
}