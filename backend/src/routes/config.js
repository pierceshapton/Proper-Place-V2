const express = require('express');
const router = express.Router();

// Get available facilities - can be updated without new app versions
router.get('/facilities', (req, res) => {
  const facilities = [
    'WiFi',
    'Electricity Hookup',
    'Drinking water fill up point',
    'Chemical toilet disposal point',
    'Grey water disposal point',
    'Waste recycling point',
    'Restaurant/Pub',
  ];

  res.json({
    success: true,
    facilities: facilities,
  });
});

module.exports = router;
