const mongoose = require('mongoose');
const LocationModel = mongoose.model('Location');
const { isValidCoordinates } = require('../utils/helpers.js');

class ReviewController {

  static meanRating(reviews) {
    if (!reviews || reviews.length === 0) {
        return 0;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    const mean = total / reviews.length;

    return mean.toFixed(2);
  }

  static async create(req, res, next) {

    try {
      // application/json
      if (!req.is('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json',
          data: null
        });
      }

      // Get location
      const { locationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid location ID format",
          data: null
        });
      }

      const location = await LocationModel.findById(locationId);
      if (!location) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
          data: null
        });
      }
  
      const {author, reviewText, rating, coordinates } = req.body;
  
      // Check required fields
      if (
        (!author || typeof author !== 'string' || author.trim().length === 0) ||
        (!reviewText || typeof reviewText !== 'string' || reviewText.trim().length === 0 || reviewText.length > 1000) ||
        (typeof rating !== 'number' || rating < 0 || rating > 5) ||
        (!coordinates || !isValidCoordinates(coordinates))
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input: check author, rating, reviewText, and coordinates.',
          data: null
        });
      }

      const newReview = {
        author,
        rating,
        reviewText,
        coords: {
          type: 'Point',
          coordinates
        }
      };

      location.reviews.push(newReview);
      location.rating = ReviewController.meanRating(location.reviews);
      const savedLocation = await location.save();

      return res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: savedLocation
      });
    } catch (err) {
      log.error('[ReviewController.create()] Unexpected error!');
      next(err);
    }
  }

}

module.exports = ReviewController;