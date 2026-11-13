// Never serialise a password field, hashed or not, in any API response.
module.exports = function hidePassword(schema) {
  const strip = (doc, ret) => {
    delete ret.password;
    return ret;
  };
  schema.set('toJSON', { transform: strip });
  schema.set('toObject', { transform: strip });
};
