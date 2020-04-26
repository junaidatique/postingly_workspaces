const AWS = require("aws-sdk");;

module.exports = {
  createUser: async function (username, email, shopDomain) {
    const awsConfig = { accessKeyId: process.env.LOCAL_AWS_KEY, secretAccessKey: process.env.LOCAL_AWS_SECRET_KEY, region: process.env.AWS_REGION };
    AWS.config.update(awsConfig);
    const identityProvider = new AWS.CognitoIdentityServiceProvider({ apiVersion: "2016-04-18" });
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

    try {
      const result = await identityProvider.adminCreateUser(userParams).promise();
      if (result.User && result.User.Username) {
        return result.User.Username;
      }
      throw Error("No username!!");
    } catch (err) {
      console.log("TCL: err", err.message)
      if (err.code === "UsernameExistsException" && err.message.indexOf('RESEND') < 0) {
        const user = await identityProvider.adminGetUser({
          UserPoolId: userPoolId,
          Username: username,
        }).promise();
        return user.Username;
      }
      if (err.code === "UsernameExistsException" && err.message.indexOf('RESEND') >= 0) {
        const userParams = {
          MessageAction: "RESEND",
          TemporaryPassword: "Abc@1234",
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "name", Value: shopDomain },

          ],
          UserPoolId: userPoolId,
          Username: username,
        };
        try {
          const result = await identityProvider.adminCreateUser(userParams).promise();
          if (result.User && result.User.Username) {
            return result.User.Username;
          }
          throw Error("No username!!");
        } catch (err) {
          console.log("TCL: err", err.message)
          if (err.code === "UsernameExistsException" && err.message.indexOf('RESEND') < 0) {
            const user = await identityProvider.adminGetUser({
              UserPoolId: userPoolId,
              Username: username,
            }).promise();
            return user.Username;
          }
          throw err;
        }
      }
      throw err;
    }
  },
}