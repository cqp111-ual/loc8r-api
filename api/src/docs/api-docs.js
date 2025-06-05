const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Loc8r API',
      version: '1.0.0',
      description: 'API to find, create and rate places! - TRWM UAL 2025',
      contact: {
        name: 'Carlos Quesada Pérez',
        email: 'cqp111@inlumine.ual.es'
      }
    }
  },
  apis: [path.resolve(__dirname, '../routes/*.js')]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
module.exports = swaggerDocs;