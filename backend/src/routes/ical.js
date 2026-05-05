const express = require('express');
const icalController = require('../controllers/icalController');

const router = express.Router();

// Public ICS export for a place
router.get('/place/:placeId.ics', icalController.exportPlaceCalendar);

module.exports = router;
