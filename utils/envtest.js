require("dotenv").config();

console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("MONGODB_URI:", process.env.MONGODB_URI);
console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET);
