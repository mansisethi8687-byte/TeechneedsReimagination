const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { errorHandler, notFoundRoute } = require('./middleware/errors');

const app = express();
app.set('trust proxy', 1); // Render terminates TLS in front of us.

// Open in development; restrict with CORS_ORIGIN=https://a.com,https://b.com
app.use(cors(env.CORS_ORIGIN.length ? { origin: env.CORS_ORIGIN } : {}));
app.use(express.json({ limit: '1mb' }));

// Routes (upstream mounts kept)
app.use('/api', require('./routes/publicRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api', require('./routes/mentorRoutes')); // All routes under /api
app.use('/api/m', require('./routes/menteeRoutes'));
app.get('/', (req, res) => res.send('Mentorship API Running'));

app.use(notFoundRoute);
app.use(errorHandler);

module.exports = app;
