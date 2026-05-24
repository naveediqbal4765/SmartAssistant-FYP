const mongoose = require('mongoose');
const { normalizeUserDocuments } = require('../shared/links/userLinks');

const connectDatabase = async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-senior-db'
  );
  console.log('✅ MongoDB Connected Successfully');
  await normalizeUserDocuments();
};

module.exports = { connectDatabase };
