const multer = require('multer');
const { cloudinary } = require('../utils/cloudiary-utils');
const path = require('path');

// Cấu hình multer để lưu file tạm thời trong memory
const storage = multer.memoryStorage();

// File filter để chỉ cho phép upload ảnh
const fileFilter = (req, file, cb) => {
    // Kiểm tra định dạng file
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file ảnh!'), false);
    }
};

// Cấu hình multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // Giới hạn 10MB
        files: 5 // Tối đa 5 files
    }
});

// Hàm upload file lên Cloudinary
const uploadToCloudinary = async (buffer, originalName, folder = 'schoolManagement', resourceType = 'auto') => {
    try {
        return new Promise((resolve, reject) => {
            const uploadOptions = {
                resource_type: resourceType,
                folder: folder,
                public_id: `${Date.now()}_${path.parse(originalName).name}`,
            };

            // Only add transformation for images
            if (resourceType === 'image') {
                uploadOptions.transformation = [
                    { width: 800, height: 600, crop: 'fill', quality: 'auto' }
                ];
            }

            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result.secure_url);
                    }
                }
            );
            uploadStream.end(buffer);
        });
    } catch (error) {
        throw error;
    }
};

// Middleware xử lý upload multiple images
const handleImageUploads = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            // Nếu không có file nào được upload, tiếp tục
            return next();
        }

        console.log(`Uploading ${req.files.length} files to Cloudinary...`);
        
        // Upload tất cả files lên Cloudinary
        const uploadPromises = req.files.map(file => 
            uploadToCloudinary(file.buffer, file.originalname)
        );
        
        const imageUrls = await Promise.all(uploadPromises);
        
        // Thêm URLs vào req.body
        req.body.images = imageUrls;
        
        console.log('Upload successful. Image URLs:', imageUrls);
        next();
    } catch (error) {
        console.error('Error uploading images to Cloudinary:', error);
        res.status(500).json({ 
            success: false,
            message: 'Lỗi khi upload ảnh', 
            error: error.message 
        });
    }
};

const deleteImageFromCloudinary = async (imgUrl) => {
    try {
        const publicId = imgUrl.split('/').pop().split('.').shift();
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        console.log(`Deleted image from Cloudinary: ${imgUrl}`);
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
    }
};
module.exports = {
    
    handleImageUploads,
    uploadToCloudinary,
    deleteImageFromCloudinary
};
