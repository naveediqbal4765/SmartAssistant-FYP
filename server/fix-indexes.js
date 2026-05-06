const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/smart-senior-db')
  .then(async () => {
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;
    
    try {
      await db.collection('users').dropIndex('googleId_1');
      console.log('✅ Dropped googleId_1 index');
    } catch (err) {
      console.log('googleId_1 index not found');
    }
    
    try {
      await db.collection('users').dropIndex('facebookId_1');
      console.log('✅ Dropped facebookId_1 index');
    } catch (err) {
      console.log('facebookId_1 index not found');
    }
    
    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });