const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

cloudinary.api.ping()
    .then(() => console.log("✅ CLOUDINARY TEST: AUTH OK"))
    .catch(err => console.log("❌ CLOUDINARY TEST:", err.message));

module.exports = cloudinary;