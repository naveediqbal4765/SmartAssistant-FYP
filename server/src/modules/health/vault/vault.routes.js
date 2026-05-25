const express = require('express');
const { getHealthVaultStatus } = require('./vault.controller');

const router = express.Router();

router.get('/', getHealthVaultStatus);

module.exports = router;
