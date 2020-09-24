const shared = require('shared');
const fetch = require('node-fetch');
const FacebookService = require('shared').FacebookService;
const TwitterService = require('shared').TwitterService;
const BufferService = require('shared').BufferService;
const getProfileById = require('./functions').getProfileById;
const moment = require('moment')
const sqsHelper = require('shared').sqsHelper;
const updateClass = require('shared').updateClass;
const InstagramService = require('shared').InstagramService;
const {
    FACEBOOK_SERVICE, TEST, TWITTER_SERVICE, BUFFER_SERVICE,
    BUFFER_FACEBOOK_PROFILE,
    BUFFER_FACEBOOK_PAGE,
    BUFFER_TWITTER_PROFILE,
    RULE_TYPE_NEW,
    RULE_TYPE_OLD,
    RULE_TYPE_MANUAL

} = require('shared/constants');
const formattedProfile = require('./functions').formattedProfile;
const ProfileModel = require('shared').ProfileModel;
const RuleModel = require('shared').RuleModel;
const UpdateModel = require('shared').UpdateModel;
const StoreModel = require('shared').StoreModel;
const _ = require('lodash')
const profileFns = require('shared').profileFns;
const formattedStore = require('../Store/functions').formattedStore
module.exports = {
    connectProfile: async (obj, args, context, info) => {
        console.log("connectProfile args", args)
        if (args.input.service === FACEBOOK_SERVICE) {
            if (process.env.STAGE == TEST) {
                response = await FacebookService.getProfile(args.input.storeId, args.input.code, args.input.serviceProfile);
            } else {
                response = await FacebookService.login(args.input.storeId, args.input.code, args.input.serviceProfile);
            }
        } else if (args.input.service === TWITTER_SERVICE && !_.isNull(args.input.oauthToken)) {
            response = await TwitterService.getProfile(args.input.storeId, args.input.oauthToken, args.input.oauthRequestTokenSecret, args.input.oauthVerifier);
        } else if (args.input.service === BUFFER_SERVICE) {
            response = await BufferService.getProfile(args.input.storeId, args.input.code, args.input.serviceProfile);
        }
        return response;
    },
    listProfiles: async (obj, args, context, info) => {
        console.log("TCL: listProfiles args", args)

        let query = ProfileModel.find({ store: args.storeId, service: args.service });
        if (args.isConnected === true) {
            query = query.where({ isConnected: true });
        } else {
            if (args.service !== TWITTER_SERVICE) {
                query = query.where('isConnected').ne(true);
            }
        }
        if (!_.isUndefined(args.isTokenExpired)) {
            if (args.isTokenExpired === true) {
                query = query.where({ isTokenExpired: true });
            } else {
                query = query.where('isTokenExpired').ne(true);
            }

        }
        query = query.where('isSharePossible').equals(true);
        if ((!_.isUndefined(args.parent) && !_.isNull(args.parent)) && args.service !== TWITTER_SERVICE) {
            query = query.find({ 'parent': args.parent, serviceProfile: { $nin: [BUFFER_FACEBOOK_PROFILE, BUFFER_FACEBOOK_PAGE, BUFFER_TWITTER_PROFILE] } });
        }
        const profiles = await query;
        return profiles.map(profile => {
            return formattedProfile(profile);
        })

    },
    getProfile: async (obj, args, context, info) => {
        return getProfileById(args.id);
    },
    updateConnectProfile: async (obj, args, context, info) => {

        let res;
        console.log("TCL: updateConnectProfile args", args)
        if (!_.isEmpty(args)) {
            await Promise.all(args.input.map(async value => {
                if (value.isConnected) {
                    res = await ProfileModel.updateOne({ _id: value.id }, { isConnected: value.isConnected });
                }
            }));
        }
        const profiles = await ProfileModel.where('store').eq(args.storeId);
        connectedProfiles = profiles.map(profile => {
            if (profile.isConnected && profile.isSharePossible) {
                return profile;
            } else {
                return undefined;
            }
        }).filter(item => !_.isUndefined(item));

        await Promise.all(connectedProfiles.map(async profile => {
            if (profile.service === FACEBOOK_SERVICE && !profile.fbDefaultAlbum) {
                if (process.env.IS_OFFLINE === 'false') {
                    await sqsHelper.addToQueue('GetFacebookDefaultAlbums', { profileId: profile._id })
                } else {
                    await shared.FacebookService.getDefaultAlbum(
                        profile._id,
                        profile.serviceUserId,
                        profile.accessToken,
                        null
                    );
                }
            }
        }))

        const storeDetail = await StoreModel.findById(args.storeId);
        storeDetail.numberOfConnectedProfiles = connectedProfiles.length;
        await storeDetail.save();
        return profiles.map(profile => {
            return formattedProfile(profile);
        })
    },
    updateProfile: async (obj, args, context, info) => {
        console.log("TCL: updateProfile args", args)
        let updateData = {}
        if (!_.isUndefined(args.input.isTokenExpired)) {
            updateData['isTokenExpired'] = args.input.isTokenExpired;
        }
        if (!_.isUndefined(args.input.isConnected)) {
            updateData['isConnected'] = args.input.isConnected;
        }
        if (!_.isUndefined(args.input.fbDefaultAlbum)) {
            updateData['fbDefaultAlbum'] = args.input.fbDefaultAlbum;
        }
        if (!_.isEmpty(updateData)) {
            await ProfileModel.updateOne({ _id: args.profileId }, updateData);
        }
        const profileDetail = await ProfileModel.findById(args.profileId);
        if (profileDetail.isTokenExpired) {
            const ruleUpdate = await RuleModel.updateMany({ profile: args.profileId }, { active: false });
            const oldProductRule = await RuleModel.findOne({ profile: args.profileId, type: RULE_TYPE_OLD });
            if (oldProductRule) {
                await updateClass.deleteScheduledUpdates(oldProductRule._id)
            }
            const newProductRule = await RuleModel.findOne({ profile: args.profileId, type: RULE_TYPE_NEW });
            if (newProductRule) {
                await updateClass.deleteScheduledUpdates(newProductRule._id)
            }
            const manualProductRule = await RuleModel.findOne({ profile: args.profileId, type: RULE_TYPE_MANUAL });
            if (manualProductRule) {
                await updateClass.deleteScheduledUpdates(manualProductRule._id)
            }
            const updatesDeleted = await UpdateModel.deleteMany({ profile: args.profileId })
        }
        return formattedProfile(profileDetail);
    },
    deleteProfile: async (obj, args, context, info) => {
        console.log("TCL: deleteProfile args", args)
        let res;
        profileDetail = await ProfileModel.findById(args.profileId);
        await profileFns.deleteProfile(profileDetail);
        const profiles = await ProfileModel.where('store').eq(profileDetail.store);
        return profiles.map(profile => {
            return formattedProfile(profile);
        })
    },
    getBufferUpdates: async (obj, args, context, info) => {
        console.log("args", args)
        const response = await BufferService.getUpdates(args.profileId, args.status);
        return response;
    },
    deleteBufferUpdate: async (obj, args, context, info) => {
        console.log("args", args)
        const response = await BufferService.deleteUpdate(args.profileId, args.updateId);
        return response;
    },
    connectInstagram: async (obj, args, context, info) => {
        let response;
        if (args.input.state === 'login') {
            response = await InstagramService.login(args.input.storeId, args.input.username, args.input.password)
        } else if (args.input.state === 'challenge_required') {
            response = await InstagramService.challengeRequired(args.input.storeId, args.input.username, args.input.password, args.input.verificationCode)
        }
        console.log("response", response)
        if (response.status === 200) {

            const profiles = await ProfileModel.where('store').eq(args.input.storeId);
            const profileList = profiles.map(profile => {
                return formattedProfile(profile);
            })
            return {
                status: 200,
                message: response.message,
                profiles: profileList
            }
        } else {
            return response;
        }
    }
}