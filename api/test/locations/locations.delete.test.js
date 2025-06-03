const request = require('supertest');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const app = require('../../src/app.js');
const { uploadsDir } = require('../../src/config/config.js');
const Dataset = require('../Dataset.js');
const ImageModel = mongoose.model('Image');
const { checkErrorResponse, checkSuccessResponse, checkLocationSchemaJSON } = require('../utils/helpers.js');

// Get by id
describe('DELETE /api/locations/:locationId', function () {

  // Assets directory for testing
  const testAssetsDir = '../assets';

  let createdLocationId = null;
  let createdImageId = null;
  let imagePath = null;

  before(async function () {
    await Dataset.reset();

    const baseLocation = {
      name: 'Santiago Bernabeu',
      address: 'Av. de Concha Espina, 1, Chamartín, 28036 Madrid',
      description: 'Porro tantillus cui vos ventito abscido occaecati. Stillicidium urbanus vulnus.',
      tags: [ 'museum', 'football'],
      coordinates: [ 40.453056, -3.688333 ]
    }

    // insert new location
    const response = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('description', baseLocation.description)
      .field('tags', JSON.stringify(baseLocation.tags))
      .attach('imageFile', path.join(__dirname, testAssetsDir, 'sample.jpg'))
      .expect(201);

    checkSuccessResponse(response.body);
    createdLocationId = response.body.data.id;
    createdImageId = response.body.data.imageId;

    const savedImage = await ImageModel.findById(createdImageId);
    expect(savedImage).to.exist;
    imagePath = path.join(uploadsDir, savedImage.path);
    console.log(imagePath);
  });

  /**
   * Basic tests 
   */

  it('try invalid location id', async function () {

    // Non existing location
    const existingIds = Dataset.getData().map(item => item._id.toString());
    existingIds.push(createdLocationId);

    let fakeLocationId;
    do {
      fakeLocationId = new mongoose.Types.ObjectId().toString();
    } while (existingIds.includes(fakeLocationId));

    const res01 = await request(app)
      .delete(`/api/locations/${fakeLocationId}`)
      .expect(404);

    checkErrorResponse(res01.body);

    // Invalid location id
    const invalidLocationId = 'abcd'
    const res02 = await request(app)
      .delete(`/api/locations/${invalidLocationId}`)
      .expect(404);

    checkErrorResponse(res02.body);
  });

  it('should delete the location and its associated image', async function () {
    // Try get location before deleting it
    await request(app)
      .get(`/api/locations/${createdLocationId}`)
      .expect(200);

    // Try get location image before deleting it
    await request(app)
      .get(`/api/locations/image/${createdImageId}`)
      .expect(200);

    const existsBefore = fs.existsSync(imagePath);
    expect(existsBefore).to.be.true;    

    // Delete location
    await request(app)
      .delete(`/api/locations/${createdLocationId}`)
      .expect(204);

    // Try get location after deleting it
    await request(app)
      .get(`/api/locations/${createdLocationId}`)
      .expect(404);

    // Try get location image before deleting it
    await request(app)
      .get(`/api/locations/image/${createdImageId}`)
      .expect(404);

    // Image should no longer exist on uploads dir
    const existsAfter = fs.existsSync(imagePath);
    expect(existsAfter).to.be.false;
  });

});