const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app.js');
const mongoose = require('mongoose');
const Dataset = require('../Dataset.js');
const { checkSuccessResponse, checkErrorResponse, checkReviewSchemaJSON } = require('../utils/helpers.js');

// get all location reviews (w/ pagination)
describe('GET /api/locations/:locationId/reviews', function () { 

  const allowedSortFields = ['rating', 'date'];
  let locationId;
  let location;

  before(async function () {
    // reset Data
    await Dataset.reset();

    const baseReviews = [
      {
        author: "Carl Johnson (CJ)",
        rating: 4.2,
        reviewText: "Best location in the area!",
        coordinates: [52.5, 8.7]
      },
      {
        author: "Michael Kane",
        rating: 3,
        reviewText: "Interesting place",
        coordinates: [50, 10.4445]
      },
      {
        author: "Olivia Knight",
        rating: 5,
        reviewText: "Best place in the world",
        coordinates: [42, 60.4445]
      }
    ];
    
    // Create reviews (wait 3s for diferent timestamps)
    locationId = Dataset.getData()[0]._id;

    for (const baseReview of baseReviews) {
      const response = await request(app)
        .post(`/api/locations/${locationId}/reviews`)
        .set('Content-Type', 'application/json')
        .send(baseReview)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Retrieve location info
    const locationResponse = await request(app)
        .get(`/api/locations/${locationId}`)
        .expect(200);
    location = locationResponse.body.data;
  });

  /**
   * Basic tests 
   */
  it('default get (no params): should set offset 0, limit 10 and order by date desc', async function () {
    const response = await request(app)
      .get(`/api/locations/${locationId}/reviews`)
      .expect(200);

    checkSuccessResponse(response.body);

    const { total, offset, limit, results } = response.body.data;

    // check total is correct
    expect(total).to.equal(location.numReviews);
    // offset defaults to 0
    expect(offset).to.equal(0);
    // limit defaults to 10
    expect(limit).to.equal(10);
    expect(results).to.be.an('array');
    // results should not have more than 'limit' elements
    expect(results.length).to.be.at.most(limit);

    // should be ordered by date desc
    const dates = results.map(r => r.createdOn);
    const sorted = [...dates].sort((a, b) => b - a);
    expect(dates).to.deep.equal(sorted);

    // result items should follow location json schema
    results.forEach(item => { checkReviewSchemaJSON(item) });
  });

  it('limit parameter behaviour', async function () {

    // 1 invalid limit (<1)
    const param01 = new URLSearchParams({limit: -1});
    const res01 = await request(app)
      .get(`/api/locations/${locationId}/reviews?${param01.toString()}`)
      .expect(400);
    checkErrorResponse(res01.body);

    // 2 invalid limit (>100)
    const param02 = new URLSearchParams({limit: 100000});
    const res02 = await request(app)
      .get(`/api/locations/${locationId}/reviews?${param02.toString()}`)
      .expect(400);
    checkErrorResponse(res02.body);

    // 3 invalid limit (NaN)
    const params03 = new URLSearchParams({limit: 'not a numeric value'});
    const res03 = await request(app)
      .get(`/api/locations/${locationId}/reviews?${params03.toString()}`)
      .expect(400);
    checkErrorResponse(res03.body);

    // 4 valid limit
    const validLimit = 25;
    const params04 = new URLSearchParams({limit: validLimit});
    const res04 = await request(app)
      .get(`/api/locations/${locationId}/reviews?${params04.toString()}`)
      .expect(200);
    checkSuccessResponse(res04.body);
    expect(res04.body.data.limit).to.equal(validLimit);
    expect(res04.body.data.results).to.be.an('array');
    expect(res04.body.data.results.length).to.be.at.most(validLimit);
  });

  it('offset parameter behaviour', async function () {

    // 1 invalid offset (<0)
    const param01 = new URLSearchParams({offset: -1});
    const res01 = await request(app)
      .get(`/api/locations/${locationId}/reviews?${param01.toString()}`)
      .expect(400);
    checkErrorResponse(res01.body);

    // 2 invalid offset (NaN)
    const param02 = new URLSearchParams({offset: 'not a numeric value'});
    const res02 = await request(app)
      .get(`/api/locations/${locationId}/reviews?${param02.toString()}`)
      .expect(400);
    checkErrorResponse(res02.body);

    // 3 valid offset
    const validOffset = location.numReviews-1;
    const params03 = new URLSearchParams({offset: validOffset});
    const res03 = await request(app)
      .get(`/api/locations/${locationId}/reviews?${params03.toString()}`)
      .expect(200);
    checkSuccessResponse(res03.body);
    expect(res03.body.data.offset).to.equal(validOffset);
    expect(res03.body.data.results).to.be.an('array');
    expect(res03.body.data.results.length).to.equal(1);
    res03.body.data.results.forEach(item => { checkReviewSchemaJSON(item) });
  });

  it('should return 400 for sort field not allowed', async function() {
    const params = new URLSearchParams({ sort: 'author' });

    const res = await request(app)
      .get(`/api/locations/${locationId}/reviews?${params.toString()}`)
      .expect(400);

    checkErrorResponse(res.body);
  });

  // Sort functionality
  allowedSortFields.forEach(field => {
    ['asc', 'desc'].forEach(order => {
      it(`should sort by ${field} ${order}`, async function() {
        const params = new URLSearchParams({ sort: field, order });
        const response = await request(app)
          .get(`/api/locations/${locationId}/reviews?${params.toString()}`)
          .expect(200);

        checkSuccessResponse(response.body);

        const results = response.body.data.results;
        expect(results).to.be.an('array').that.is.not.empty;

        // Extract the values to check sorting
        let values;
        if (field === 'date') {
          // For date, convert to timestamps for comparison
          values = results.map(r => new Date(r.createdOn).getTime());
        } else if (field === 'rating') {
          values = results.map(r => r.rating);
        }

        // Sort accordingly
        const sorted = [...values].sort((a, b) => {
          if (order === 'asc') {
            return a > b ? 1 : a < b ? -1 : 0;
          } else {
            return a < b ? 1 : a > b ? -1 : 0;
          }
        });

        expect(values).to.deep.equal(sorted);

        // Schema check for all items
        results.forEach(item => checkReviewSchemaJSON(item));
      });
    });
  });
});

// get review by id
describe('GET /api/locations/:locationId/reviews/:reviewId', function () {

  let location;
  let locationId;
  let review;
  let reviewId;

  before(async function () {
    // reset Data
    await Dataset.reset();

    const baseReview = {
      author: "Carl Johnson (CJ)",
      rating: 4.2,
      reviewText: "Best location in the area!",
      coordinates: [52.5, 8.7]
    }

    // Create review
    location = Dataset.getData()[0];
    locationId = location._id;

    const response = await request(app)
      .post(`/api/locations/${locationId}/reviews`)
      .set('Content-Type', 'application/json')
      .send(baseReview)
      .expect(201);

    review = response.body.data;
    reviewId = review.id;
    
  });

  /**
   * Basic tests 
   */

  it('should return 200 when retrieving a valid review', async function () {
    const response = await request(app)
      .get(`/api/locations/${locationId}/reviews/${reviewId}`)
      .expect(200);

    checkSuccessResponse(response.body);
    const responseReview = response.body.data;
    checkReviewSchemaJSON(responseReview);

    // compare that responseReview equals review field by field...
    expect(responseReview).to.have.property('id', review.id);
    expect(responseReview).to.have.property('author', review.author);
    expect(responseReview).to.have.property('rating', review.rating);
    expect(responseReview).to.have.property('reviewText', review.reviewText);
    expect(responseReview).to.have.property('createdOn');
    expect(new Date(responseReview.createdOn).toISOString()).to.equal(new Date(review.createdOn).toISOString());
    expect(responseReview.coordinates).to.deep.equal(review.coordinates);
  });

  it('try invalid location id', async function () {

    // Non existing location
    const existingIds = Dataset.getData().map(item => item._id.toString());

    let fakeLocationId;
    do {
      fakeLocationId = new mongoose.Types.ObjectId().toString();
    } while (existingIds.includes(fakeLocationId));

    const res01 = await request(app)
      .get(`/api/locations/${fakeLocationId}/reviews/${reviewId}`)
      .expect(404);

    checkErrorResponse(res01.body);

    // Invalid location id
    const invalidLocationId = 'abcd'
    const res02 = await request(app)
      .get(`/api/locations/${invalidLocationId}/reviews/${reviewId}`)
      .expect(400);

    checkErrorResponse(res02.body);
  });

  it('try invalid review id', async function () {

    // Non existing review id
    const existingIds = location.reviews.map(item => item._id.toString());
    let fakeReviewId;
    do {
      fakeReviewId = new mongoose.Types.ObjectId().toString();
    } while (existingIds.includes(fakeReviewId));

    const res01 = await request(app)
      .get(`/api/locations/${locationId}/reviews/${fakeReviewId}`)
      .expect(404);

    checkErrorResponse(res01.body);

    // Invalid review id
    const invalidReviewId = 'abcd'
    const res02 = await request(app)
      .get(`/api/locations/${locationId}/reviews/${invalidReviewId}`)
      .expect(404);

    checkErrorResponse(res02.body);
  });

});
