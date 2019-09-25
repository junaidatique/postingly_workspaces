const mongoose = require('mongoose');
let conn = null;
module.exports = {
  createConnection: async function (context) {
    if (process.env.IS_OFFLINE === 'false') {
      context.callbackWaitsForEmptyEventLoop = false;
      if (conn) {
        return Promise.resolve(conn);
      }
      if (conn === null) {
        try {
          conn = await mongoose.connect(process.env.MONGODB_URL, {
            useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
            bufferMaxEntries: 0
          });
        } catch (error) {
          console.log("TCL: error", error)
        }
      }
    }
  }
}