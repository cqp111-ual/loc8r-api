const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app.js');
const mongoose = require('mongoose');
const Dataset = require('../Dataset.js');
const { checkErrorResponse } = require('../utils/helpers.js');

describe('DELETE /api/locations/:locationId/reviews/:reviewId', function () {

  let location;
  let locationId;
  let review;
  let reviewId;

  before(async function () {
    // reset Data
    await Dataset.reset();

    locationId = Dataset.getData()[0]._id;

    const baseReview = {
      author: "Carl Johnson (CJ)",
      rating: 4.2,
      reviewText: "Best location in the area!",
      coordinates: [52.5, 8.7]
    }

    // Create review
    const createReviewResponse = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(baseReview)
      .expect(201);

    review = createReviewResponse.body.data;
    reviewId = review.id;

    // Get location after creating review
    const locationResponse = await request(app)
        .get(`/api/locations/${locationId}`)
        .expect(200);
    location = locationResponse.body.data;

  });

  /**
   * Basic tests 
   */

  it('should return 204 when deleting a valid review', async function () {
    const deleteResponse = await request(app)
      .delete(`/api/locations/${locationId}/reviews/${reviewId}`)
      .expect(204);

    // Get location after deleting review
    const locationResponse = await request(app)
      .get(`/api/locations/${locationId}`)
      .expect(200);
    
    const updatedLocation = locationResponse.body.data;
    const expectedRating = ( (location.rating * location.numReviews - review.rating)
      / (location.numReviews - 1)
    ) || 0;

    expect(updatedLocation.numReviews).to.equal(location.numReviews-1);
    expect(updatedLocation.rating).to.be.closeTo(expectedRating, 0.01);

    const locationReviewsResponse = await request(app)
      .get(`/api/locations/${locationId}/reviews?limit=80`)
      .expect(200);

    const locationReviews = locationReviewsResponse.body.data.results;
    const reviewExists = locationReviews.find(r => r.id === reviewId) !== undefined;

    expect(reviewExists).to.be.false;   
  });

  it('try invalid location id', async function () {

    // Non existing location
    const existingIds = Dataset.getData().map(item => item._id.toString());

    let fakeLocationId;
    do {
      fakeLocationId = new mongoose.Types.ObjectId().toString();
    } while (existingIds.includes(fakeLocationId));

    const res01 = await request(app)
      .delete(`/api/locations/${fakeLocationId}/reviews/${reviewId}`)
      .expect(404);

    checkErrorResponse(res01.body);

    // Invalid location id
    const invalidLocationId = 'abcd'
    const res02 = await request(app)
      .delete(`/api/locations/${invalidLocationId}/reviews/${reviewId}`)
      .expect(404);

    checkErrorResponse(res02.body);
  });

  it('try invalid review id', async function () {
    // Invalid review id
    const invalidReviewId = 'abcd'
    const res02 = await request(app)
      .get(`/api/locations/${locationId}/reviews/${invalidReviewId}`)
      .expect(404);

    checkErrorResponse(res02.body);
  });

});
