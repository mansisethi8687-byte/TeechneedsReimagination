require('dotenv').config();

const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  // The problem statement runs the backend locally on 8000.
  PORT: Number(process.env.PORT) || 8000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGIN: list(process.env.CORS_ORIGIN),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_NAME: process.env.ADMIN_NAME || 'TechNeeds Admin',
};

function assertRuntimeEnv() {
  const missing = ['MONGO_URI', 'JWT_SECRET'].filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}. Copy backend/.env.example to backend/.env.`);
  }
}

module.exports = { env, assertRuntimeEnv };
