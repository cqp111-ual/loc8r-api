const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./docs/api-docs.js');

// Load required configuration
const { port } = require('./config/config.js');
const { nodeEnv } = require('./config/config.js');

// Custom global log function
require('./utils/logger.js');

// Require database connection
require('./models/mongodb/db.js');

// Load routes
const indexRouter = require('./routes/index.js');
const apiRouter = require('./routes/api.js');

// Create app
const app = express();

// Security
app.disable("x-powered-by");

app.set('port', port);

if (nodeEnv === 'production') {
  app.use(morgan("common"));
} else if (nodeEnv === 'testing') {
  // do not log requests
} else {
  app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// error handler
app.use(function (err, req, res, next) {

  // Multer errors uploading files
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `Bad request`,
      data: null
    })
  }

  // set locals, only providing error in development
  console.error(err);
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  return res.status(err.status || 500).json({
    success: false,
    message: 'Server error',
    data: { err }
  });
});

module.exports = app;
