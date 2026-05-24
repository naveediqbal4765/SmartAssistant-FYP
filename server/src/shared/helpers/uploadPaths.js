const path = require('path');

const resolveUploadFilePath = (fileUrl) => {
  const basename = path.basename((fileUrl || '').replace(/\\/g, '/'));
  return path.join(__dirname, '..', '..', '..', 'uploads', basename);
};

module.exports = { resolveUploadFilePath };
