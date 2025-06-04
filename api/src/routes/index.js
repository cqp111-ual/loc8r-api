const express = require('express');
const router = express.Router();

router.get('/index', (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'API is working fine.',
      data: {
        sample_data: 'Hello!!'
      }
    });
});

module.exports = router;
