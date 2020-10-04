const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

const instaCookieSchema = new mongoose.Schema({
  username: {
    type: String,
    index: true,
  },
  cookies: {
    type: String
  },
});

instaCookieSchema.set('timestamps', true);

if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.InstaCookie;
}

module.exports = mongoose.model('InstaCookie', instaCookieSchema);