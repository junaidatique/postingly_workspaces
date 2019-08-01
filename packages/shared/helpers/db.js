
// const mongoose = require('mongoose')
// let connection = {}

// module.exports = async () => {
//   if (connection.isConnected) {
//     console.log('=> using existing database connection')
//     return
//   }

//   console.log('=> using new database connection')
//   const db = await mongoose.connect(process.env.MONGODB_URL)
//   connection.isConnected = db.connections[0].readyState
// }



// const mongoose = require('mongoose');
// mongoose.Promise = global.Promise;
// let isConnected;

// module.exports = connectToDatabase = () => {
//   if (isConnected) {
//     console.log('=> using existing database connection');
//     return Promise.resolve();
//   }
//   const db = mongoose.connection;
//   console.log('=> using new database connection');
//   return mongoose.connect(process.env.MONGODB_URL).then(db => {
//     isConnected = db.connections[0].readyState;
//   });

//   db.once('open', () => {
//     console.log('Connection established to database');
//   });

//   db.on('error', (err) => {
//     console.log('Error in mongo connection', err);
//   });

// };
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useCreateIndex: true })
mongoose.set("debug", (collectionName, method, query, doc) => {
  // if (method !== 'bulkWrite') {
  //   console.log(`${collectionName}.${method}`, JSON.stringify(query), doc);
  // } else {
  //   console.log(`${collectionName}.${method}`);
  // }
});
