const { mongoUri } = require('../../config/config.js');
const mongoose = require('mongoose');

// Connect
const connectToDatabase = async () => {
    try {
        await mongoose.connect(mongoUri);
        log.info('Mongoose connected to ' + mongoUri);
    } catch (err) {
        log.error('Mongoose connection error: ' + err);
        process.exit(1); // Termina el proceso si no se puede conectar
    }
};

// mongoose.connect(mongo_uri)
//     .then(() => log.info('Mongoose connected to ' + mongo_uri))
//     .catch((err) => {
//         log.error('Mongoose connection error: ' + err);
//         process.exit(1);
//     });

// CONNECTION EVENTS
mongoose.connection.on('disconnected', () => {
    log.info('Mongoose disconnected');
});

// CAPTURE APP TERMINATION / RESTART EVENTS
// To be called when process is restarted or terminated
const gracefulShutdown = async (msg) => {
    try {
        await mongoose.connection.close();
        log.info('Mongoose disconnected through ' + msg);
    } catch (err) {
        log.warn('Error during mongoose disconnect:', err);
    }
};

// For nodemon restarts
process.once('SIGUSR2', async () => {
    await gracefulShutdown('nodemon restart');
    process.kill(process.pid, 'SIGUSR2');
});

// For app termination (CTRL+C)
process.on('SIGINT', async () => {
    await gracefulShutdown('app termination');
    process.exit(0);
});

// For Heroku app termination
process.on('SIGTERM', async () => {
    await gracefulShutdown('Heroku app termination');
    process.exit(0);
});

// BRING IN YOUR SCHEMAS & MODELS
require('./locations.js');

module.exports = { connectToDatabase };
