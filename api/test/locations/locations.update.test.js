const request = require('supertest');
const { expect } = require('chai');
const path = require('path');
const app = require('../../src/app.js');
const mongoose = require('mongoose');
const Dataset = require('../Dataset.js');
const ImageModel = mongoose.model('Image');
const { checkErrorResponse, checkSuccessResponse } = require('../utils/helpers.js');

describe('PUT /api/locations/:id', function () {
  const testAssetsDir = '../assets';

  let locationId;

  const baseLocation = {
    name: 'Santiago Bernabeu',
    address: 'Av. de Concha Espina, 1, Chamartín, 28036 Madrid',
    coordinates: [40.453056, -3.688333],
    tags: ['football', 'stadium']
  };

  before(async function () {
    await Dataset.reset();

    const res = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('coordinates', JSON.stringify(baseLocation.coordinates));

    locationId = res.body.data.id;
  });

  it('should return 400 for invalid content-type (expects multipart/form-data)', async function () {
    const res = await request(app)
      .put(`/api/locations/${locationId}`)
      .set('Content-Type', 'application/json')
      .send({ name: 'Updated Name' })
      .expect(400);

    checkErrorResponse(res.body);
  });

  it('should update name and tags', async function () {
    const updatedName = 'Nuevo Bernabeu';
    const updatedTags = ['updated', 'iconic'];

    const res = await request(app)
      .put(`/api/locations/${locationId}`)
      .type('form')
      .field('name', updatedName)
      .field('tags', JSON.stringify(updatedTags))
      .expect(200);
    
    checkSuccessResponse(res.body);
    expect(res.body.data.name).to.equal(updatedName);
    expect(res.body.data.tags).to.deep.equal(updatedTags);
  });

  it('should reject invalid coordinates', async function () {
    const invalidCoords = JSON.stringify([123456, 2, 3]);

    const res = await request(app)
      .put(`/api/locations/${locationId}`)
      .type('form')
      .field('coordinates', invalidCoords)
      .expect(400);

    checkErrorResponse(res.body);
  });

  it('should upload new image and update location imageId', async function () {
    const res = await request(app)
      .put(`/api/locations/${locationId}`)
      .type('form')
      .attach('imageFile', path.join(__dirname, testAssetsDir, 'sample.jpg'))
      .expect(200);

    checkSuccessResponse(res.body);
    expect(mongoose.Types.ObjectId.isValid(res.body.data.imageId)).to.be.true;

    const image = await ImageModel.findById(res.body.data.imageId);
    expect(image).to.exist;
    expect(image.hosted).to.be.true;
  });

  it('should return 404 for non-existent location', async function () {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/api/locations/${fakeId}`)
      .type('form')
      .field('name', 'Should Fail')
      .expect(404);

    checkErrorResponse(res.body);
  });
});
