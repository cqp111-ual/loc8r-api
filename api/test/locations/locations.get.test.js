const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app.js');
const Dataset = require('../Dataset.js');
const { checkResponseSchema } = require('../utils/helpers.js');

describe('GET /locations', function () {

  it('basic request: should return 200 and an array of locations', async function () {
    const response = await request(app)
      .get('/api/locations')
      .expect(200);

    // general response schema
    checkResponseSchema(response.body);

    // specific endpoint response data
    expect(response.body.data).to.have.property('total');
    expect(response.body.data).to.have.property('limit');
    expect(response.body.data).to.have.property('offset');
    expect(response.body.data).to.have.property('results');
    expect(response.body.data.results).to.be.an('array');
  });

  // more tests here...

});
