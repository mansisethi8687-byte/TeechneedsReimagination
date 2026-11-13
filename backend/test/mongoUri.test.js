const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mongoUri } = require('../config/mongoUri');

test('explicit database URI takes precedence over Render fields', () => {
  assert.equal(mongoUri({ MONGO_URI: 'mongodb://localhost/demo', MONGO_HOST: 'unused' }), 'mongodb://localhost/demo');
});

test('Render-generated password characters are escaped in the authenticated URI', () => {
  const uri = new URL(mongoUri({ MONGO_HOST: 'private-mongo', MONGO_USER: 'tech@needs', MONGO_PASSWORD: 'a+/=:?#b' }));
  assert.equal(uri.hostname, 'private-mongo');
  assert.equal(uri.port, '27017');
  assert.equal(decodeURIComponent(uri.username), 'tech@needs');
  assert.equal(decodeURIComponent(uri.password), 'a+/=:?#b');
  assert.equal(uri.pathname, '/techneeds');
  assert.equal(uri.searchParams.get('authSource'), 'admin');
});

test('incomplete private database settings do not create a malformed URI', () => {
  for (const source of [{}, { MONGO_HOST: 'private-mongo' }, { MONGO_HOST: 'private-mongo', MONGO_USER: 'techneeds' }]) {
    assert.equal(mongoUri(source), undefined);
  }
});
