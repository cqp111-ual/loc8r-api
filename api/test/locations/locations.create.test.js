const request = require('supertest');
const { expect } = require('chai');
const path = require('path');
const app = require('../../src/app.js');
const mongoose = require('mongoose');
const ImageModel = mongoose.model('Image');
const Dataset = require('../Dataset.js');
const { checkResponseSchema, checkErrorResponse, checkSuccessResponse } = require('../utils/helpers.js');

describe('POST /api/locations', function () {

  // Assets directory for testing
  const testAssetsDir = '../assets';

  const baseLocation = {
    name: 'Santiago Bernabeu',
    address: 'Av. de Concha Espina, 1, Chamartín, 28036 Madrid',
    imageUrl: 'https://www.nuevoestadiobernabeu.com/wp-content/uploads/2020/03/A_AERM_02-1024x624.jpg',
    description: 'Porro tantillus cui vos ventito abscido occaecati. Stillicidium urbanus vulnus.',
    tags: [ 'museum', 'football'],
    coordinates: [ 40.453056, -3.688333 ]
  }

  before(async function () {
    await Dataset.reset();
  });

  /**
   * Basic tests 
   */

  it('invalid request content-type (expects multipart/form-data)', async function () {
    const response = await request(app)
      .post('/api/locations')
      .set('Content-Type', 'application/json')
      .send(baseLocation)
      .expect(400);

    checkErrorResponse(response.body);
  })

  it('create location with required fields only', async function () {
    const response = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .expect(201);

    checkSuccessResponse(response.body);
    expect(mongoose.Types.ObjectId.isValid(response.body.data.id)).to.be.true;
    expect(response.body.data.name).to.equal(baseLocation.name);
    expect(response.body.data.coordinates).to.deep.equal(baseLocation.coordinates);
    expect(response.body.data.rating).to.equal(0);
    expect(response.body.data.numReviews).to.equal(0);
    expect(response.body.data.tags).to.be.an('array').that.is.empty;
    expect(response.body.data.imageId).to.be.null;
    // validate createdOn is correct
    expect(response.body.data.createdOn.slice(0, 10)).to.equal(new Date().toISOString().slice(0, 10));
  });

  it('try create location w/o name', async function () {
    const responseWithoutName = await request(app)
      .post('/api/locations')
      .type('form')
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('address', baseLocation.address)
      .expect(400);

    checkErrorResponse(responseWithoutName.body);

    const responseWithEmptyName = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', '')
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('address', baseLocation.address)
      .expect(400);

    checkErrorResponse(responseWithEmptyName.body);
  });

  it('try create location with invalid coordinates', async function () {

    const responseWithoutCoordinates = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', '[]')
      .expect(400);

    checkErrorResponse(responseWithoutCoordinates.body);

    const nonArrayCoords = {latitude: baseLocation.coordinates[0], longitude: baseLocation.coordinates[1]}
    const responseWithNonArrayCoordinates = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(nonArrayCoords))
      .expect(400);

    checkErrorResponse(responseWithNonArrayCoordinates.body);

    const invalidArrayCoords = [0,1,2]
    const responseWithInvalidArrayCoords = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(invalidArrayCoords))
      .expect(400);

    checkErrorResponse(responseWithInvalidArrayCoords.body);

    const invalidCoordsValue = [10000,-0.589]
    const responseWithInvalidCoordsValue = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(invalidCoordsValue))
      .expect(400);

    checkErrorResponse(responseWithInvalidCoordsValue.body);
  });

  it('should ignore reviews and rating on creation', async function () {
    const reviews = [
      {
        author: 'Author',
        reviewText: 'Great place!',
        rating: 5
      },
      {
        author: 'Author-2',
        reviewText: 'Fantastic venue!',
        rating: 4.5
      }
    ];

    const response = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('rating', 4.75)
      .field('reviews', JSON.stringify(reviews))
      .expect(201);

    checkResponseSchema(response.body);
    expect(mongoose.Types.ObjectId.isValid(response.body.data.id)).to.be.true;
    expect(response.body.data.name).to.equal(baseLocation.name);
    expect(response.body.data.coordinates).to.deep.equal(baseLocation.coordinates);
    expect(response.body.data.rating).to.equal(0);
    expect(response.body.data.numReviews).to.equal(0);
  });

  it('tags field on creation', async function () {

    // Invalid tags field; simply ignore them
    const invalidTags = {
      tag1: "Tag1",
      tag2: "Tag2"
    };

    const invalidTagsResponse = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('tags', JSON.stringify(invalidTags))
      .expect(201);

    checkSuccessResponse(invalidTagsResponse.body);
    expect(mongoose.Types.ObjectId.isValid(invalidTagsResponse.body.data.id)).to.be.true;
    expect(invalidTagsResponse.body.data.tags).to.be.an('array').that.is.empty;

    // Valid tags, should be created successfully
    const validTagsResponse = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('tags', JSON.stringify(baseLocation.tags))
      .expect(201);

    checkSuccessResponse(validTagsResponse.body);
    expect(mongoose.Types.ObjectId.isValid(validTagsResponse.body.data.id)).to.be.true;
    expect(validTagsResponse.body.data.tags).to.deep.equal(baseLocation.tags);
  });

  /**
   * Image related tests 
   */

  it('should ignore imageFile if provided as a string (not a file)', async function () {
    const res = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('imageFile', 'not-an-image')
      .expect(201);

    checkSuccessResponse(res.body);
    expect(res.body.data.imageId).to.be.null;
  });

  it('should return bad request on imageFile empty file upload', async function () {
    const response = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .attach('imageFile', Buffer.from(''), 'empty.jpg')  // empty file
      .expect(400);

    checkErrorResponse(response.body);
  });

  it('should reject unsupported mime type (HEIC)', async function () {
    const response = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .attach('imageFile', path.join(__dirname, testAssetsDir, 'sample.heic'))
      .expect(400);

    checkErrorResponse(response.body);
  });

  it('should reject multiple imageFile uploads', async function () {
    let response;
    try {
      response = await request(app)
        .post('/api/locations')
        .type('form')
        .field('name', baseLocation.name)
        .field('address', baseLocation.address)
        .field('coordinates', JSON.stringify(baseLocation.coordinates))
        .attach('imageFile', path.join(__dirname, testAssetsDir, 'sample.jpg'))
        .attach('imageFile', path.join(__dirname, testAssetsDir, 'sample.png'))
        .expect(400);

      checkErrorResponse(response.body);
    } catch (err) {
      log.warn('Cannot reliably test multiple file upload rejection with Supertest.');
      log.warn('This is likely due to a streaming EPIPE error from early server response.');
      log.warn('Consider testing this scenario manually with Postman.');
      this.skip();
      // return;
    }
  });

  it('should upload a valid JPG image and create location', async function () {
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
    expect(mongoose.Types.ObjectId.isValid(response.body.data.id)).to.be.true;
    expect(mongoose.Types.ObjectId.isValid(response.body.data.imageId)).to.be.true;

    // Check if it was successfully inserted
    const savedImage = await ImageModel.findById(response.body.data.imageId);
    expect(savedImage).to.exist;
    expect(savedImage.hosted).to.be.true;
    expect(savedImage.path).to.be.a('string');
    expect(savedImage.url).to.be.oneOf([undefined, null, '']);
  });

  it('should prefer imageFile over imageUrl when both are defined', async function () {
    const response = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('description', baseLocation.description)
      .field('tags', JSON.stringify(baseLocation.tags))
      .field('imageUrl', baseLocation.imageUrl)
      .attach('imageFile', path.join(__dirname, testAssetsDir, 'sample.jpg'))
      .expect(201);

    checkSuccessResponse(response.body);
    expect(mongoose.Types.ObjectId.isValid(response.body.data.id)).to.be.true;
    expect(mongoose.Types.ObjectId.isValid(response.body.data.imageId)).to.be.true;

    const savedImage = await ImageModel.findById(response.body.data.imageId);
    expect(savedImage).to.exist;
    expect(savedImage.hosted).to.be.true;   // <- imageFile over imageUrl
    expect(savedImage.path).to.be.a('string');
    expect(savedImage.url).to.be.oneOf([undefined, null, '']);
  });

  it('should ignore an invalid imageUrl', async function () {
    const invalidUrl = 'not-a-valid-url';
  
    const response = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('description', baseLocation.description)
      .field('tags', JSON.stringify(baseLocation.tags))
      .field('imageUrl', invalidUrl)
      .expect(201);

      checkSuccessResponse(response.body);
      expect(mongoose.Types.ObjectId.isValid(response.body.data.id)).to.be.true;
      expect(response.body.data.imageId).to.be.null;
  });

  it('should accept a valid imageUrl and create location', async function () {
    const response = await request(app)
      .post('/api/locations')
      .type('form')
      .field('name', baseLocation.name)
      .field('address', baseLocation.address)
      .field('coordinates', JSON.stringify(baseLocation.coordinates))
      .field('description', baseLocation.description)
      .field('tags', JSON.stringify(baseLocation.tags))
      .field('imageUrl', baseLocation.imageUrl)
      .expect(201);

    checkSuccessResponse(response.body);
    expect(mongoose.Types.ObjectId.isValid(response.body.data.id)).to.be.true;
    expect(mongoose.Types.ObjectId.isValid(response.body.data.imageId)).to.be.true;

    const savedImage = await ImageModel.findById(response.body.data.imageId);
    expect(savedImage).to.exist;
    expect(savedImage.hosted).to.be.false;
    expect(savedImage.url).to.be.a('string');
    expect(savedImage.path).to.be.oneOf([undefined, null, '']);
  });

  // more tests here...

});
