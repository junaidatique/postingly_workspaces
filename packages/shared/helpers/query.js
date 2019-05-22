const _ = require('lodash')

module.exports = {
  createSearchQuery: function (model, args) {
    model = model.find();
    if (!_.isEmpty(args)) {
      if (_.has(args, 'limit')) {
        model = model.limit(args.limit);
      } else {
        model = model.limit(parseInt(process.env.PER_PAGE));
      }
      if (_.has(args, 'skip')) {
        model = model.skip(args.skip);
      }
      if (_.has(args, 'filter')) {
        for (const field in args.filter) {
          for (const op in args.filter[field]) {
            if (op === 'ne') {
              model = model.where(field).ne(args.filter[field][op]);
            }
            if (op === 'eq') {
              model = model.where(field, args.filter[field][op]);
            }
            if (op === 'lte') {
              model = model.where(field).lte(args.filter[field][op]);
            }
            if (op === 'lt') {
              model = model.where(field).lt(args.filter[field][op]);
            }
            if (op === 'gte') {
              model = model.where(field).gte(args.filter[field][op]);
            }
            if (op === 'gt') {
              model = model.where(field).gt(args.filter[field][op]);
            }
            if (op === 'contains') {
              model = model.where(field, new RegExp(args.filter[field]['contains'], "i"));
            }

          }
        }
      }
      if (_.has(args, 'sort')) {
        let sort_order = {};
        sort_order[args.sort.split('_')[0]] = args.sort.split('_')[1];
        model.sort(sort_order)
      }
    } else {
      model = model.limit(parseInt(process.env.PER_PAGE));
    }
    return model;

  }
}