const { request } = require('undici');
const { foursquareApiUrl, foursquareApiKey } = require('../config/config.js');
const mongoose = require('mongoose');
const LocationModel = mongoose.model('Location'); 
const { isValidCoordinates } = require('../utils/helpers.js');
const ImageController = require('./imageController.js');

// https://docs.foursquare.com/developer/reference/place-search
const placeSearchUrl = '/v3/places/search';

// https://docs.foursquare.com/developer/reference/place-details
// https://docs.foursquare.com/developer/reference/place-photos
const placeDetailsUrl = '/v3/places';

const fsq_fields = 'fsq_id,name,geocodes,location,categories,description,rating';

function isValidRadius(r) {
  const radius = parseInt(r);
  return !isNaN(radius) && radius >= 0 && radius <= 100000;
}

function isValidSortBy(value) {
  return ['relevance', 'rating', 'distance'].includes(value);
}

// De esta parte NO se van a hacer test, puesto que cada peticion a la API cuesta $$$$$
class FoursquareController {

  static async getPlaceImage(fsq_id) {
    try {
      const photoRes = await request(`${foursquareApiUrl}${placeDetailsUrl}/${fsq_id}/photos?limit=1`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': foursquareApiKey
        }
      });

      if (photoRes.statusCode === 200) {
        const photoBody = await photoRes.body.json();
        if (Array.isArray(photoBody) && photoBody.length > 0) {
          const photo = photoBody[0];
          return `${photo.prefix}original${photo.suffix}`;
        }
      }
    } catch (e) {
      log.warn(`[FoursquareController.getPlaceImage()] No photo for ${fsq_id}:`, e.message);
    }

    return null; // en caso de error o sin imagen
  }

  static async get(req, res, next) {
    try {
      const { q, coordinates, radius, sortBy } = req.query;

      const params = new URLSearchParams();

      // Campos deseados en la respuesta
      params.append('fields', fsq_fields);
      params.append('limit', 50);

      if (q && q.trim()) {
        params.append('query', q.trim());
      }

      // Procesar coordinates como string JSON (ej: "[37.18141,-1.82252]")
      if (coordinates) {
        let parsedCoords;
        try {
          parsedCoords = JSON.parse(coordinates);
          if (isValidCoordinates(parsedCoords)) {
            params.append('ll', `${parsedCoords[0]},${parsedCoords[1]}`);
          }
        } catch (err) {
          log.warn('[FoursquareController.get()] Invalid coordinates param, skipping.')
        }
      }

      if (radius && isValidRadius(radius)) {
        params.append('radius', radius);
      } else {
        params.append('radius', 10000); // default
      }

      if (sortBy && isValidSortBy(sortBy)) {
        params.append('sort', sortBy);
      }

      const url = `${foursquareApiUrl}${placeSearchUrl}?${params.toString()}`;     
      const response = await request(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': foursquareApiKey
        }
      });
      
      if (response.statusCode !== 200) {
        return res.status(500).json({ 
          success: false, 
          message: `Error fetching FourSquare API.`, 
          data: null 
        });
      }

      const responseBody = await response.body.json();

      const transformedItems = await Promise.all(responseBody.results.map(async item => {

        // Muy caro, mejor no usar
        // const imageUrl = await FoursquareController.getPlaceImage(item.fsq_id);
        const imageUrl = null;

        const location = {
          id: item.fsq_id,
          name: item.name,
          rating: (item.rating ?? 0) / 2.0,
          description: item.description || '',
          tags: item.categories.map(category => category.short_name),
          address: item.location.formatted_address,
          coordinates: [
            item.geocodes.main.latitude,
            item.geocodes.main.longitude
          ],
          imageUrl
        };

        return location;
      }));

      res.status(200).json({
        success: true,
        message: 'Foursquare places retrieved successfully',
        data: {
          results: transformedItems
        }
      });

    } catch (err) {
      log.error('[FoursquareController.get()] Unexpected error');
      res.status(500).json({
        success: false,
        message: 'Error fetching FourSquare API.',
        data: null
      });
    }
  }
  
  static async import(req, res, next) {
    try {
      const { fsq_ids } = req.body;

      if (!Array.isArray(fsq_ids) || fsq_ids.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'fsq_ids must be a non-empty array',
          data: null
        });
      }

      if (fsq_ids.length > 10) {
        return res.status(400).json({ 
          success: false, 
          message: 'Maximum of 10 fsq_ids allowed per request',
          data: null
         });
      }

      const inserted = [];
      const failed = [];

      for (const fsq_id of fsq_ids) {
        let imageId = null;

        try {
          const params = new URLSearchParams();
          params.append('fields', fsq_fields);
          const detailsRes = await request(`${foursquareApiUrl}${placeDetailsUrl}/${fsq_id}?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': foursquareApiKey
            }
          });

          if (detailsRes.statusCode !== 200) throw new Error(`Failed to fetch details for ${fsq_id}`);
          const details = await detailsRes.body.json();

          // 2. Get image URL (si existe)
          const imageUrl = await FoursquareController.getPlaceImage(fsq_id);

          // 3. Insert image separately (if available)
          if (imageUrl) {
            imageId = await ImageController.createImage('url', imageUrl);
          }

          // 4. Insert location with imageId if exists
          const location = new LocationModel({
            name: details.name,
            description: details.description || '',
            tags: details.categories.map(c => c.short_name),
            address: details.location.formatted_address,
            coords: {
              type: 'Point',
              coordinates: [
                details.geocodes.main.latitude,
                details.geocodes.main.longitude
              ]
            },
            image: imageId
          });

          await location.save();
          inserted.push(fsq_id);

        } catch (err) {
          log.warn(`[FoursquareController.import()] Failed for ${fsq_id}: ${err.message}`);
          failed.push(fsq_id);

          // si la imagen se inserto pero location fallo
          if (imageId) {
            await ImageController.deleteImage(imageId);
          }
        }
      }

      // HTTP Response (207 multistatus)
      const statusCode = failed.length === 0 ? 201 : (inserted.length > 0 ? 207 : 500);

      return res.status(statusCode).json({
        success: failed.length === 0,
        message: failed.length === 0
          ? 'All locations imported successfully.'
          : 'Some locations could not be imported.',
        data:{
          inserted,
          failed
        }
      });

    } catch (err) {
      log.error('[FoursquareController.import()] Unexpected error:', err);
      next(err);
    }
  }
}

module.exports = FoursquareController;