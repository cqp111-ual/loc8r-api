const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app.js');
const mongoose = require('mongoose');
const Dataset = require('../Dataset.js');
const { checkResponseSchema, checkErrorResponse, checkSuccessResponse, checkLocationSchemaJSON } = require('../utils/helpers.js');

describe('POST /api/locations/:locationId/reviews', function () {

  const baseReview = {
    author: "James Johnson",
    rating: 3.5,
    reviewText: "Nice venue. Such a familiar place!",
    coordinates: [101.89, 0.5896]
  }

  let baseLocation;
  let locationId;

  before(async function () {
    await Dataset.reset();
    baseLocation = Dataset.getData()[0];
    locationId = baseLocation._id;

  });

  /**
   * Basic tests 
   */

  it('invalid request content-type (expects application/json)', async function () {
    const response = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .type('form')
      .field('author', baseReview.author)
      .field('rating', baseReview.rating)
      .field('reviewText', baseReview.reviewText)
      .field('coordinates', JSON.stringify(baseReview.coordinates))
      .expect(400);

    checkErrorResponse(response.body);
  })

  it('create valid review', async function () {
    const response = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(baseReview)
      .expect(201);

    checkSuccessResponse(response.body);

    const updatedLocation = response.body.data;
    checkLocationSchemaJSON(updatedLocation);

    const baseLocationReviews = baseLocation.reviews;
    const reviews = updatedLocation.reviews;
    expect(reviews).to.be.an('array').that.is.not.empty;
    expect(reviews.length).to.equal(baseLocationReviews.length+1);

    const insertedReview = reviews[reviews.length-1];
    expect(mongoose.Types.ObjectId.isValid(insertedReview.id)).to.be.true;
    expect(insertedReview.author).to.equal(baseReview.author);
    expect(insertedReview.rating).to.equal(baseReview.rating);
    expect(insertedReview.reviewText).to.equal(baseReview.reviewText);
    expect(insertedReview.coordinates).to.deep.equal(baseReview.coordinates);
    expect(insertedReview.createdOn.slice(0, 10)).to.equal(new Date().toISOString().slice(0, 10));

    // Check if rating was updated successfully
    const expectedRating = (
      (baseLocation.rating * baseLocation.reviews.length + baseReview.rating)
      / (baseLocation.reviews.length + 1)
    );
    expect(updatedLocation.rating).to.be.a('number');
    expect(updatedLocation.rating).to.be.closeTo(expectedRating, 0.01);
  });

  it('try invalid location', async function () {

    // Non existing location
    const existingIds = Dataset.getData().map(item => item._id.toString());

    let fakeLocationId;
    do {
      fakeLocationId = new mongoose.Types.ObjectId().toString();
    } while (existingIds.includes(fakeLocationId));

    const res01 = await request(app)
      .post(`/api/locations/${fakeLocationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(baseReview)
      .expect(404);

    checkErrorResponse(res01.body);

    // Invalid location id
    const invalidLocationId = 'abcd'
    const res02 = await request(app)
      .post(`/api/locations/${invalidLocationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(baseReview)
      .expect(400);

    checkErrorResponse(res02.body);
  });

  it('try invalid author', async function () {

    // No author
    const noAuthorReview = {...baseReview};
    delete noAuthorReview.author;

    const noAuthorResponse = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(noAuthorReview)
      .expect(400);

    checkErrorResponse(noAuthorResponse.body);

    // Empty author
    const emptyAuthorReview = {...baseReview};
    emptyAuthorReview.author = '';

    const emptyAuthorResponse = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(emptyAuthorReview)
      .expect(400);

    checkErrorResponse(emptyAuthorResponse.body);

    // Null author
    const nullAuthorReview = {...baseReview};
    nullAuthorReview.author = null;

    const nullAuthorResponse = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(nullAuthorReview)
      .expect(400);

    checkErrorResponse(nullAuthorResponse.body);
  });

  it('try invalid reviewText', async function () {
    // No reviewText
    const noReviewText = { ...baseReview };
    delete noReviewText.reviewText;

    const res1 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(noReviewText)
      .expect(400);

    checkErrorResponse(res1.body);

    // Empty reviewText
    const emptyReviewText = { ...baseReview };
    emptyReviewText.reviewText = '';

    const res2 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(emptyReviewText)
      .expect(400);

    checkErrorResponse(res2.body);

    // Null reviewText
    const nullReviewText = { ...baseReview };
    nullReviewText.reviewText = null;

    const res3 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(nullReviewText)
      .expect(400);

    checkErrorResponse(res3.body);

    // Too long reviewText
    const longReviewText = { ...baseReview };
    longReviewText.reviewText = 'a'.repeat(1001);

    const res4 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(longReviewText)
      .expect(400);

    checkErrorResponse(res4.body);
  });

  it('try invalid rating', async function () {
    // No rating
    const noRating = { ...baseReview };
    delete noRating.rating;

    const res1 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(noRating)
      .expect(400);

    checkErrorResponse(res1.body);

    // Null rating
    const nullRating = { ...baseReview };
    nullRating.rating = null;

    const res2 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(nullRating)
      .expect(400);

    checkErrorResponse(res2.body);

    // Rating < 0
    const lowRating = { ...baseReview };
    lowRating.rating = -1;

    const res3 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(lowRating)
      .expect(400);

    checkErrorResponse(res3.body);

    // Rating > 5
    const highRating = { ...baseReview };
    highRating.rating = 6;

    const res4 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(highRating)
      .expect(400);

    checkErrorResponse(res4.body);

    // Rating is string
    const stringRating = { ...baseReview };
    stringRating.rating = 'five';

    const res5 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(stringRating)
      .expect(400);

    checkErrorResponse(res5.body);
  });

  it('try invalid coordinates', async function () {
    // No coordinates
    const noCoordinates = { ...baseReview };
    delete noCoordinates.coordinates;

    const res1 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(noCoordinates)
      .expect(400);

    checkErrorResponse(res1.body);

    // Coordinates not array
    const stringCoordinates = { ...baseReview };
    stringCoordinates.coordinates = "not an array";

    const res2 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(stringCoordinates)
      .expect(400);

    checkErrorResponse(res2.body);

    // Coordinates wrong length
    const wrongLengthCoordinates = { ...baseReview };
    wrongLengthCoordinates.coordinates = [123]; // should be [lng, lat]

    const res3 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(wrongLengthCoordinates)
      .expect(400);

    checkErrorResponse(res3.body);

    // Coordinates with invalid types
    const invalidTypeCoordinates = { ...baseReview };
    invalidTypeCoordinates.coordinates = ["lng", "lat"];

    const res4 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(invalidTypeCoordinates)
      .expect(400);

    checkErrorResponse(res4.body);
  });

});
