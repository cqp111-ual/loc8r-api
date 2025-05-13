const fs = require('fs');
const path = require('path');
const app = require('../src/app.js'); // loads mongoose schemas
const mongoose = require('mongoose');
const LocationModel = mongoose.model('Location');

const DATASET_PATH = path.join(__dirname, './datasets/locations.json');

class Dataset {
  constructor() {
    if (Dataset.instance) {
      return Dataset.instance;
    }

    this.data = null;
    this.stats = null;
    Dataset.instance = this;
  }

  // Método para cargar el dataset
  async load() {
    if (this.data) return; // Si ya está cargado, no hacemos nada

    try {
      const rawData = fs.readFileSync(DATASET_PATH, 'utf-8');
      this.data = JSON.parse(rawData);

      log.warn('[Dataset.load()] Clearing Location collection...');
      await LocationModel.deleteMany({});

      log.info(`[Dataset.load()] Inserting ${this.data.length} locations...`);
      await LocationModel.insertMany(this.data);

      log.info('[Dataset.load()] Test data inserted successfully.');

      // Calcular estadísticas
      this.calculateStats();
    } catch (err) {
      log.error('[Dataset.load()] Error loading dataset:', err);
      throw err;
    }
  }

  // Método para calcular las estadísticas
  calculateStats() {
    this.stats = {
      totalLocations: this.data.length,
      mostPopular: this.data.reduce((prev, current) => {
        return (prev.rating > current.rating) ? prev : current;
      }),
      averageRating: this.data.reduce((sum, loc) => sum + loc.rating, 0) / this.data.length,
      mostFrequentName: this.getMostFrequentName(),
    };
  }

  // Método para obtener el nombre más frecuente
  getMostFrequentName() {
    const nameCounts = {};
    this.data.forEach(loc => {
      nameCounts[loc.name] = (nameCounts[loc.name] || 0) + 1;
    });

    const mostFrequent = Object.keys(nameCounts).reduce((a, b) => nameCounts[a] > nameCounts[b] ? a : b);
    return mostFrequent;
  }

  // Métodos para obtener datos o estadísticas
  getData() {
    return this.data;
  }

  getStats() {
    return this.stats;
  }
}

module.exports = new Dataset();
