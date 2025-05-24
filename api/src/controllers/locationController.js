const fs = require('fs'); // existsSync, createReadStream
const fsp = require('fs/promises'); // async/await unlink
const path = require('path');
const mime = require('mime-types');
const { request } = require('undici');
const mongoose = require('mongoose');
const LocationModel = mongoose.model('Location');
const ImageModel = mongoose.model('Image');
const { uploadsDir } = require('../config/config.js');
const { isValidCoordinates } = require('../utils/helpers.js');

class LocationController {
  static allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  static async getImage(req, res, next) {
    try {

      const imageId = req.params.imageId;

      if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid image ID format",
          data: null
        });
      }

      const image = await ImageModel.findById(imageId);
      if (!image) {
        return res.status(404).json({
          success: false,
          message: "Image not found",
          data: null
          });
      }

      // Si hosted === false => proxy externa
      if (!image.hosted) {
        try {
          const externalResponse = await request(image.url);
          if (externalResponse.statusCode !== 200) {
            return res.status(502).json({
              success: false,
              message: `Failed to fetch external image. Status: ${externalResponse.statusCode}`,
              data: null
            });
          }

          const contentType = externalResponse.headers['content-type'];
          if (!contentType ) {
            return res.status(400).json({
              success: false,
              message: 'Missing Content-Type in external response',
              data: null
            });
          }

          if (!LocationController.allowedImageTypes.includes(contentType.toLowerCase())) {
            return res.status(415).json({
              success: false,
              message: `Unsupported image type: ${contentType}. Must be one of: ${LocationController.allowedImageTypes.join(', ')}`,
              data: null
            });
          }

          // return proxied image
          res.status(200);
          res.setHeader('Content-Type', contentType);
          externalResponse.body.pipe(res);
          return;
        } catch (err) {
          log.error(`[LocationController.getImage()] Error fetching external image: ${err.message}`);
          return res.status(500).json({
            success: false,
            message: 'Error fetching external image',
            data: null
          });
        }
      } else {
        try {
          const imagePath = path.join(uploadsDir, image.path);
          if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
              success: false,
              message: 'Hosted image file not found on server',
              data: null
            });
          }

          const mimeType =  mime.lookup(imagePath); 
          if (!mimeType || !LocationController.allowedImageTypes.includes(mimeType.toLowerCase())) {
            return res.status(415).json({
              success: false,
              message: `Unsupported local image type: ${mimeType}`,
              data: null
            });
          }
      
          res.status(200);
          res.setHeader('Content-Type', mimeType);
          const stream = fs.createReadStream(imagePath);
          stream.pipe(res);
        } catch (err) {
          log.error(`[LocationController.getImage()] Error serving hosted image: ${err.message}`);
          return res.status(500).json({
            success: false,
            message: 'Error serving hosted image',
            data: null
          });
        }
      }
    } catch (err) {
      log.error('[LocationController.getImage()] Unexpected error!');
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {

      const locationId = req.params.locationId;

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
      return res.status(200).json({
        success: true,
        message: "Location found",
        data: location
      });
    } catch (err) {
      log.error('[LocationController.getById()] Unexpected error!');
      next(err);
    }
  }

  static async deleteById (req, res, next) {
    try {
      const locationId = req.params.locationId;

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid location ID format",
          data: null
        });
      }

      const location = await LocationModel.findByIdAndDelete(locationId);
      if (!location) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
          data: null
        });
      }
      return res.status(204).send();
    } catch (err) {
      log.error('[LocationController.deleteById()] Unexpected error!');
      next(err);
    }
  }

  static async get(req, res, next) {
    try {
      const {
        q,
        searchBy,
        sort = 'rating',
        order = 'desc',
        limit = '10',
        offset = '0'
      } = req.query;

      const allowedSearchFields = ['name', 'date', 'coordinates'];
      const allowedSortFields = ['name', 'rating', 'date'];

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      // Validations
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({ success: false, message: `'limit' must be a number between 1 and 100`, data: null });
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({ success: false, message: `'offset' must be a positive number`, data: null });
      }

      if (searchBy && !allowedSearchFields.includes(searchBy)) {
        return res.status(400).json({ success: false, message: `'searchBy' must be one of: ${allowedSearchFields.join(', ')}`, data: null });
      }

      if (!allowedSortFields.includes(sort)) {
        return res.status(400).json({ success: false, message: `'sort' must be one of: ${allowedSortFields.join(', ')}`, data: null });
      }

      // Query construction
      const sortFieldMap = {
        name: 'name',
        rating: 'rating',
        date: 'timestamp'
      };

      const sortOrder = order === 'asc' ? 1 : -1;
      const sortOptions = { [sortFieldMap[sort]]: sortOrder };
      let geoSearch = false; // different query

      const query = {};

      // To apply search, both parameters 'q' and 'searchBy' should be defined
      if (q && searchBy) {
        switch (searchBy) {
          case 'name': {
            query.name = { $regex: q, $options: 'i' };
            break;
          }
          case 'date': {
            let date = new Date(q);
            if (!isNaN(date)) {
              query.timestamp = { $gte: date };
            } else {
              return res.status(400).json({ 
                success: false, 
                message: `'q' is not a valid ISO date string for searchBy=date`, 
                data: null 
              });
            }
            break;
          }
          case 'coordinates': {
            try {
              const coords = JSON.parse(q);
              if(!isValidCoordinates(coords)) {
                return res.status(400).json({
                  success: false,
                  message: `'q' must be a valid JSON array with two numbers: [longitude, latitude]`,
                  data: null
                });
              }
              const [lng, lat] = coords; // watch: GeoJSON uses [lng, lat]
              geoSearch = true;
              query.coords = {lng, lat};
            } catch (err) {
              return res.status(400).json({ 
                success: false, 
                message: `'q' must be a valid JSON array string for searchBy=coordinates`, 
                data: null });
            }
            break;
          }
        }
      }

      // Perform query
      let items = [];
      let total = 0;

      if(geoSearch) {
        const maxDistance = 500000; // 500km

        // Obtain location IDs paginated and ordered by distance
        const idPipeline = [
          {
            $geoNear: {
              near: { type: "Point", coordinates: [query.coords.lng, query.coords.lat] },
              distanceField: "dist.calculated",
              key: "coords",
              maxDistance,
              spherical: true
            }
          },
          { $skip: parsedOffset },
          { $limit: parsedLimit },
          { $project: { _id: 1 } } // only _id
        ];

        const idResults = await LocationModel.aggregate(idPipeline);
        const idArray = idResults.map(doc => doc._id);
        
        if (idArray.length > 0) {
          items = await LocationModel.find({ _id: { $in: idArray } });  
          // mantain order
          items = idArray.map(id => items.find(item => item._id.equals(id)));
        }
        
        const countPipeline = [
          {
            $geoNear: {
              near: { type: "Point", coordinates: [query.coords.lng, query.coords.lat] },
              distanceField: "dist.calculated",
              key: "coords",
              maxDistance,
              spherical: true
            }
          },
          { $count: "total" }
        ];
      
        const countResult = await LocationModel.aggregate(countPipeline);
        total = countResult.length > 0 ? countResult[0].total : 0;
      } else {
        items = await LocationModel.find(query)
        .sort(sortOptions)
        .skip(parsedOffset)
        .limit(parsedLimit);

        total = await LocationModel.countDocuments(query);
      }

      return res.status(200).json({
        success: true,
        message: 'Locations retrieved successfully',
        data: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          results: items
        }
      });

    } catch (err) {
      log.error('[LocationController.get()] Unexpected error!');
      next(err);
    }
  }

  // Accepts multipart/form-data only
  static async create(req, res, next) {

    // In case image is inserted and location insertion fails
    let imageId = null;

    try {
      // multipart/form-data
      if (!req.is('multipart/form-data')) {
        // Specify response object before thowing custom ValidationError
        res.status(400).json({
          success: false,
          message: 'Content-Type must be multipart/form-data',
          data: null
        });
        throw new Error('ValidationError');
      }
  
      const {
        name,
        address,
        description,
        tags,
        coordinates,
        imageUrl
      } = req.body;
  
      // Required fields
      if (!name || !coordinates) {
        res.status(400).json({
          success: false,
          message: 'Name and coordinates are required.',
          data: null
        });
        throw new Error('ValidationError');
      }
  
      // parse coordinates (type: JSON string "[lon, lat]")
      let parsedCoordinates;
      try {
        parsedCoordinates = JSON.parse(coordinates);
        if (!isValidCoordinates(parsedCoordinates)) {
          throw new Error('Invalid coordinates');
        }
      } catch (err) {
        res.status(400).json({
          success: false,
          message: 'Coordinates must be a JSON array [lon, lat] within valid geographic bounds.',
          data: null
        });
        throw new Error('ValidationError');
      }

      // Higher priority to imageFile
      if(req.file) {
        // Validate image
        const { mimetype, size, originalname } = req.file;

        // const mimeType =  mime.lookup(req.file.filename); 
        // Check mimetype
        if (!mimetype || !LocationController.allowedImageTypes.includes(mimetype.toLowerCase())) {
          res.status(400).json({
            success: false,
            message: `Unsupported image type: ${mimetype}. Must be one of: ${LocationController.allowedImageTypes.join(', ')}`,
            data: null
          });
          throw new Error('ValidationError');
        }

        // Check empty file
        if (size === 0) {
          res.status(400).json({
            success: false,
            message: `Empty file '${originalname}' is not allowed.`,
            data: null
          });
          throw new Error('ValidationError');
        }       

        // Insert in Mongo
        const imageDoc = new ImageModel({
          hosted: true,
          path: req.file.filename
        });

        await imageDoc.save();
        imageId = imageDoc._id;

      } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
        try {
          new URL(imageUrl);
          const imageDocUrl = new ImageModel({
            hosted: false,
            url: imageUrl
          });
          await imageDocUrl.save();
          imageId = imageDocUrl._id;
        } catch (e) {
          log.warn(`[LocationController.create()] Invalid URL for ${imageUrl}`);
        }
      }

      // tags
      let cleanTags = [];
      try {
        const parsedTags = JSON.parse(tags);
        if (Array.isArray(parsedTags) && parsedTags.every(t => typeof t === 'string')) {
          cleanTags = parsedTags;
        }
      } catch {
        // cleanTags = []
      }

      const location = new LocationModel({
        name,
        address,
        description,
        tags: cleanTags,
        coords: {
          type: 'Point',
          coordinates: parsedCoordinates
        },
        image: imageId
      });
  
      await location.save();
  
      return res.status(201).json({
        success: true,
        message: 'Location created successfully',
        data: location
      });
    } catch (err) {

      // Delete file
      if (req.file?.path) {
        try {
          await fsp.unlink(req.file.path);
        } catch (unlinkErr) {
          log.warn(`Could not delete file: ${req.file.path}. Error message: ${unlinkErr.message}`);
        }
      }

      // Delete imageDoc
      if(imageId) {
        try {
          await ImageModel.findByIdAndDelete(imageId);
        } catch (deleteErr) {
          log.warn(`Could not delete image document with _id=${imageId}`);
        }
      }

      // Expected error
      if(err.message==='ValidationError') {
        return res;
      } else {
        log.error('[LocationController.create()] Unexpected error!');
        next(err);
      }
    }
  }

}

module.exports = LocationController;