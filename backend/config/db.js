'use strict';

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    logger.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
  };

  let retries = 5;

  while (retries > 0) {
    try {
      await mongoose.connect(uri, options);
      logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected — attempting reconnect...');
      });
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err.message);
      });

      return;
    } catch (err) {
      retries--;
      logger.error(`MongoDB connection failed (${5 - retries}/5): ${err.message}`);
      if (retries === 0) {
        logger.error('All MongoDB connection retries exhausted. Exiting.');
        process.exit(1);
      }
      logger.info(`Retrying in 5 seconds... (${retries} attempts left)`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
};

module.exports = connectDB;
