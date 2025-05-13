/**
 * randomSeed.js
 * 
 * Generates random data only if db collection is empty
 *  
 */

// Require app configurations
require('../src/app.js');

const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');
const LocationModel = mongoose.model('Location');

// Generar fake data
const randomDateBetween = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const generateLocations = (count = 20) => {
  const locations = [];

  for (let i = 0; i < count; i++) {
    const latitude = faker.location.latitude();
    const longitude = faker.location.longitude();

    const locationTimestamp = randomDateBetween(new Date('2020-01-01'), new Date());

    const numReviews = Math.floor(Math.random() * 7); // 0 a 6 reviews
    const reviews = [];

    for (let j = 0; j < numReviews; j++) {
      const reviewRating = parseFloat((Math.random() * 5).toFixed(1));
      const createdOn = randomDateBetween(locationTimestamp, new Date());

      reviews.push({
        author: faker.person.fullName(),
        rating: reviewRating,
        reviewText: faker.lorem.sentence(),
        createdOn,
        coords: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        }
      });
    }

    const averageRating =
      reviews.length > 0
        ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
        : 0;

    locations.push({
      name: faker.location.city(),
      address: faker.location.streetAddress(),
      rating: averageRating,
      description: faker.lorem.sentences(2),
      tags: faker.helpers.arrayElements(['coffee', 'museum', 'bar', 'restaurant', 'shopping', 'library'], 2),
      timestamp: locationTimestamp,
      coords: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      reviews
    });
  }

  return locations;
};

(async () => {
  try {
    const count = await LocationModel.countDocuments({});
    if (count === 0) {
      const numLocations = 200;
      const data = generateLocations(numLocations); // Número de documentos a insertar
      await LocationModel.insertMany(data);
      log.info(`Seed data inserted (items: ${numLocations})`);
    } else {
      log.warn(`Data already exists (items: ${count}), skipping seeding`);
    }   
    process.exit(0);
  } catch (err) {
    log.error('Error inserting seed data:', err);
    process.exit(1);
  }
})();
