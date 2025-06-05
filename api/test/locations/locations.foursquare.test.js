const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app.js');
const Dataset = require('../Dataset.js');
const { checkErrorResponse, checkSuccessResponse } = require('../utils/helpers.js');

/**
 * This tests are limited, each request to FourSquare costs $$$$
 */

const fsq_SantiagoBernabeuStadium = {
  fsq_id: "4adcda38f964a5205d3c21e3",
  near_coords: [40.453053,-3.688344],
  radius: 10000
};

const fsq_EiffelTower = {
  fsq_id: "51a2445e5019c80b56934c75",
  query: "Eiffel",
  sortBy: 'relevance',
  near_coords: [48.858296,2.294479]
};

describe('GET /api/foursquare/locations', function () {

  before(async function () {
    await Dataset.reset();
  });

  /**
   * Basic tests 
   */
  it('response should contain Santiago Bernabeu by coordinates + radius', async function () {
    const params = new URLSearchParams();
    params.append('coordinates', `[${fsq_SantiagoBernabeuStadium.near_coords.join(',')}]`);
    params.append('radius', fsq_SantiagoBernabeuStadium.radius);

    const response = await request(app)
      .get(`/api/foursquare/locations?${params.toString()}`)
      .expect(200);

    checkSuccessResponse(response.body);
    const results = response.body.data.results;
    expect(results).to.be.an('array').with.length.greaterThanOrEqual(1);
    const found = results.some(item => item.id === fsq_SantiagoBernabeuStadium.fsq_id);
    expect(found).to.be.true;
  });

  it('search by name "Eiffel" sorted by relevance should include Eiffel Tower', async function () {
    const params = new URLSearchParams();
    params.append('coordinates', `[${fsq_EiffelTower.near_coords.join(',')}]`);
    params.append('sortBy', fsq_EiffelTower.sortBy);
    params.append('q', fsq_EiffelTower.query);

    const response = await request(app)
      .get(`/api/foursquare/locations?${params.toString()}`)
      .expect(200);

    checkSuccessResponse(response.body);
    const results = response.body.data.results;
    expect(results).to.be.an('array').with.length.greaterThanOrEqual(1);
    const found = results.some(item => item.id === fsq_EiffelTower.fsq_id);
    expect(found).to.be.true;
  });

});

describe('Foursquare POST /api/foursquare/locations/import', () => {

  it('Fail if request body does not contain fsq_ids array', async () => {
    const res = await request(app)
      .post('/api/foursquare/locations/import')
      .send({ id: ['51a2445e5019c80b56934c75'] })
      .expect(400);

    checkErrorResponse(res.body);
  });

  it('Fail if fsq_ids is a single string, not an array', async () => {
    const res = await request(app)
      .post('/api/foursquare/locations/import')
      .send({ fsq_ids: '51a2445e5019c80b56934c75' })
      .expect(400);

    checkErrorResponse(res.body);
  });

  it('Fail if more than 10 fsq_ids provided', async () => {
    const moreThan10 = Array(11).fill('51a2445e5019c80b56934c75');
    const res = await request(app)
      .post('/api/foursquare/locations/import')
      .send({ fsq_ids: moreThan10 })
      .expect(400);

    checkErrorResponse(res.body);
  });

  it('Success inserting two valid fsq_ids', async () => {
    const fsq_ids = [
      fsq_SantiagoBernabeuStadium.fsq_id,
      fsq_EiffelTower.fsq_id
    ];

    const res = await request(app)
      .post('/api/foursquare/locations/import')
      .send({ fsq_ids })
      .expect(201);

    checkSuccessResponse(res.body);

    const inserted = res.body.data.inserted;
    const failed = res.body.data.failed;

    expect(inserted).to.be.an('array').that.includes.members(fsq_ids);
    expect(failed).to.be.an('array').that.is.empty;
  });

});
