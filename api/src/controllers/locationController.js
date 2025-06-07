const fsp = require('fs/promises'); // async/await unlink
const mongoose = require('mongoose');
const LocationModel = mongoose.model('Location');
const { isValidCoordinates } = require('../utils/helpers.js');

const ImageController = require('./imageController.js');

class LocationController {

  static async getById(req, res, next) {
    try {

      const locationId = req.params.locationId;

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

      // delete image 
      if (location.image) {
        const deleted = await ImageController.deleteImage(location.image);
        if (!deleted) {
          log.warn(`[LocationController.deleteById()] Failed to delete associated image with ID: ${location.image}`);
        }
      }

      // delete location
      await location.deleteOne();

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
        try {
          imageId = await ImageController.createImage('file', req.file);
        } catch (err) {
          res.status(400).json({
            success: false,
            message: err.message || 'Error uploading image',
            data: null
          });
          throw new Error('ValidationError');
        }
      } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
        try {
          imageId = await ImageController.createImage('url', imageUrl);
        } catch (err) {
          log.warn(`[LocationController.create()] Could not save image from Url ${imageUrl}`);
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

      // Delete imageDoc
      if(imageId) {
        await ImageController.deleteImage(imageId);
      } else if (req.file?.path) { // delete file
        try {
          await fsp.unlink(req.file.path);
        } catch (unlinkErr) {
          log.warn(`Could not delete file: ${req.file.path}. Error message: ${unlinkErr.message}`);
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

  static async update(req, res, next) {
    let newImageId = null;

    try {
      if (!req.is('multipart/form-data')) {
        res.status(400).json({
          success: false,
          message: 'Content-Type must be multipart/form-data',
          data: null
        });
        throw new Error('ValidationError');
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
          message: 'Location not found',
          data: null
        });
      }

      const {
        name,
        address,
        description,
        tags,
        coordinates,
        imageUrl
      } = req.body;

      // Si hay coordinates, validarlas
      let parsedCoordinates;
      if (coordinates) {
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
        location.coords = {
          type: 'Point',
          coordinates: parsedCoordinates
        };
      }

      // Imagen nueva: se elimina la anterior si existía
      if (req.file) {
        try {
          newImageId = await ImageController.createImage('file', req.file);
          if (location.image) await ImageController.deleteImage(location.image);
          location.image = newImageId;
        } catch (err) {
          res.status(400).json({
            success: false,
            message: err.message || 'Error uploading image',
            data: null
          });
          throw new Error('ValidationError');
        }
      } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
        try {
          newImageId = await ImageController.createImage('url', imageUrl);
          if (location.image) await ImageController.deleteImage(location.image);
          location.image = newImageId;
        } catch (err) {
          log.warn(`[LocationController.update()] Could not save image from Url ${imageUrl}`);
        }
      }

      // Tags
      if (tags) {
        try {
          const parsedTags = JSON.parse(tags);
          if (Array.isArray(parsedTags) && parsedTags.every(t => typeof t === 'string')) {
            location.tags = parsedTags;
          }
        } catch {
          location.tags = [];
        }
      }

      // Otros campos opcionales
      if (name) location.name = name;
      if (address) location.address = address;
      if (description) location.description = description;

      await location.save();

      return res.status(200).json({
        success: true,
        message: 'Location updated successfully',
        data: location
      });

    } catch (err) {
      if (newImageId) {
        await ImageController.deleteImage(newImageId);
      } else if (req.file?.path) {
        try {
          await fsp.unlink(req.file.path);
        } catch (unlinkErr) {
          log.warn(`Could not delete file: ${req.file.path}. Error message: ${unlinkErr.message}`);
        }
      }

      if (err.message === 'ValidationError') return res;
      log.error('[LocationController.update()] Unexpected error!');
      next(err);
    }
  }

}

module.exports = LocationController;