const request = require('supertest');

// App object
const app = require('../src/app.js');

// Database connection
const { connectToDatabase } = require('../src/models/mongodb/db.js');
const mongoose = require('mongoose');

// Dataset import
const Dataset = require('./Dataset.js');

// Test helpers
const { checkResponseSchema } = require('./utils/helpers.js');

// Connect to database before all tests
before(async function () {
  await connectToDatabase();
  await Dataset.load();
});

// Desconexión después de todos los tests
after(async function () {
  await mongoose.connection.close();
});

describe('GET /index', function () {
  it('should return a status 200', function (done) {
    request(app)
      .get('/index')
      .expect(200)  // Verifica que el estado es 200
      .end((err, res) => {
        if (err) return done(err);
        done();
      });
  });
});

// REST endpoints' tests
require('./locations/locations.create.test.js');
require('./locations/locations.get.test.js');
require('./reviews/reviews.create.test.js');
