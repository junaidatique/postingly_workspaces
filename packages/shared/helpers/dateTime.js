module.exports = {
  getRoundedDate: function (minutes, d = new Date()) {
    let ms = 1000 * 60 * minutes; // convert minutes to ms
    let roundedDate = new Date((Math.round(d.getTime() / ms) * ms) + ms);
    return roundedDate
  },
  getOldRoundedDate: function (minutes, d = new Date()) {
    let ms = 1000 * 60 * minutes; // convert minutes to ms
    let roundedDate = new Date((Math.round(d.getTime() / ms) * ms) - ms);
    return roundedDate
  }
}