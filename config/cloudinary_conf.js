require('dotenv').config();

module.exports = {
    cloudinary: {
        cloud_name: process.env.CLOUD_NAME, 
        api_key: process.env.CLOUDNARY_KEY, 
        api_secret: process.env.CLOUDNARY_SECRET 
    } 
};