// Kept for upstream imports. Both now delegate to the role-aware middleware.
const { authenticate } = require('./auth');

exports.authenticate = authenticate('mentor');
exports.authenticateMentee = authenticate('mentee');
