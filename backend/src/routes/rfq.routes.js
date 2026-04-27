const express = require('express');
const router = express.Router();
const {
  createRFQ,
  getAllRFQs,
  getRFQById,
  simulateBid,
  simulateWar,
} = require('../controllers/rfq.controller');

router.post('/', createRFQ);
router.get('/', getAllRFQs);
router.get('/:id', getRFQById);
router.post('/:id/simulate', simulateBid);
router.post('/:id/simulate-war', simulateWar);

module.exports = router;
