// Keep explicit Atlas/local URIs working; Render supplies private service fields.
function mongoUri(source = process.env) {
  if (source.MONGO_URI) return source.MONGO_URI;
  const { MONGO_HOST, MONGO_USER, MONGO_PASSWORD } = source;
  if (!MONGO_HOST || !MONGO_USER || !MONGO_PASSWORD) return undefined;
  const user = encodeURIComponent(MONGO_USER);
  const password = encodeURIComponent(MONGO_PASSWORD);
  const database = encodeURIComponent(source.MONGO_DATABASE || 'techneeds');
  return `mongodb://${user}:${password}@${MONGO_HOST}:27017/${database}?authSource=admin`;
}

module.exports = { mongoUri };
