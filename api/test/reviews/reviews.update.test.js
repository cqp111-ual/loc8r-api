const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app.js');
const mongoose = require('mongoose');
const Dataset = require('../Dataset.js');
const { checkSuccessResponse, checkLocationSchemaJSON, checkErrorResponse, checkReviewSchemaJSON } = require('../utils/helpers.js');

describe('PUT /api/locations/:locationId/reviews', function () {

  let location;
  let locationId;
  let reviewId;
  let review;

  const baseReview = {
    author: "Carl Johnson (CJ)",
    rating: 4.2,
    reviewText: "Best location in the area!",
    coordinates: [52.5, 8.7]
  }

  before(async function () {
    await Dataset.reset();
    locationId = Dataset.getData()[0]._id;
  });

  beforeEach(async function () {
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
  })

  afterEach(async function() {
    const deleteResponse = await request(app)
      .delete(`/api/locations/${locationId}/reviews/${reviewId}`)
      .expect(204);
  });

  /**
   * Basic tests 
   */
  it('invalid request content-type (expects application/json)', async function () {
    const response = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .type('form')
      .field('author', baseReview.author)
      .field('rating', baseReview.rating)
      .field('reviewText', baseReview.reviewText)
      .field('coordinates', JSON.stringify(baseReview.coordinates))
      .expect(400);

    checkErrorResponse(response.body);
  });


  // it('create valid review', async function () {
  //   const response = await request(app)
  //     .post(`/api/locations/${locationId}/reviews`)
  //     .set('Content-Type', 'application/json')
  //     .send(baseReview)
  //     .expect(201);

  //   checkSuccessResponse(response.body);

  //   const updatedLocation = response.body.data;
  //   checkLocationSchemaJSON(updatedLocation);

  //   const baseLocationReviews = baseLocation.reviews;
  //   const reviews = updatedLocation.reviews;
  //   expect(reviews).to.be.an('array').that.is.not.empty;
  //   expect(reviews.length).to.equal(baseLocationReviews.length+1);

  //   const insertedReview = reviews[reviews.length-1];
  //   expect(mongoose.Types.ObjectId.isValid(insertedReview.id)).to.be.true;
  //   expect(insertedReview.author).to.equal(baseReview.author);
  //   expect(insertedReview.rating).to.equal(baseReview.rating);
  //   expect(insertedReview.reviewText).to.equal(baseReview.reviewText);
  //   expect(insertedReview.coordinates).to.deep.equal(baseReview.coordinates);
  //   expect(insertedReview.createdOn.slice(0, 10)).to.equal(new Date().toISOString().slice(0, 10));

  //   // Check if rating was updated successfully
  //   const expectedRating = (
  //     (baseLocation.rating * baseLocation.reviews.length + baseReview.rating)
  //     / (baseLocation.reviews.length + 1)
  //   );
  //   expect(updatedLocation.rating).to.be.a('number');
  //   expect(updatedLocation.rating).to.be.closeTo(expectedRating, 0.01);
  // });

  it('try invalid location', async function () {

    // Non existing location
    const existingIds = Dataset.getData().map(item => item._id.toString());

    let fakeLocationId;
    do {
      fakeLocationId = new mongoose.Types.ObjectId().toString();
    } while (existingIds.includes(fakeLocationId));

    const res01 = await request(app)
      .put(`/api/locations/${fakeLocationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(baseReview)
      .expect(404);

    checkErrorResponse(res01.body);

    // Invalid location id
    const invalidLocationId = 'abcd'
    const res02 = await request(app)
      .put(`/api/locations/${invalidLocationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(baseReview)
      .expect(404);

    checkErrorResponse(res02.body);
  });

  it('try invalid review id', async function () {

    let fakeReviewId = 'abcd';

    const res = await request(app)
      .put(`/api/locations/${locationId}/reviews/${fakeReviewId}`)
      .set('Content-Type', 'application/json')
      .send(baseReview)
      .expect(404);

    checkErrorResponse(res.body);
  });

  it('update author', async function () {

    // try update w/ invalid author
    const invalidAuthorReview = {...baseReview};
    invalidAuthorReview.author = '';

    const invalidAuthorResponse = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(invalidAuthorReview)
      .expect(400);

    checkErrorResponse(invalidAuthorResponse.body);

    // Null author
    const nullAuthorReview = {author: null};

    const nullAuthorResponse = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(nullAuthorReview)
      .expect(400);

    checkErrorResponse(nullAuthorResponse.body);

    // successfull update
    const updatedReview = {author: 'New Author'};

    const response = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(updatedReview)
      .expect(200);

    checkSuccessResponse(response.body);
    const responseReview = response.body.data;
    checkReviewSchemaJSON(responseReview);

    expect(responseReview.id).to.equal(review.id);

    expect(responseReview.author).to.not.equal(review.author);
    expect(responseReview.author).to.equal(updatedReview.author);

    expect(responseReview.rating).to.equal(review.rating);
    expect(responseReview.reviewText).to.equal(review.reviewText);
    expect(responseReview.coordinates).to.deep.equal(review.coordinates);
  });

  it('update reviewText', async function () {

    // try update w/ empty reviewText
    const emptyReviewTextRes = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send({reviewText: ''})
      .expect(400);

    checkErrorResponse(emptyReviewTextRes.body);

    // Null author
    const nullReviewTextRes = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send({reviewText: null})
      .expect(400);

    checkErrorResponse(nullReviewTextRes.body);

    // Too long reviewText
    const longReviewText = { reviewText: 'a'.repeat(2000) };
    const longReviewTextRes = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(longReviewText)
      .expect(400);

    checkErrorResponse(longReviewTextRes.body);

    // successfull update
    const updatedReview = {reviewText: 'New Review Text!!'};

    const response = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(updatedReview)
      .expect(200);

    checkSuccessResponse(response.body);
    const responseReview = response.body.data;
    checkReviewSchemaJSON(responseReview);

    expect(responseReview.id).to.equal(review.id);

    expect(responseReview.reviewText).to.not.equal(review.reviewText);
    expect(responseReview.reviewText).to.equal(updatedReview.reviewText);

    expect(responseReview.rating).to.equal(review.rating);
    expect(responseReview.author).to.equal(review.author);
    expect(responseReview.coordinates).to.deep.equal(review.coordinates);
  });

  it('update coordinates', async function () {
    // update w/ null coordinates
    const res1 = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send({coordinates: null})
      .expect(400);

    checkErrorResponse(res1.body);

    // update w/ non array coordinates
    const res2 = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send({coordinates: 'not an array'})
      .expect(400);

    checkErrorResponse(res2.body);

    //  update w/ coordinates array wrong length
    const res3 = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send({coordinates: [123]}) // should be [lng, lat]
      .expect(400);

    checkErrorResponse(res3.body);

    // update w/ coordinates wrong type
    const invalidTypeCoordinates = { ...baseReview };
    invalidTypeCoordinates.coordinates = ["lng", "lat"];

    const res4 = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(invalidTypeCoordinates)
      .expect(400);

    checkErrorResponse(res4.body);

    // update w/ correct coordinates
    const updatedReview = {coordinates: [1,1]};

    const response = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(updatedReview)
      .expect(200);

    checkSuccessResponse(response.body);
    const responseReview = response.body.data;
    checkReviewSchemaJSON(responseReview);

    expect(responseReview.id).to.equal(review.id);
    expect(responseReview.reviewText).to.equal(review.reviewText);
    expect(responseReview.rating).to.equal(review.rating);
    expect(responseReview.author).to.equal(review.author);

    // To not deep equal
    expect(responseReview.coordinates).to.deep.equal(updatedReview.coordinates);
    expect(responseReview.coordinates).to.not.deep.equal(review.coordinates);
  });

  it('update rating', async function () {
    // Null rating
    const nullRating = { ...baseReview };
    nullRating.rating = null;

    const res2 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send({rating: null})
      .expect(400);

    checkErrorResponse(res2.body);

    // Rating < 0
    const res3 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send({rating: -1})
      .expect(400);

    checkErrorResponse(res3.body);

    // Rating > 5
    const res4 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send({rating: 6})
      .expect(400);

    checkErrorResponse(res4.body);

    // Rating as string
    const res5 = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send({rating: 'five'})
      .expect(400);

    checkErrorResponse(res5.body);

    // successfull update
    const updatedReview = {rating: 0};

    const response = await request(app)
      .put(`/api/locations/${locationId}/reviews/${reviewId}`)
      .set('Content-Type', 'application/json')
      .send(updatedReview)
      .expect(200);

    checkSuccessResponse(response.body);
    const responseReview = response.body.data;
    checkReviewSchemaJSON(responseReview);

    expect(responseReview.id).to.equal(review.id);
    expect(responseReview.reviewText).to.equal(review.reviewText);
    expect(responseReview.author).to.equal(review.author);
    expect(responseReview.coordinates).to.deep.equal(review.coordinates);

    // new rating (lower rating)
    expect(responseReview.rating).to.equal(updatedReview.rating);
    expect(responseReview.rating).to.not.equal(review.rating);

    // get location and check overall rating... should be lower (review rating went from 4 to 0)
    const locationResponse = await request(app)
      .get(`/api/locations/${locationId}`)
      .expect(200);
    
    checkSuccessResponse(locationResponse.body);
    checkLocationSchemaJSON(locationResponse.body.data);
    expect(locationResponse.body.data.rating).to.be.below(location.rating);
  });

  // updating everything is tested with all individual tests, no need to do a new test 
});
