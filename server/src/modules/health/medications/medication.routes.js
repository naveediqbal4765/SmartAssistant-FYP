const express = require('express');
const auth = require('../../../middleware/auth');
const {
  createMedication,
  deleteMedication,
  getMedications,
  updateMedication
} = require('./medication.controller');

const router = express.Router();

router.get('/', auth, getMedications);
router.post('/', auth, createMedication);
router.put('/:id', auth, updateMedication);
router.delete('/:id', auth, deleteMedication);

module.exports = router;
