const IgApiClient = require('instagram-private-api').IgApiClient;
const IgLoginTwoFactorRequiredError = require('instagram-private-api').IgLoginTwoFactorRequiredError;
const get = require('request-promise').get;

const ProfileModel = require('shared').ProfileModel;
const InstaCookie = require('shared').InstaCookie;
const StoreModel = require('shared').StoreModel;
const stringHelper = require('shared').stringHelper;

const { INSTAGRAM_SERVICE, INSTAGRAM_PROFILE, FAILED, POSTED } = require('shared/constants');
module.exports = {
    saveSerialized: async function (username, serialized) {
        await InstaCookie.update({ username: username }, { cookies: JSON.stringify(serialized) }, { upsert: true })
    },
    login: async function (storeId, username, password) {
        const ig = new IgApiClient();
        ig.state.generateDevice(username);
        ig.state.proxyUrl = stringHelper.getProxyURL();
        let serialized;
        ig.request.end$.subscribe(async () => {
            serialized = await ig.state.serialize();
            delete serialized.constants;
            await module.exports.saveSerialized(username, serialized)
        });

        await ig.simulate.preLoginFlow();
        try {
            const loggedInUser = await ig.account.login(username, password);
            // await ig.simulate.postLoginFlow();
            console.log(`Instagram-login-loggedInUser ${username}`, loggedInUser)
            await this.createProfile(storeId, loggedInUser, password, serialized)
            return { status: 200, message: "You are now connected" };
        } catch (error) {
            console.log("error", error)
            console.log("error.message", error.message)

            if (error instanceof IgLoginTwoFactorRequiredError) {
                return { status: 400, message: '2fa' }
            }
            console.log(`Instagram-login-error ${username}`, error.message)
            const errorMessage = error.message.split(';')[1].trim();
            if (errorMessage === 'challenge_required') {
                await ig.challenge.auto(true);
                return { status: 400, message: 'challenge_required' }
            } else {
                return { status: 400, message: "Please make sure you have entered the right username and password. Please verify on instagram that it was you." }
            }
        }
    },
    twoFA: async function (storeId, username, password, verificationCode) {
        console.log("twoFA verificationCode", verificationCode)
        const ig = new IgApiClient();
        ig.state.generateDevice(username);
        ig.state.proxyUrl = stringHelper.getProxyURL();
        let serialized;
        ig.request.end$.subscribe(async () => {
            serialized = await ig.state.serialize();
            delete serialized.constants;
            await module.exports.saveSerialized(username, serialized)
        });
        await ig.simulate.preLoginFlow();
        try {
            const loggedInUser = await ig.account.login(username, password);
            console.log(`Instagram-twoFA-loggedInUser ${username}`, loggedInUser)
            await this.createProfile(storeId, loggedInUser, password, serialized)
            return { status: 200, message: "You are now connected" }
        } catch (error) {
            console.log(`Instagram-twoFA-error ${username}`, error.response.body)
            if (error instanceof IgLoginTwoFactorRequiredError) {
                try {
                    const { username, two_factor_identifier, totp_two_factor_on } = error.response.body.two_factor_info;
                    // decide which method to use
                    const verificationMethod = totp_two_factor_on ? '0' : '1'; // default to 1 for SMS
                    const codeResponse = await ig.account.twoFactorLogin({
                        username,
                        verificationCode: verificationCode,
                        twoFactorIdentifier: two_factor_identifier,
                        verificationMethod, // '1' = SMS (default), '0' = TOTP (google auth for example)
                        trustThisDevice: '1', // Can be omitted as '1' is used by default
                    });
                    // this.sleep(2000);
                    // console.log(`Instagram-twoFA-codeResponse ${username}`, codeResponse)
                    await this.createProfile(storeId, codeResponse.logged_in_user, password, serialized)
                    return { status: 200, message: "You are now connected" }
                } catch (e) {
                    console.log("e", e)
                    if (e.message.indexOf('challenge_required') > 0) {
                        // return await this.challengeRequired(storeId, username, password, verificationCode);
                        await ig.challenge.auto(true);
                        return { status: 400, message: 'challenge_required' }
                    }
                    console.log(`Instagram-twoFA-error 2 ${username}`, e.message)
                    return { status: 200, message: "Invalid code" }
                }

            }
        }
    },
    challengeRequired: async function (storeId, username, password, verificationCode) {
        console.log(`Instagram-challengeRequired-verificationCode ${username}`, verificationCode)
        const ig = new IgApiClient();
        ig.state.generateDevice(username);
        ig.state.proxyUrl = stringHelper.getProxyURL();
        let authUser;
        let serialized;
        ig.request.end$.subscribe(async () => {
            serialized = await ig.state.serialize();
            delete serialized.constants;
            await module.exports.saveSerialized(username, serialized)
        });

        try {
            authUser = await ig.account.login(username, password);
            console.log(`Instagram-challengeRequired-authUser ${username}`, authUser, serialized)
            await this.createProfile(storeId, authUser, password)
            return { status: 200, message: "You are now connected" }
        } catch (IgCheckpointError) {
            try {
                await ig.challenge.auto(true);
                const codeResponse = await ig.challenge.sendSecurityCode(verificationCode);
                console.log(`Instagram-challengeRequired-codeResponse ${username}`, codeResponse)
                await this.createProfile(storeId, codeResponse.logged_in_user, password, serialized)
                return { status: 200, message: "Connected" }
            } catch (e) {
                console.log("e", e)
                console.log("e", e.message)

                console.log(`Instagram-challengeRequired ${username} Could not resolve checkpoint`)
                return { status: 400, message: "Invalid Code. Please try again." }
            }
        }



    },
    createProfile: async function (storeId, userResponse, password, cookies) {
        if (!userResponse) {
            return '';
        }
        const uniqKey = `${INSTAGRAM_PROFILE}-${storeId}-${userResponse.pk}`;
        console.log("uniqKey", uniqKey)
        let profile = await ProfileModel.findOne({ uniqKey: uniqKey });
        console.log("profile", profile)

        const userParams = {
            uniqKey: uniqKey,
            name: userResponse.full_name,
            avatarUrl: userResponse.profile_pic_url,
            serviceUsername: userResponse.username,
            serviceUserId: userResponse.pk,
            profileURL: `https://instagram.com/${userResponse.username}`,
            accessToken: password,
            service: INSTAGRAM_SERVICE,
            serviceProfile: INSTAGRAM_PROFILE,
            isConnected: true,
            isTokenExpired: false,
            isSharePossible: true,
            store: storeId,
            cookies: JSON.stringify(cookies)
        };
        if (profile === null) {
            const profileInstance = new ProfileModel(userParams);
            profile = await profileInstance.save();
            console.log("profile", profile)
            const storeDetail = await StoreModel.findById(storeId);
            storeDetail.profiles = [...storeDetail.profiles, profile._id];
            const response = await storeDetail.save();
            console.log("response", response)
        } else {
            await ProfileModel.updateOne({ _id: profile._id }, userParams)
        }
        return profile;
    },
    shareProductPosts: async function (update) {
        const profile = await ProfileModel.findById(update.profile);
        const imageUrl = `http://posting.ly/buffer_image?url=${update.images[0].url}`;
        // const imageUrl = update.images[0].url;
        const iCookie = await InstaCookie.find({ username: profile.serviceUsername })

        if (iCookie.length === 0) {
            return {
                scheduleState: FAILED,
                failedMessage: "Cookie not found. Connect again. ",
                response: null,
            }
        }
        try {
            const ig = new IgApiClient();
            ig.state.generateDevice(profile.serviceUsername);
            ig.state.proxyUrl = stringHelper.getProxyURL();
            console.log("ig.state.proxyUrl", ig.state.proxyUrl)
            // console.log("JSON.parse(iCookie.cookies)", JSON.parse(iCookie[0].cookies))

            await ig.state.deserialize(JSON.parse(iCookie[0].cookies));

            // await ig.simulate.preLoginFlow();
            // const loggedInUser = await ig.account.login(profile.serviceUsername, profile.accessToken);
            // console.log("loggedInUser", loggedInUser.username)
            // await ig.simulate.postLoginFlow();

            const imageBuffer = await get({
                url: imageUrl,
                encoding: null,
            });

            const publishResult = await ig.publish.photo({
                file: imageBuffer,
                caption: update.text,
            });
            console.log("publishResult.media", publishResult.media)
            console.log("publishResult.media.image_versions2", publishResult.media.image_versions2)
            console.log("publishResult.media.image_versions2.candidates", publishResult.media.image_versions2.candidates)
            return {
                scheduleState: POSTED,
                response: {
                    instagramImageUrl: publishResult.media.image_versions2.candidates[0].url,
                },
                failedMessage: null
            };

        } catch (e) {
            console.log("e.message", e.message)
            let responseError = e.message;
            if (e.message.indexOf(';') >= 0) {
                responseError = (e.message.split(';')[1].trim()) ? e.message.split(';')[1].trim() : e.message.split('-')[1].trim()
            }
            return {
                scheduleState: FAILED,
                failedMessage: responseError,
                response: null,
            }
        }
    },
    sleep: async function (seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds));
    },
}