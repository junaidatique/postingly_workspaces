
module.exports = {
  badRequest: function (message) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" // Required for CORS support to work
      },
      body: JSON.stringify({ "message": message })
    };
  },

  internalError: function () {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" // Required for CORS support to work
      },
      body: JSON.stringify({ "message": "Internal Error" })
    };
  },

  noContent: function () {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" // Required for CORS support to work
      }
    };
  },

  ok: function (body) {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" // Required for CORS support to work
      },
      body: JSON.stringify(body)
    };
  }
}