const mongoose = require('mongoose');

// Modelo de imagenes: externo a Locations
const imageSchema = new mongoose.Schema({
  hosted: { type: Boolean, default: false },
  path: {
    type: String,
    required: function () {
      return this.hosted === true;
    }
  },
  url: {
    type: String,
    required: function () {
      return this.hosted === false;
    }
  },
  uploadedAt: { type: Date, default: Date.now }
});

mongoose.model('Image', imageSchema);

// Subdocumento: review con ubicación
const reviewSchema = new mongoose.Schema({
  author: String,
  rating: { type: Number, required: true, min: 0, max: 5 },
  reviewText: {type: String, maxlength: 1000},
  createdOn: { type: Date, default: Date.now },
  coords: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: false } // [long, lat]
  }
});

// Índice geoespacial para las reviews (si lo necesitas)
reviewSchema.index({ coords: '2dsphere' });

// Esquema devuelto al cliente
reviewSchema.set('toJSON', {
  transform: function (doc, ret) {
    // Reemplazar coords con solo coordinates
    if (ret.coords && ret.coords.coordinates) {
      ret.coordinates = ret.coords.coordinates;
      delete ret.coords;
    }

    // Opcional: eliminar campos internos
    delete ret.__v;
    delete ret._id;
    ret.id = doc._id;

    return ret;
  }
});

// Esquema principal del punto de interés
const poiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  timestamp: { type: Date, default: Date.now },
  image: { type: mongoose.Schema.Types.ObjectId, ref: 'Image',  default: null },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  description: String,
  tags: { type: [String], default: [] },
  coords: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [long, lat]
  },
  reviews: { type: [reviewSchema], default: [] }
});

// Índice geoespacial
poiSchema.index({ coords: '2dsphere' });

// Esquema devuelto al cliente
poiSchema.set('toJSON', {
  transform: function (doc, ret) {
    // Reemplazar coords con solo coordinates
    if (ret?.coords && ret.coords.coordinates) {
      ret.coordinates = ret.coords.coordinates;
      delete ret.coords;
    }

    // Opcional: eliminar campos internos
    delete ret.__v;

    delete ret._id;
    ret.id = doc._id;

    delete ret.timestamp;
    ret.createdOn = doc.timestamp;

    delete ret.image;
    ret.imageId = doc.image;

    ret.numReviews = ret.reviews.length;
    delete ret.reviews;

    return ret;
  }
});

mongoose.model('Location', poiSchema);
