const express = require('express');
const router = express.Router();
const LocationController = require('../controllers/locationController.js');
const ImageController = require('../controllers/imageController.js');
const ReviewController = require('../controllers/reviewController.js');
const FoursquareController = require('../controllers/foursquareController.js');
const upload = require('../middlewares/upload.js');

/**
 * @openapi
 * /api/locations:
 *   get:
 *     summary: Retrieve a list of locations
 *     description: Retrieves a paginated and optionally filtered list of locations.
 *     tags:
 *       - locations
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search keyword or phrase
 *         example: Eiffel
 *       - in: query
 *         name: searchBy
 *         schema:
 *           type: string
 *           enum: [name, date, coordinates]
 *         description: Field to search by (optional)
 *         example: name
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, rating, date]
 *           default: rating
 *         description: Field to sort by
 *         example: rating
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *         example: desc
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results to return (max 100)
 *         example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *         example: 0
 *     responses:
 *       200:
 *         description: Locations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Success message
 *                     data:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 5
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         results:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/LocationRead'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 */
router.get('/locations', LocationController.get);

/**
 * @openapi
 * /api/locations/{locationId}:
 *   get:
 *     summary: Get an existing location
 *     tags: [locations]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         schema:
 *           type: string
 *         required: true
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Location retrived successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: true
 *                     message:
 *                       example: Success message
 *                     data:
 *                       $ref: '#/components/schemas/LocationRead'
 *       404:
 *         description: Location not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: false
 *                     message:
 *                       example: Error message
 *                     data:
 *                       example: null
 * 
 */
router.get('/locations/:locationId', LocationController.getById);

/**
 * @openapi
 * /api/locations:
 *   post:
 *     summary: Create a new location
 *     tags: [locations]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/LocationCreateBody'
 *     responses:
 *       201:
 *         description: Location created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: true
 *                     message:
 *                       example: Success message
 *                     data:
 *                       $ref: '#/components/schemas/LocationRead'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: false
 *                     message:
 *                       example: Error message
 *                     data:
 *                       example: null
 */
router.post('/locations', upload.single('imageFile'), LocationController.create);

/**
 * @openapi
 * /api/locations/{locationId}:
 *   put:
 *     summary: Edit an existing location
 *     tags: [locations]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         schema:
 *           type: string
 *         required: true
 *         description: Location ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/LocationEditBody'
 *     responses:
 *       200:
 *         description: Location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: true
 *                     message:
 *                       example: Success message
 *                     data:
 *                       $ref: '#/components/schemas/LocationRead'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: false
 *                     message:
 *                       example: Error message
 *                     data:
 *                       example: null
 *       404:
 *         description: Location not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: false
 *                     message:
 *                       example: Error message
 *                     data:
 *                       example: null
 * 
 */
router.put('/locations', upload.single('imageFile'), LocationController.create);

/**
 * @openapi
 * /api/locations/{locationId}:
 *   delete:
 *     summary: Delete an existing location and its associated comments and images
 *     tags: [locations]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         schema:
 *           type: string
 *         required: true
 *         description: Location ID
 *     responses:
 *       204:
 *         description: Location deleted successfully
 *       404:
 *         description: Location not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: false
 *                     message:
 *                       example: Error message
 *                     data:
 *                       example: null
 * 
 */
router.delete('/locations/:locationId', LocationController.deleteById);

/**
 * @openapi
 * /api/locations/image/{imageId}:
 *   get:
 *     summary: Get location image by ID
 *     description: Retrieves a location image using the provided image ID.
 *     tags:
 *       - images
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the image to retrieve
 *         example: 6841ebf54b28d8812cc5ea1f
 *     responses:
 *       200:
 *         description: Image retrieved successfully
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Image not found
 *                     data:
 *                       nullable: true
 *                       example: null
 */
router.get('/locations/image/:imageId', ImageController.getImage);

/**
 * @openapi
 * /api/foursquare/locations:
 *   get:
 *     summary: Get locations from Foursquare
 *     description: Returns a list of nearby places using the Foursquare API. All query parameters are optional and have default values.
 *     tags:
 *       - Foursquare
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Optional search term (e.g., "restaurant", "coffee", "museum").
 *       - in: query
 *         name: coordinates
 *         schema:
 *           type: string
 *           example: "[37.18141,-1.82252]"
 *         description: "JSON-formatted string representing coordinates. Example: \"[37.18141,-1.82252]\""
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           default: 10000
 *           minimum: 1
 *         description: Search radius in meters. Must be a positive integer. Defaults to 10000.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: relevance
 *           enum: [relevance, distance, rating]
 *         description: "Sorting criteria. One of: relevance, distance, rating."
 *     responses:
 *       200:
 *         description: Successfully retrieved locations from Foursquare
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Foursquare places retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FoursquareLocation'
 *       500:
 *         description: Server error while retrieving locations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 data:
 *                   type: "null"
 *                   example: null
 */
router.get('/foursquare/locations', FoursquareController.get);

/**
 * @openapi
 * /api/foursquare/locations/import:
 *   post:
 *     summary: Import locations by Foursquare IDs
 *     description: "Receives an array of Foursquare location IDs (`fsq_ids`) and attempts to import them. The operation is partially tolerant: some may succeed while others fail."
 *     tags:
 *       - Foursquare
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fsq_ids
 *             properties:
 *               fsq_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 10
 *                 example: ["4ae4b5bdf964a520019f21e3", "4b0588f6f964a520c7b222e3"]
 *             description: Array of Foursquare location IDs to import (1 to 10 items).
 *     responses:
 *       201:
 *         description: All Foursquare locations were successfully imported.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Success message
 *                     data:
 *                       type: object
 *                       properties:
 *                         inserted:
 *                           type: array
 *                           items:
 *                             type: string
 *                         failed:
 *                           type: array
 *                           items:
 *                             type: string
 *       207:
 *         description: Some locations were imported successfully, others failed.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Partial success message
 *                     data:
 *                       type: object
 *                       properties:
 *                         inserted:
 *                           type: array
 *                           items:
 *                             type: string
 *                         failed:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Bad request – invalid or missing fsq_ids array.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 *       500:
 *         description: Internal server error – no locations were imported.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 */
router.post('/foursquare/locations/import', FoursquareController.import);

/**
 * @openapi
 * /api/locations/{locationId}/reviews:
 *   post:
 *     summary: Create a new review for a location
 *     tags: [reviews]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the location
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewCreate'
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Review'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 *       404:
 *         description: Location not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 */
router.post('/locations/:locationId/reviews', ReviewController.create);

/**
 * @openapi
 * /api/locations/{locationId}/reviews:
 *   get:
 *     summary: Get all reviews for a location
 *     tags: [reviews]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the location
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: true
 *                     message:
 *                       example: Success message
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Review'
 *       404:
 *         description: Location not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 */
router.get('/locations/:locationId/reviews', ReviewController.get);


/**
 * @openapi
 * /api/locations/{locationId}/reviews/{reviewId}:
 *   get:
 *     summary: Get a review by ID
 *     tags: [reviews]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: true
 *                     message:
 *                       example: Success message
 *                     data:
 *                       $ref: '#/components/schemas/Review'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 *       404:
 *         description: Location or Review not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 */
router.get('/locations/:locationId/reviews/:reviewId', ReviewController.getById);

/**
 * @openapi
 * /api/locations/{locationId}/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review by ID
 *     tags: [reviews]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 */
router.delete('/locations/:locationId/reviews/:reviewId', ReviewController.delete);

/**
 * @openapi
 * /api/locations/{locationId}/reviews/{reviewId}:
 *   put:
 *     summary: Update a review by ID
 *     tags: [reviews]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewEdit'
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       example: true
 *                     message:
 *                       example: Success message
 *                     data:
 *                       $ref: '#/components/schemas/Review'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 *       404:
 *         description: Location or Review not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GenericResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Error message
 *                     data:
 *                       nullable: true
 *                       example: null
 */
router.put('/locations/:locationId/reviews/:reviewId', ReviewController.update);

/**
 * @openapi
 * components:
 *   schemas:
 *     GenericResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the operation was successful
 *         message:
 *           type: string
 *           description: A descriptive message about the result
 *         data:
 *           description: Payload data (can vary depending on the endpoint)
 *     Coordinates:
 *       type: array
 *       description: |
 *         GPS coordinates as an array of two numbers: [longitude, latitude].
 *         Longitude ranges from -180 to 180, latitude from -90 to 90.
 *       minItems: 2
 *       maxItems: 2
 *       items:
 *         type: number
 *         format: double
 *       example: [-1.9822, 41.9876]
 *     ReviewCreate:
 *       type: object
 *       required:
 *         - author
 *         - rating
 *         - reviewText
 *         - coordinates
 *       properties:
 *         author:
 *           type: string
 *           description: Name of the reviewer
 *         rating:
 *           type: number
 *           format: double
 *           minimum: 0
 *           maximum: 5
 *           description: Rating between 0 and 5
 *         reviewText:
 *           type: string
 *           maxLength: 1000
 *           description: The actual review content
 *         coordinates:
 *           $ref: '#/components/schemas/Coordinates'
 *     ReviewEdit:
 *       type: object
 *       properties:
 *         author:
 *           type: string
 *         rating:
 *           type: number
 *           format: double
 *           minimum: 0
 *           maximum: 5
 *         reviewText:
 *           type: string
 *           maxLength: 1000
 *         coordinates:
 *           $ref: '#/components/schemas/Coordinates'
 *     Review:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier of the review
 *           example: 68420d214b28d8812cc5ea2d
 *         author:
 *           type: string
 *         rating:
 *           type: number
 *           format: double
 *           minimum: 0
 *           maximum: 5
 *         reviewText:
 *           type: string
 *           maxLength: 1000
 *         createdOn:
 *           type: string
 *           format: date-time
 *           description: ISO timestamp of when the review was created
 *         coordinates:
 *           $ref: '#/components/schemas/Coordinates'
  *     LocationRead:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         address:
 *           type: string
 *         rating:
 *           type: number
 *           format: double
 *         description:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         coordinates:
 *           $ref: '#/components/schemas/Coordinates'
 *         createdOn:
 *           type: string
 *           format: date-time
 *         imageId:
 *           type: string
 *         numReviews:
 *           type: integer
 *       example:
 *         name: "Santiago Bernabéu Stadium (Estadio Santiago Bernabéu)"
 *         address: "Avenida de Concha Espina, 1 (P. de La Castellana), 28036 Madrid Comunidad de Madrid"
 *         rating: 4.99
 *         description: ""
 *         tags: ["Stadium"]
 *         coordinates: [40.453026, -3.688322]
 *         id: "6841ebf44b28d8812cc5ea21"
 *         createdOn: "2025-06-05T19:11:48.794Z"
 *         imageId: "6841ebf44b28d8812cc5ea1f"
 *         numReviews: 1
 *     LocationCreateBody:
 *       type: object
 *       required:
 *         - name
 *         - coordinates
 *       properties:
 *         name:
 *           type: string
 *         address:
 *           type: string
 *         description:
 *           type: string
 *         coordinates:
 *           type: string
 *           description: Coordinates as a JSON string, e.g. "[40.453026, -3.688322]"
 *         tags:
 *           type: string
 *           description: Tags as a JSON string array, e.g. '["Stadium","Tourist"]'
 *         imageUrl:
 *           type: string
 *           format: uri
 *           description: Optional image URL if no file is uploaded
 *         imageFile:
 *           type: string
 *           format: binary
 *           description: Optional image file (jpg, jpeg, png, webp). Preferred over imageUrl.
 *     LocationEditBody:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         address:
 *           type: string
 *         description:
 *           type: string
 *         coordinates:
 *           type: string
 *           description: Coordinates as a JSON string, e.g. "[40.453026, -3.688322]"
 *         tags:
 *           type: string
 *           description: Tags as a JSON string array, e.g. '["Stadium","Tourist"]'
 *         imageUrl:
 *           type: string
 *           format: uri
 *         imageFile:
 *           type: string
 *           format: binary
 *       description: All fields optional for update
 *     FoursquareLocation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 4bb3a926a32876b0b10702fe
 *         name:
 *           type: string
 *           example: Maraú Beach Club
 *         rating:
 *           type: number
 *           format: float
 *           example: 4.25
 *         description:
 *           type: string
 *           example: Beachfront club with Mediterranean cuisine
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Night Club", "Mediterranean"]
 *         address:
 *           type: string
 *           example: Avenida Descubrimiento, s/n, 04621 Vera Andalucía
 *         coordinates:
 *           type: array
 *           items:
 *             type: number
 *             format: float
 *           minItems: 2
 *           maxItems: 2
 *           example: [37.210192, -1.809629]
 *         imageUrl:
 *           type: string
 *           nullable: true
 *           example: null
 */

module.exports = router;
