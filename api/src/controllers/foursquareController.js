const { request } = require('undici');
const { foursquareApiUrl, foursquareApiKey } = require('../config/config.js');
const mongoose = require('mongoose');
const LocationModel = mongoose.model('Location'); 

// https://docs.foursquare.com/developer/reference/place-search
const placeSearchUrl = '/v3/places/search';

// https://docs.foursquare.com/developer/reference/place-details
// https://docs.foursquare.com/developer/reference/place-photos
const placeDetailsUrl = '/v3/places';

class FoursquareController {

  static async get(req, res, next) {
    try {
      const fields='fsq_id,name,geocodes,location,categories,description,photos'
      const url = `${foursquareApiUrl}${placeSearchUrl}?fields=${encodeURIComponent(fields)}`;
      const response = await request(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': foursquareApiKey
        }
      });
      
      if (response.statusCode !== 200) {
        return res.status(500).json({ success: false, message: `Error fetching ${url}: Expected statusCode=200, received statusCode=${response.statusCode}.`, data: null });
      }

      const responseBody = await response.body.json();

      const transformedItems = responseBody.results.map(item => {
        const location = new LocationModel({
          _id: item.fsq_id, //map fsq_id to object id
          name: item.name,
          description: item.description || '',
          tags: item.categories.map(category => category.short_name),
          address: item.location.formatted_address,
          coords: {
            coordinates: [
              item.geocodes.main.latitude,
              item.geocodes.main.longitude
            ]
          }
        });

        return location;
      });

      console.log('Transformed Items:', transformedItems);

      res.status(200).json({
        success: true,
        message: 'Foursquare places retrieved successfully',
        data: transformedItems
      });

    } catch (err) {
      // Let error handler manage error
      log.error('[FoursquareController.get()] Unexpected error');
      throw err;
    }
  }

  static async getById(req, res, next) {
    try {
      const locationId = req.params.locationId;

      // if (!mongoose.Types.ObjectId.isValid(locationid)) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Invalid location ID format",
      //     data: null
      //   });
      // }

      const fields='fsq_id,name,geocodes,location,categories,description,photos'
      const url = `${foursquareApiUrl}${placeDetailsUrl}/${locationId}?fields=${encodeURIComponent(fields)}`;
      console.log(url);
      const response = await request(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': foursquareApiKey
        }
      });
      
      if (response.statusCode !== 200) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
          data: null
        });      
      }

      const responseBody = await response.body.json();

      const location = new LocationModel({
        id: responseBody.fsq_id,
        name: responseBody.name,
        description: responseBody.description || '',
        tags: responseBody.categories.map(category => category.short_name),
        address: responseBody.location.formatted_address,
        coords: {
          coordinates: [
            responseBody.geocodes.main.latitude,
            responseBody.geocodes.main.longitude
          ]
        }
      });

      res.status(200).json({
        success: true,
        message: 'Foursquare location retrieved successfully',
        data: location
      });

    } catch (err) {
      // Let error handler manage error
      log.error('[FoursquareController.getById()] Unexpected error');
      throw err;
    }
  }
}


module.exports = FoursquareController;


// const get = async (req, res) => {
//   try {
//     const locations = await LocationModel.find({});
//     if (!locations || locations.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Locations not found",
//         data: null 
//       });
//     }
//     return res.status(200).json({
//       success: true,
//       message: "Locations retrieved successfully",
//       data: locations
//     });
//   } catch (err) {
//       return res.status(500).json({
//         success: false, 
//         message: "Error retrieving locations", 
//         data: err.message 
//       });
//   }
// };

// const locationsReadOne = async (req, res) => {
//   try {
//     const locationid = req.params.locationid;

//     if (!mongoose.Types.ObjectId.isValid(locationid)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid location ID format",
//         data: null
//       });
//     }

//     const location = await LocationModel.findById(locationid);
//     if (!location) {
//       return res.status(404).json({
//         success: false,
//         message: "Location not found",
//         data: null
//        });
//     }
//     return res.status(200).json({
//       success: true,
//       message: "Location found",
//       data: location
//     });
//   } catch (err) {
//       return res.status(500).json({
//         success: false, 
//         message: "Error retrieving location", 
//         data: err.message 
//       });
//   }
// };

// const locationsCreate = async (req, res) => {
//   try {
//     const { name, address, facilities, distance, coords, openingTimes, reviews } = req.body;

//     // Evitamos que se creen locations con reviews desde el inicio
//     if (reviews) {
//       return res.status(400).json({
//         success: false,
//         message: "Reviews cannot be added during location creation",
//         data: null
//       });
//     }

//     const location = new LocationModel({
//       name,
//       address,
//       facilities,
//       distance,
//       coords: {
//         type: 'Point',
//         coordinates: coords
//       },
//       openingTimes
//     });

//     const savedLocation = await location.save(); // Aquí se dispara la validación automática

//     return res.status(201).json({
//       success: true,
//       message: "Location created successfully",
//       data: savedLocation
//     });

//   } catch (err) {
//     // console.error(err);

//     if (err.name === 'ValidationError') {
//       return res.status(400).json({
//         success: false,
//         message: "Validation error",
//         data: err
//       });
//     }

//     // console.error("Error creating location:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       data: err
//     });
//   }
// };

// const locationsDeleteOne = async (req, res) => {
//   try {
//     const locationid = req.params.locationid;

//     if (!mongoose.Types.ObjectId.isValid(locationid)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid location ID format",
//         data: null
//       });
//     }

//     const location = await LocationModel.findByIdAndDelete(locationid);
//     if (!location) {
//       return res.status(404).json({
//         success: false,
//         message: "Location not found",
//         data: null
//       });
//     }
//     return res.status(204).send();
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Error deleting location",
//       data: err.message
//     });
//   }
// };

// const locationsUpdateOne = async (req, res) => {
//   try {
//     const locationid = req.params.locationid;

//     if (!mongoose.Types.ObjectId.isValid(locationid)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid location ID format",
//         data: null
//       });
//     }

//     const location = await LocationModel.findById(locationid);
//     if (!location) {
//       return res.status(404).json({
//         success: false,
//         message: "Location not found",
//         data: null
//       });
//     }

//     // Actualizar los campos de la ubicación
//     location.name = req.body.name || location.name;
//     location.address = req.body.address || location.address;
//     location.facilities = req.body.facilities || location.facilities;
//     location.coords = req.body.coords || location.coords;
//     location.openingTimes = req.body.openingTimes || location.openingTimes;
//     location.reviews = req.body.reviews || location.reviews;

//     const updatedLocation = await location.save();

//     return res.status(200).json({
//       success: true,
//       message: "Location updated successfully",
//       data: updatedLocation
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Error updating location",
//       data: err.message
//     });
//   }
// };

// module.exports = {
//   locationsReadAll,
//   locationsReadOne,
//   locationsCreate,
//   locationsDeleteOne,
//   locationsUpdateOne
// };