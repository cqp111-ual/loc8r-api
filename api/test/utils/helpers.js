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

module.exports = {
  checkResponseSchema,
  checkErrorResponse,
  checkSuccessResponse
};
