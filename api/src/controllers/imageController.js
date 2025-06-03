const fs = require('fs'); // existsSync, createReadStream
const fsp = require('fs/promises'); // async/await unlink
const path = require('path');
const mime = require('mime-types');
const mongoose = require('mongoose');
const { request } = require('undici');
const { uploadsDir } = require('../config/config.js');
const ImageModel = mongoose.model('Image');
const LocationModel = mongoose.model('Location'); // to delete reference

class ImageController {
  static allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  // endpoint to return images
  static async getImage(req, res, next) {
    try {

      const imageId = req.params.imageId;

      if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(404).json({
          success: false,
          message: "Image not found",
          data: null
        });
      }

      const image = await ImageModel.findById(imageId);
      if (!image) {
        return res.status(404).json({
          success: false,
          message: "Image not found",
          data: null
          });
      }

      // if hosted === false => proxy
      if (!image.hosted) {
        try {
          const externalResponse = await request(image.url);
          if (externalResponse.statusCode !== 200) {
            return res.status(502).json({
              success: false,
              message: `Failed to fetch external image. Status: ${externalResponse.statusCode}`,
              data: null
            });
          }

          const contentType = externalResponse.headers['content-type'];
          if (!contentType ) {
            return res.status(400).json({
              success: false,
              message: 'Missing Content-Type in external response',
              data: null
            });
          }

          if (!ImageController.allowedImageTypes.includes(contentType.toLowerCase())) {
            return res.status(415).json({
              success: false,
              message: `Unsupported image type: ${contentType}. Must be one of: ${ImageController.allowedImageTypes.join(', ')}`,
              data: null
            });
          }

          // return proxied image
          res.status(200);
          res.setHeader('Content-Type', contentType);
          externalResponse.body.pipe(res);
          return;
        } catch (err) {
          log.error(`[ImageController.getImage()] Error fetching external image: ${err.message}`);
          return res.status(500).json({
            success: false,
            message: 'Error fetching external image',
            data: null
          });
        }
      } else {
        try {
          const imagePath = path.join(uploadsDir, image.path);
          if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
              success: false,
              message: 'Hosted image file not found on server',
              data: null
            });
          }

          const mimeType =  mime.lookup(imagePath); 
          if (!mimeType || !ImageController.allowedImageTypes.includes(mimeType.toLowerCase())) {
            return res.status(415).json({
              success: false,
              message: `Unsupported local image type: ${mimeType}`,
              data: null
            });
          }
      
          res.status(200);
          res.setHeader('Content-Type', mimeType);
          const stream = fs.createReadStream(imagePath);
          stream.pipe(res);
        } catch (err) {
          log.error(`[ImageController.getImage()] Error serving hosted image: ${err.message}`);
          return res.status(500).json({
            success: false,
            message: 'Error serving hosted image',
            data: null
          });
        }
      }
    } catch (err) {
      log.error('[ImageController.getImage()] Unexpected error!');
      next(err);
    }
  }

  // type can only be 'url' or 'source'
  static async createImage(type, source) {

    let imageId = null;
    switch (type) {
      case 'url': {
        // Check type
        if (typeof source !== 'string') {
          throw new Error('Invalid image URL string');
        }

        // Check URL
        try {
          new URL(source);
        } catch {
          throw new Error('Invalid image URL format.');
        }

        const imageDocUrl = new ImageModel({
          hosted: false,
          url: source
        });

        await imageDocUrl.save();
        imageId = imageDocUrl._id;
        break;
      }
      case 'file': {
        if (!source || typeof source !== 'object') {
          throw new Error('Invalid image file');
        }

        const { mimetype, size, filename, originalname } = source;

        if (!mimetype || !ImageController.allowedImageTypes.includes(mimetype.toLowerCase())) {
          throw new Error(`Unsupported image type: ${mimetype}. Must be one of: ${ImageController.allowedImageTypes.join(', ')}`);
        }

        if (size === 0) {
          throw new Error(`Empty file '${originalname}' is not allowed.`);
        } 

        const imageDoc = new ImageModel({
          hosted: true,
          path: filename
        });

        await imageDoc.save();
        imageId = imageDoc._id;
        break;
      }

      default:
        throw new Error(`Invalid image type: ${type}`);
    }

    return imageId;
  }

  static async deleteImage(imageId) {
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return false;
    }

    const image = await ImageModel.findById(imageId);
    if (!image) {
      return false;
    }

    await LocationModel.updateMany(
      { image: image._id },
      { $set: { image: null } }
    );

    // if hosted, remove file from disk
    if (image.hosted) {
      const imagePath = path.join(uploadsDir, image.path);
      try {
        await fsp.unlink(imagePath);
      } catch (unlinkErr) {
        log.warn(`[ImageController.deleteImage()] Could not delete file: ${imagePath}. Error message: ${unlinkErr.message}`);
      }
    }

    await image.deleteOne();
    return true;
  }

}

module.exports = ImageController;