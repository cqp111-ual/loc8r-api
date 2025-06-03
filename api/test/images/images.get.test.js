const request = require('supertest');
const { expect } = require('chai');
const path = require('path');
const mongoose = require('mongoose');
const app = require('../../src/app.js');
const Dataset = require('../Dataset.js');
const { checkErrorResponse, checkSuccessResponse } = require('../utils/helpers.js');

// Get image by id
describe('GET /api/locations/image:imageId', function () {

  // Assets directory for testing
  const testAssetsDir = '../assets';

  let locationFileId = null;
  let imageFileId = null;

  let locationUrlId = null;
  let imageUrlId = null;

  before(async function () {
    await Dataset.reset();

    const baseLocation = {
      name: 'Santiago Bernabeu',
      address: 'Av. de Concha Espina, 1, Chamartín, 28036 Madrid',
      imageUrl: 'https://www.nuevoestadiobernabeu.com/wp-content/uploads/2020/03/A_AERM_02-1024x624.jpg',
      description: 'Porro tantillus cui vos ventito abscido occaecati. Stillicidium urbanus vulnus.',
      tags: [ 'museum', 'football'],
      coordinates: [ 40.453056, -3.688333 ]
    }

    // Create a location with image file
    const responseLocationFile = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('description', baseLocation.description)
      .field('tags', JSON.stringify(baseLocation.tags))
      .attach('imageFile', path.join(__dirname, testAssetsDir, 'sample.jpg'))
      .expect(201);

    checkSuccessResponse(responseLocationFile.body);
    locationFileId = responseLocationFile.body.data.id;
    imageFileId = responseLocationFile.body.data.imageId;

    // Create location with image url
    const responseLocationUrl = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('description', baseLocation.description)
      .field('tags', JSON.stringify(baseLocation.tags))
      .field('imageUrl', baseLocation.imageUrl)
      .expect(201);

    checkSuccessResponse(responseLocationUrl.body);
    locationUrlId = responseLocationUrl.body.data.id;
    imageUrlId = responseLocationUrl.body.data.imageId;

  });

  /**
   * Basic tests 
   */
  it('should return a valid image from file upload', async function () {
    const response = await request(app)
      .get(`/api/locations/image/${imageFileId}`)
      .expect(200);

    expect(response.headers['content-type']).to.match(/^image\//);
  });

  it('should return a valid image from imageUrl', async function () {
    const response = await request(app)
      .get(`/api/locations/image/${imageUrlId}`)
      .expect(200);

    expect(response.headers['content-type']).to.match(/^image\//);
  });


  it('try invalid image id', async function () {

    // Non existing location
    const existingIds = [imageFileId, imageUrlId];

    let fakeImageId;
    do {
      fakeImageId = new mongoose.Types.ObjectId().toString();
    } while (existingIds.includes(fakeImageId));

    const res01 = await request(app)
      .get(`/api/locations/image/${fakeImageId}`)
      .expect(404);

    checkErrorResponse(res01.body);

    // Invalid location id
    const invalidImageId = 'abcd'
    const res02 = await request(app)
      .get(`/api/locations/image/${invalidImageId}`)
      .expect(404);

    checkErrorResponse(res02.body);
  });
});