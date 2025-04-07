const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

const PORT = 3000;

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
const imagesDb = [];

// Save images data to a JSON file
function saveImagesData() {
  const dbPath = path.join(__dirname, 'images-db.json');
  fs.writeFileSync(dbPath, JSON.stringify(imagesDb, null, 2));
}

// Load images data from JSON file if it exists
function loadImagesData() {
  const dbPath = path.join(__dirname, 'images-db.json');
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf8');
      const parsedData = JSON.parse(data);
      imagesDb.push(...parsedData);
      console.log(`Loaded ${imagesDb.length} images from database`);
    } catch (err) {
      console.error('Error loading images database:', err);
    }
  }
}

// Load existing images on startup
loadImagesData();

const server = http.createServer((req, res) => {
  const method = req.method.toLowerCase();
  const url = req.url;
  
  console.log(`${method.toUpperCase()} request for ${url}`);
  
  // Handle image upload
  if (url === '/api/upload' && method === 'post') {
    const form = new formidable.IncomingForm();
    form.uploadDir = uploadsDir;
    form.keepExtensions = true;
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Could not upload file' }));
        return;
      }
      
      const uploadedFile = files.photo;
      if (!uploadedFile) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No file uploaded' }));
        return;
      }
      
      // Get file information and move to proper location
      const oldPath = uploadedFile.filepath;
      const fileExt = path.extname(uploadedFile.originalFilename);
      const newFilename = `${Date.now()}${fileExt}`;
      const newPath = path.join(uploadsDir, newFilename);
      
      // Save the file
      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Could not save file' }));
          return;
        }
        
        // Create record for image
        const imageRecord = {
          id: Date.now().toString(),
          filename: newFilename,
          title: fields.title || 'Untitled',
          date: fields.date || new Date().toISOString().split('T')[0],
          uploadedAt: new Date().toISOString()
        };
        
        // Add to database
        imagesDb.unshift(imageRecord);
        saveImagesData();
        
        // Return success response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          image: {
            ...imageRecord,
            url: `/uploads/${newFilename}`
          }
        }));
      });
    });
    
    return;
  }
  
  // Handle GET for images list
  if (url === '/api/images' && method === 'get') {
    const imagesWithUrls = imagesDb.map(img => ({
      ...img,
      url: `/uploads/${img.filename}`
    }));
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(imagesWithUrls));
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