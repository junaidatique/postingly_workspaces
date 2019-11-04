const AWS = require("aws-sdk");;

module.exports = {
  createUser: async function (username, email, shopDomain) {
    console.log("createUser email", email);
    console.log("createUser shopDomain", shopDomain);
    const awsConfig = { accessKeyId: process.env.LOCAL_AWS_KEY, secretAccessKey: process.env.LOCAL_AWS_SECRET_KEY, region: process.env.AWS_REGION };
    // console.log("TCL: awsConfig", awsConfig)
    AWS.config.update(awsConfig);
    const identityProvider = new AWS.CognitoIdentityServiceProvider({ apiVersion: "2016-04-18" });
    // console.log("TCL: identityProvider", identityProvider)
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      console.log("USER_POOL_ID environment variable not set");
      throw new Error("USER_POOL_ID environment variable not set");
    }

    const userParams = {
      // MessageAction: "SUPPRESS",
      TemporaryPassword: "Abc@1234",
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: shopDomain },

      ],
      UserPoolId: userPoolId,
      Username: username,
    };
    console.log("createUser userParams", userParams);

    try {
      const result = await identityProvider.adminCreateUser(userParams).promise();
      console.log("createUser identityProvider User", result.User);
      if (result.User && result.User.Username) {
        return result.User.Username;
      }
      throw Error("No username!!");
    } catch (err) {
      console.log("TCL: err", err)
      console.log("TCL: err", err.message)
      if (err.code === "UsernameExistsException") {
        const user = await identityProvider.adminGetUser({
          UserPoolId: userPoolId,
          Username: username,
        }).promise();
        console.log("createUser adminGetUser User", user);
        return user.Username;
      }
      throw err;
    }
  },
}