const express = require('express');
const router = express.Router();
const LocationController = require('../controllers/locationController.js');
const FoursquareController = require('../controllers/foursquareController.js');
const upload = require('../middlewares/upload.js');

// get & search
router.get('/locations', LocationController.get);
router.get('/locations/:locationId', LocationController.getById);
// create
router.post('/locations', upload.single('imageFile'), LocationController.create);
// update
// delete
router.delete('/locations/:locationId', LocationController.deleteById);

// locations' images
router.get('/locations/image/:imageId', LocationController.getImage);

// foursquare
router.get('/foursquare/locations', FoursquareController.get);
router.get('/foursquare/locations/:locationId', FoursquareController.getById);

// Imports a batch of foursquare locations
router.post('/foursquare/locations/import', FoursquareController.get);

module.exports = router;
