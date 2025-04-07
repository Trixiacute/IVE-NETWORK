const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const sharp = require('sharp');

const PORT = 3001;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory');
}

// Mock database for uploaded images
let imagesDb = [];

// Load existing images data
try {
  const data = fs.readFileSync('images-db.json');
  imagesDb = JSON.parse(data);
} catch (err) {
  // No existing database or invalid JSON, start with empty array
  imagesDb = [];
}

// Save images data to file
function saveImagesData() {
  fs.writeFileSync('images-db.json', JSON.stringify(imagesDb));
}

const server = http.createServer((req, res) => {
  const method = req.method.toLowerCase();
  const url = req.url;
  
  // Enhanced CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '3600'); // 1 hour
  
  // Handle preflight requests
  if (method === 'options') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  console.log(`${method.toUpperCase()} request for ${url}`);
  
  // Handle image upload
  if (url === '/api/upload' && method === 'post') {
    console.log('Processing upload request...');
    
    // Parse the multipart form data with improved error handling
    const form = new formidable.IncomingForm({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 20 * 1024 * 1024, // 20MB
      multiples: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Could not upload file', details: err.message }));
        return;
      }
      
      console.log('Files received:', files);
      console.log('Fields received:', fields);

      // Support both 'file' and 'photo' field names for backward compatibility
      const uploadedFile = (files.file && (Array.isArray(files.file) ? files.file[0] : files.file)) || 
                           (files.photo && (Array.isArray(files.photo) ? files.photo[0] : files.photo));
      
      if (!uploadedFile || !uploadedFile.filepath) {
        console.error('No file was uploaded');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'No file uploaded' }));
        return;
      }

      // Check file type - more permissive checking
      const originalName = uploadedFile.originalFilename || uploadedFile.name || '';
      const fileExt = path.extname(originalName).toLowerCase();
      const mimeType = uploadedFile.mimetype || '';
      
      console.log('File details:', { 
        originalName, 
        fileExt, 
        mimeType, 
        size: uploadedFile.size || 'unknown' 
      });
      
      // More permissive file type validation
      const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const allowedMimeTypes = [
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        'image/bmp',
        'image/x-ms-bmp',
        'image' // Allow generic image type
      ];
      
      const isAllowedFileType = 
        allowedExts.some(ext => fileExt.includes(ext)) || 
        allowedMimeTypes.some(type => mimeType.includes(type));
      
      if (!isAllowedFileType) {
        // Delete the temporary file
        try {
          fs.unlinkSync(uploadedFile.filepath);
        } catch (err) {
          console.error('Error deleting temporary file:', err);
        }
        
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid file type. Only images are allowed.',
          details: { fileExt, mimeType }
        }));
        return;
      }

      // Generate a unique filename to avoid conflicts
      const timestamp = Date.now();
      const newFilename = `${timestamp}${fileExt || '.jpg'}`; // Default to jpg if no extension
      const newPath = path.join(uploadsDir, newFilename);

      console.log('Resizing image to 1200x...');
      
      try {
        // Use a try-catch block around the entire resize operation
        sharp(uploadedFile.filepath)
          .resize({
            width: 1200,
            height: null, // Maintain aspect ratio
            fit: 'inside',
            withoutEnlargement: true
          })
          .toFile(newPath, (err) => {
            // Delete the temporary file regardless of outcome
            try {
              fs.unlinkSync(uploadedFile.filepath);
            } catch (unlinkErr) {
              console.error('Error deleting temporary file:', unlinkErr);
            }

            if (err) {
              console.error('Error resizing image:', err);
              
              // Fallback: if resize fails, try to copy the original file
              try {
                const fileBuffer = fs.readFileSync(uploadedFile.filepath);
                fs.writeFileSync(newPath, fileBuffer);
                console.log('Resize failed, using original file instead');
              } catch (copyErr) {
                console.error('Also failed to copy original file:', copyErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Error processing image' }));
                return;
              }
            }
            
            console.log('Image successfully processed and saved to:', newPath);

            // Create an entry for the database
            const title = (fields.title && (Array.isArray(fields.title) ? fields.title[0] : fields.title)) || 'Untitled Image';
            const date = (fields.date && (Array.isArray(fields.date) ? fields.date[0] : fields.date)) || new Date().toISOString().split('T')[0];
            const fileSize = fs.statSync(newPath).size;
            
            const newImage = {
              id: timestamp.toString(),
              url: `/uploads/${newFilename}`,
              title: title,
              date: date,
              fileSize: fileSize,
              fileType: mimeType || fileExt.replace('.', '')
            };

            // Add the new image to the database (at the beginning)
            imagesDb.unshift(newImage);
            saveImagesData();
            
            console.log('File processed and saved successfully:', newFilename);

            // Send success response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              image: newImage
            }));
          });
      } catch (criticalError) {
        console.error('Critical error in image processing:', criticalError);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Critical error processing image',
          details: criticalError.message 
        }));
      }
    });
    return;
  }
  
  // Handle DELETE for image deletion
  if (url.startsWith('/api/delete-image/') && method === 'delete') {
    // Extract image ID from URL
    const imageId = url.replace('/api/delete-image/', '');
    
    if (!imageId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'No image ID provided' }));
      return;
    }
    
    console.log(`Attempting to delete image with ID: ${imageId}`);
    
    // Find the image in the database
    const imageIndex = imagesDb.findIndex(img => img.id === imageId);
    
    if (imageIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Image not found' }));
      return;
    }
    
    // Get the image data
    const imageToDelete = imagesDb[imageIndex];
    
    // Extract filename from the URL path
    const filename = path.basename(imageToDelete.url);
    
    // Delete the file from disk
    const filePath = path.join(uploadsDir, filename);
    
    try {
      // Check if file exists
      if (fs.existsSync(filePath)) {
        // Delete the file
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      } else {
        console.warn(`File not found on disk: ${filePath}`);
      }
      
      // Remove from database
      imagesDb.splice(imageIndex, 1);
      
      // Save updated database
      saveImagesData();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Image deleted successfully' 
      }));
    } catch (error) {
      console.error('Error deleting image:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Failed to delete image',
        details: error.message 
      }));
    }
    
    return;
  }
  
  // Handle GET request for all images
  if (url === '/api/images' && method === 'get') {
    console.log('Fetching all images...');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(imagesDb));
    return;
  }
  
  // Serve uploaded files
  if (url.startsWith('/uploads/')) {
    const filename = url.replace('/uploads/', '');
    const filePath = path.join(uploadsDir, filename);
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      
      // Set cache headers for images
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
    
    return;
  }
  
  // Handle static files
  let filePath = '.' + url;
  if (filePath === './') {
    filePath = './index.html';
  }
  
  // Get the file extension
  const extname = path.extname(filePath);
  let contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Read the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Page not found
        fs.readFile('./index.html', (err, content) => {
          if (err) {
            // Server error
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Image upload functionality enabled - files saved to ./uploads`);
}); 