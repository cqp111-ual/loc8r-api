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
      const createdReview = savedLocation.reviews[savedLocation.reviews.length - 1];

      return res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: createdReview
      });
    } catch (err) {
      log.error('[ReviewController.create()] Unexpected error!');
      next(err);
    }
  }

  static async get(req,res,next) {
    try {
      const {
        sort = 'date',
        order = 'desc',
        limit = '10',
        offset = '0'
      } = req.query;

      const allowedSortFields = ['rating', 'date'];

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      // Validations
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({ success: false, message: `'limit' must be a number between 1 and 100`, data: null });
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({ success: false, message: `'offset' must be a positive number`, data: null });
      }

      if (!allowedSortFields.includes(sort)) {
        return res.status(400).json({ success: false, message: `'sort' must be one of: ${allowedSortFields.join(', ')}`, data: null });
      }

      const { locationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
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

      // sort
      const sortFieldMap = {
        rating: 'rating',
        date: 'createdOn'
      };

      const sortField = sortFieldMap[sort];
      const sortOrder = order === 'asc' ? 1 : -1;
      const sortedReviews = [...location.reviews].sort((a, b) => {
        if (a[sortField] < b[sortField]) return -1 * sortOrder;
        if (a[sortField] > b[sortField]) return 1 * sortOrder;
        return 0;
      });

      // paginacion
      const total = sortedReviews.length;
      const paginatedReviews = sortedReviews.slice(parsedOffset, parsedOffset + parsedLimit);

      return res.status(200).json({
        success: true,
        message: "Reviews retrieved successfully",
        data: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          results: paginatedReviews
        }
      });
    } catch (err) {
      log.error('[ReviewController.get()] Unexpected error!');
      next(err);
    }
  }

  static async getById(req,res,next) {
    try {
      const { locationId, reviewId } = req.params;

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

      const review = location.reviews.id(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
          data: null
        });
      }

      return res.status(200).json({
        success: true,
        message: "Review retrieved successfully",
        data: review
      });
    } catch (err) {
      log.error('[ReviewController.getById()] Unexpected error!');
      next(err);
    }
  }

  static async delete (req,res,next) {
    try {
      const { locationId, reviewId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
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

      const reviewIndex = location.reviews.findIndex(r => r._id.equals(reviewId));
      if (reviewIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
          data: null
        });
      }

      location.reviews.splice(reviewIndex, 1);
      location.rating = ReviewController.meanRating(location.reviews);
      await location.save();

      return res.status(204).send();
    } catch (err) {
      log.error('[ReviewController.delete()] Unexpected error!');
      next(err);
    }
  }

  static async update (req,res,next) {
    try {
      // application/json
      if (!req.is('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json',
          data: null
        });
      }

      const { locationId, reviewId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
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

      const review = location.reviews.id(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
          data: null
        });
      }

      // Check data provided in request
      if ('author' in req.body) {
        if (typeof req.body.author === 'string' && req.body.author.trim().length > 0) {
          review.author = req.body.author;
        } else {
          return res.status(400).json({
            success: false,
            message: "Invalid author",
            data: null
          });
        }
      }

      if ('reviewText' in req.body) {
        if (typeof req.body.reviewText === 'string' && req.body.reviewText.trim().length > 0 && !(req.body.reviewText.length > 1000)) {
          review.reviewText = req.body.reviewText;
        } else {
          return res.status(400).json({
            success: false,
            message: "Invalid reviewText",
            data: null
          });
        }
      }

      if ('rating' in req.body) {
        if (typeof req.body.rating === 'number' && !(req.body.rating < 0) && !(req.body.rating > 5)) {
          review.rating = req.body.rating;
          location.rating = ReviewController.meanRating(location.reviews);
        } else {
          return res.status(400).json({
            success: false,
            message: "Invalid rating",
            data: null
          });
        }
      }
      
      if ('coordinates' in req.body) {
        if (isValidCoordinates(req.body.coordinates)) {
          review.coords.coordinates = req.body.coordinates;
        } else {
          return res.status(400).json({
            success: false,
            message: "Invalid coordinates",
            data: null
          });
        }
      }

      await location.save();
      const updatedReview = location.reviews.id(reviewId);

      return res.status(200).json({
        success: true,
        message: "Review updated successfully",
        data: updatedReview
      });

    } catch (err) {
      log.error('[ReviewController.update()] Unexpected error!');
      next(err);
    }
  }

}

module.exports = ReviewController;