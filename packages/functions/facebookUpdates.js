const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { POSTED } = require('shared/constants');


module.exports = {
  share: async function (event, context) {
    const UpdateModel = shared.UpdateModel;
    const update = await UpdateModel.findById(event.updateId);
    update.scheduleState = POSTED;
    await update.save();
  },

}