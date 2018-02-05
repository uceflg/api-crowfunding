var cloudinary = require('cloudinary');
var config = require('../config/cloudinary_conf').cloudinary;

cloudinary.config({ 
  cloud_name: config.cloud_name, 
  api_key: config.api_key, 
  api_secret: config.api_secret 
});

exports.upload_image = function(file, callback){
  let image = file;
  cloudinary.uploader.upload(image, function(result) { 
    callback(result); 
  });
}

