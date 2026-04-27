const express = require('express');
const router = express.Router();
const { placeBid } = require('../controllers/bid.controller');

router.post('/', placeBid);

module.exports = router;
