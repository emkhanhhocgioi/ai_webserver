const multer = require('multer');
const { cloudinary } = require('../utils/cloudiary-utils');
const path = require('path');

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

// Multer config cho upload tất cả loại file (không chỉ ảnh)
const uploadAny = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Giới hạn 10MB
    }
});

/**
 * Helper function to determine Cloudinary resource_type based on file mimetype
 * @param {string} mimetype - File mimetype (e.g., 'image/png', 'application/pdf')
 * @returns {string} - 'image' for images, 'raw' for documents and other files
 */
const getResourceType = (mimetype) => {
    if (mimetype.startsWith('image/')) {
        return 'image';
    }
    return 'raw';
};

/**
 * Upload file to Cloudinary with proper resource_type detection
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} originalName - Original filename
 * @param {string} mimetype - File mimetype
 * @param {string} folder - Cloudinary folder (default: 'schoolManagement')
 * @returns {Promise<Object>} - Object containing secure_url, public_id, and resource_type
 */
const uploadToCloudinary = async (buffer, originalName, mimetype, folder = 'schoolManagement') => {
    try {
        const resourceType = getResourceType(mimetype);
        
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
                        resolve({
                            secure_url: result.secure_url,
                            public_id: result.public_id,
                            resource_type: resourceType
                        });
                    }
                }
            );
            uploadStream.end(buffer);
        });
    } catch (error) {
        throw error;
    }
};

/**
 * Middleware to handle multiple file uploads (images and documents)
 * Uploads files to Cloudinary and attaches URLs to req.body
 */
const handleImageUploads = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            // Nếu không có file nào được upload, tiếp tục
            return next();
        }

        console.log(`Uploading ${req.files.length} files to Cloudinary...`);
        
        // Upload tất cả files lên Cloudinary
        const uploadPromises = req.files.map(file => 
            uploadToCloudinary(file.buffer, file.originalname, file.mimetype)
        );
        
        const uploadResults = await Promise.all(uploadPromises);
        
        // Extract URLs for backward compatibility
        const imageUrls = uploadResults.map(result => result.secure_url);
        
        // Thêm URLs và full results vào req.body
        req.body.images = imageUrls;
        req.body.uploadResults = uploadResults; // Full upload info including public_id and resource_type
        
        console.log('Upload successful. File URLs:', imageUrls);
        next();
    } catch (error) {
        console.error('Error uploading files to Cloudinary:', error);
        res.status(500).json({ 
            success: false,
            message: 'Lỗi khi upload file', 
            error: error.message 
        });
    }
};

/**
 * Delete file from Cloudinary using the correct resource_type
 * @param {string} fileUrl - Cloudinary file URL or public_id
 * @param {string} resourceType - 'image' or 'raw' (default: 'image')
 */
const deleteImageFromCloudinary = async (fileUrl, resourceType = 'image') => {
    try {
        
        let publicId;
        
        if (fileUrl.includes('cloudinary.com')) {
            // Extract public_id from full URL
            const urlParts = fileUrl.split('/upload/');
            if (urlParts.length > 1) {
                // Get everything after /upload/
                const afterUpload = urlParts[1];
                // Remove version (v123456789) if present
                const pathParts = afterUpload.split('/').slice(1);
                // Join back and remove file extension
                publicId = pathParts.join('/').split('.')[0];
            } else {
                // Fallback: just get the last part without extension
                publicId = fileUrl.split('/').pop().split('.')[0];
            }
        } else {
            // Assume it's already a public_id
            publicId = fileUrl;
        }
        
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`Deleted file from Cloudinary: ${publicId} (${resourceType})`);
    } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
        throw error;
    }
};

module.exports = {
    upload,
    uploadAny,
    handleImageUploads,
    uploadToCloudinary,
    deleteImageFromCloudinary
};
