const mongoose = require('mongoose');
const hidePassword = require('./plugins/hidePassword');

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
}, { timestamps: true });

AdminSchema.plugin(hidePassword);

module.exports = mongoose.model('Admin', AdminSchema);
