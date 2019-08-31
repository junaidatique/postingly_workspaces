const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
let connection = null;
module.exports = async () => {
  if (connection === null) {
    connection = await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
      bufferMaxEntries: 0
    });
  }
  return connection;
}