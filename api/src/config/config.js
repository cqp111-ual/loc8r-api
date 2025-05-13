require("dotenv").config();

const port = normalizePort(process.env.PORT) || 3000;
const nodeEnv = process.env.NODE_ENV || 'production';
const uploadsDir = process.env.UPLOADS_DIR || '/uploads';
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost/db';
const foursquareApiUrl = process.env.FOURSQUARE_API_URL || 'https://api.foursquare.com';
const foursquareApiKey = process.env.FOURSQUARE_API_KEY || 'YOUR_API_KEY_HERE';

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    let port = parseInt(val, 10);
  
    if (isNaN(port)) {
      // named pipe
      return val;
    }
  
    if (port >= 0) {
      // port number
      return port;
    }
  
    return false;
  }

module.exports = {
    port,
    nodeEnv,
    uploadsDir,
    mongoUri,
    foursquareApiUrl,
    foursquareApiKey
}
