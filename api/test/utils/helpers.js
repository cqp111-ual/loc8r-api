const { expect } = require('chai');

function checkResponseSchema(responseBody) {
  expect(responseBody).to.have.property('success');
  expect(responseBody).to.have.property('message');
  expect(responseBody).to.have.property('data');
}

function checkErrorResponse(responseBody) {
  checkResponseSchema(responseBody);
  expect(responseBody.success).to.be.false;
  expect(responseBody.data).to.be.null;
}

function checkSuccessResponse(responseBody) {
  checkResponseSchema(responseBody);
  expect(responseBody.success).to.be.true;
  expect(responseBody.data).to.be.not.null;
}

function checkLocationSchemaJSON(location) {
  const expectedKeys = [
    'name',
    'address',
    'description',
    'rating',
    'tags',
    'numReviews',
    'coordinates',
    'id',
    'createdOn',
    'imageId'
  ];

  // Check that location ONLY contains expected keys
  expect(Object.keys(location)).to.have.members(expectedKeys);
  expect(Object.keys(location)).to.have.lengthOf(expectedKeys.length);

  // Validate data types
  expect(location).to.have.property('name').that.is.a('string');
  expect(location).to.have.property('rating').that.is.a('number');
  expect(location).to.have.property('tags').that.is.an('array');
  expect(location).to.have.property('numReviews').that.is.a('number');
  expect(location).to.have.property('coordinates').that.is.an('array').with.lengthOf(2);
  expect(location).to.have.property('id').that.is.a('string');
  expect(location).to.have.property('createdOn').that.is.a('string');
  expect(location).to.have.property('imageId');
}

function checkReviewSchemaJSON(review) {
  const expectedKeys = [
    'id',
    'author',
    'reviewText',
    'rating',
    'createdOn',
    'coordinates'
  ];

  // Check that review ONLY contains expected keys
  expect(Object.keys(review)).to.have.members(expectedKeys);
  expect(Object.keys(review)).to.have.lengthOf(expectedKeys.length);

  // Validate data types
  expect(review).to.have.property('author').that.is.a('string');
  expect(review).to.have.property('rating').that.is.a('number');
  expect(review).to.have.property('coordinates').that.is.an('array').with.lengthOf(2);
  expect(review).to.have.property('id').that.is.a('string');
  expect(review).to.have.property('createdOn').that.is.a('string');
}


module.exports = {
  checkResponseSchema,
  checkErrorResponse,
  checkSuccessResponse,
  checkLocationSchemaJSON,
  checkReviewSchemaJSON
};
