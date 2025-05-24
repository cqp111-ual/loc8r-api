// should receive coords = [lng,lat]
const isValidCoordinates = (coords) => {
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number' &&
    coords[0] >= -180 && coords[0] <= 180 &&   // longitud
    coords[1] >= -90 && coords[1] <= 90        // latitud
  );
}

module.exports = {
  isValidCoordinates
}