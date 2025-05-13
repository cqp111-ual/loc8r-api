const { expect } = require('chai');

function checkResponseSchema(responseBody) {
  expect(responseBody).to.have.property('success');
  expect(responseBody).to.have.property('message');
  expect(responseBody).to.have.property('data');
}

module.exports = {
  checkResponseSchema
};
