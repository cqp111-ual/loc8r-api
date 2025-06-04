const express = require('express');
const router = express.Router();

router.get('/index', (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Hey from index!',
      data: {
        sample_data: 'abcd-jesus'
      }
    });
});

module.exports = router;
