const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app.js');
const Dataset = require('../Dataset.js');
const { checkErrorResponse, checkSuccessResponse, checkLocationSchemaJSON } = require('../utils/helpers.js');

describe('GET /api/locations', function () {

  const allowedSearchFields = ['name', 'date', 'coordinates'];
  const allowedSortFields = ['name', 'rating', 'date'];

  before(async function () {
    await Dataset.reset();
  });

  /**
   * Basic tests 
   */
  it('default get (no params): should set offset 0, limit 10 and order by rating desc', async function () {
    const response = await request(app)
      .get('/api/locations')
      .expect(200);

    checkSuccessResponse(response.body);

    const { total, offset, limit, results } = response.body.data;

    // check total is correct
    expect(total).to.equal(Dataset.total());
    // offset defaults to 0
    expect(offset).to.equal(0);
    // limit defaults to 10
    expect(limit).to.equal(10);
    expect(results).to.be.an('array');
    // results should not have more than 'limit' elements
    expect(results.length).to.be.at.most(limit);

    // should be ordered by rating desc
    const ratings = results.map(r => r.rating);
    const sorted = [...ratings].sort((a, b) => b - a);
    expect(ratings).to.deep.equal(sorted);

    // result items should follow location json schema
    results.forEach(item => { checkLocationSchemaJSON(item) });
  });

  it('limit parameter behaviour', async function () {

    // 1 invalid limit (<1)
    const param01 = new URLSearchParams({limit: -1});
    const res01 = await request(app)
    .get(`/api/locations?${param01.toString()}`)
    .expect(400);
    checkErrorResponse(res01.body);

    // 2 invalid limit (>100)
    const param02 = new URLSearchParams({limit: 100000});
    const res02 = await request(app)
    .get(`/api/locations?${param02.toString()}`)
    .expect(400);
    checkErrorResponse(res02.body);

    // 3 invalid limit (NaN)
    const params03 = new URLSearchParams({limit: 'not a numeric value'});
    const res03 = await request(app)
    .get(`/api/locations?${params03.toString()}`)
    .expect(400);
    checkErrorResponse(res03.body);

    // 4 valid limit
    const validLimit = 25;
    const params04 = new URLSearchParams({limit: validLimit});
    const res04 = await request(app)
    .get(`/api/locations?${params04.toString()}`)
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
    .get(`/api/locations?${param01.toString()}`)
    .expect(400);
    checkErrorResponse(res01.body);

    // 2 invalid offset (NaN)
    const param02 = new URLSearchParams({offset: 'not a numeric value'});
    const res02 = await request(app)
    .get(`/api/locations?${param02.toString()}`)
    .expect(400);
    checkErrorResponse(res02.body);

    // 3 valid offset
    const validOffset = Dataset.total()-1;
    const params03 = new URLSearchParams({offset: validOffset});
    const res03 = await request(app)
    .get(`/api/locations?${params03.toString()}`)
    .expect(200);
    checkSuccessResponse(res03.body);
    expect(res03.body.data.offset).to.equal(validOffset);
    expect(res03.body.data.results).to.be.an('array');
    expect(res03.body.data.results.length).to.equal(1);
    res03.body.data.results.forEach(item => { checkLocationSchemaJSON(item) });
  });


  it('should return 400 for sort field not allowed', async function() {
    // Pon un sort field no permitido, ej. tags
    const params = new URLSearchParams({ sort: 'tags' });

    const res = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(400);

    // Comprueba que sea error válido
    checkErrorResponse(res.body);
  });

  // Sort functionality
  allowedSortFields.forEach(field => {
    ['asc', 'desc'].forEach(order => {
      it(`should sort by ${field} ${order}`, async function() {
        const params = new URLSearchParams({ sort: field, order });
        const response = await request(app)
          .get(`/api/locations?${params.toString()}`)
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
        } else if (field === 'name') {
          values = results.map(r => r.name.toLowerCase()); // case-insensitive sort
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
        results.forEach(item => checkLocationSchemaJSON(item));
      });
    });
  });

  it('should return (at least) 1 result with exact name when using q and searchBy=name', async function () {
    const validName = Dataset.getData()[0].name;
    const expectedId = Dataset.getData()[0]._id;
  
    const params = new URLSearchParams({ q: validName, searchBy: 'name' });
    const response = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(200);
  
    checkSuccessResponse(response.body);
    expect(response.body.data.total).to.be.greaterThanOrEqual(1);
    expect(response.body.data.results).to.be.an('array').with.length.greaterThanOrEqual(1);
    const loc = response.body.data.results[0];
    checkLocationSchemaJSON(loc);
    expect(loc.name).to.equal(validName);
    expect(loc.id).to.equal(expectedId);
  });
  
  it('should ignore q and searchBy if one of them is missing', async function () {
    const validName = Dataset.getData()[0].name;
  
    // Specify only `q`
    const params1 = new URLSearchParams({ q: validName });
    const res1 = await request(app)
      .get(`/api/locations?${params1.toString()}`)
      .expect(200);
  
    checkSuccessResponse(res1.body);
    expect(res1.body.data.results.length).to.be.greaterThan(1);
  
    // Specify only `searchBy`
    const params2 = new URLSearchParams({ searchBy: 'name' });
    const res2 = await request(app)
      .get(`/api/locations?${params2.toString()}`)
      .expect(200);
  
    checkSuccessResponse(res2.body);
    expect(res2.body.data.results.length).to.be.greaterThan(1);
  });

  it('should return 400 for searchBy with invalid field', async function() {
    // Pon un searchBy con campo no permitido, ej. imageId
    const params = new URLSearchParams({ searchBy: 'imageId', q: 'anything' });

    const res = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(400);

    // Comprueba que sea error válido
    checkErrorResponse(res.body);
  });

  // Search functionality

  // name search
  it('should find locations by name prefix (first letter)', async function() {
    const firstLocation = Dataset.getData()[0];
    const prefix = firstLocation.name.charAt(0);
    const params = new URLSearchParams({
      searchBy: 'name',
      q: prefix
    });

    const response = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(200);

    checkSuccessResponse(response.body);
    const results = response.body.data.results;
    expect(results).to.be.an('array').that.is.not.empty;

    // Al menos un resultado debe empezar con el prefijo
    const prefixMatch = results.find(r => r.name.startsWith(prefix));
    expect(prefixMatch).to.exist;
  });

  // 'date' supports ISO format
  it('should support searching by date in YYYY-MM-DD format and find locations by exact createdOn', async function() {

    const firstLocation = Dataset.getData()[0];
    const date = new Date(firstLocation.timestamp);
    const dateExact = date.toISOString().slice(0, 10);

    const params = new URLSearchParams({
      searchBy: 'date',
      q: dateExact
    });

    const response = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(200);

    checkSuccessResponse(response.body);
    const results = response.body.data.results;
    expect(results).to.be.an('array').that.is.not.empty;

    // At least one result
    const matched = results.some(r => {
      const resultDate = new Date(r.createdOn);
      return (
        resultDate.getUTCFullYear() === date.getUTCFullYear() &&
        resultDate.getUTCMonth() === date.getUTCMonth() &&
        resultDate.getUTCDate() === date.getUTCDate()
      );
    });
  
    expect(matched).to.be.true;
  });

  it('should accept a valid ISO 8601 full datetime format for searchBy=date', async function () {
    const validDate = Dataset.getData()[0].timestamp;
  
    const params = new URLSearchParams({
      searchBy: 'date',
      q: validDate
    });
  
    const res = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(200);
  
    checkSuccessResponse(res.body);
  });
  
  it('should reject non-ISO date format (DD-MM-YYYY)', async function () {
    const invalidDate = '22-05-2025';
  
    const params = new URLSearchParams({
      searchBy: 'date',
      q: invalidDate
    });
  
    const res = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(400);
  
    checkErrorResponse(res.body);
    expect(res.body.message).to.include('not a valid ISO date');
  });

  it('should reject completely invalid date string', async function () {
    const params = new URLSearchParams({
      searchBy: 'date',
      q: 'not-a-date'
    });
  
    const res = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(400);
  
    checkErrorResponse(res.body);
    expect(res.body.message).to.include('not a valid ISO date');
  });

  // geolocation search
  it('should return 400 for invalid coordinates', async function () {
    const params = new URLSearchParams({
      searchBy: 'coordinates',
      q: 'invalid,coords'
    });
  
    const response = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(400);
  
    checkErrorResponse(response.body);
  });

  it('should find locations near valid coordinates', async function () {
    const location = Dataset.getData()[0];
    const [lng, lat] = location.coords.coordinates;

    const params = new URLSearchParams({
      searchBy: 'coordinates',
      q: `[${lng},${lat}]`
    });
  
    const response = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(200);
  
    
    checkSuccessResponse(response.body);
    const results = response.body.data.results;
    expect(results).to.be.an('array').that.is.not.empty;
  
    const match = results.find(
      r => r.coordinates[0] === lng && r.coordinates[1] === lat
    );
    expect(match).to.exist;
  });

  it('should return results ordered by distance to given coordinates', async function () {
    const location = Dataset.getData()[0];
    const [lng, lat] = location.coords.coordinates;
  
    const expectedSorted = Dataset.orderbyDistance(lng, lat).map(r => r._id);
    const params = new URLSearchParams({
      searchBy: 'coordinates',
      q: `[${lng},${lat}]`
    });
  
    const response = await request(app)
      .get(`/api/locations?${params.toString()}`)
      .expect(200);
  
    checkSuccessResponse(response.body);
    const expectedCount = Math.min(response.body.data.limit, response.body.data.total);
    const resultIds = response.body.data.results.map(r => r.id);

    expect(resultIds).to.have.lengthOf.at.most(expectedCount);
    expect(resultIds).to.deep.equal(expectedSorted.slice(0, expectedCount));
  });

});
