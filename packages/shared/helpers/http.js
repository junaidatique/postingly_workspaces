
module.exports = {
  badRequest: function (message, res) {
    return res.status(400).json({ message: message });
  },

  internalError: function (res) {
    return res.status(500).json({ message: "Internal Error" });
  },

  noContent: function (res) {
    return res.status(204).json();
  },

  ok: function (body, res) {
    return res.status(200).json(body);
  }
}