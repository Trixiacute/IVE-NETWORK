const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory');
}

// Load existing images data
let imagesDb = [];
try {
  const data = fs.readFileSync('images-db.json');
  imagesDb = JSON.parse(data);
  console.log(`Loaded ${imagesDb.length} images from database`);
} catch (err) {
  // No existing database or invalid JSON, start with empty array
  console.log('Starting with empty database');
  imagesDb = [];
}

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  const method = req.method.toLowerCase();
  const url = req.url;
  
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With');
  
  // Handle OPTIONS preflight requests
  if (method === 'options') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`${method.toUpperCase()} request for ${url}`);
  
  // GET request for all images
  if (url === '/api/images' && method === 'get') {
    console.log('Sending images list:', JSON.stringify(imagesDb).substring(0, 100) + '...');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(imagesDb));
    return;
  }
  
  // Basic upload endpoint
  if (url === '/api/upload' && method === 'post') {
    console.log('Handling file upload request');
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      console.log('Received upload data');
      
      // Generate a fake successful response
      const timestamp = Date.now();
      const newImage = {
        id: timestamp.toString(),
        url: '/uploads/sample.jpg',
        title: 'Uploaded Image',
        date: new Date().toISOString(),
        fileSize: 12345,
        fileType: 'image/jpeg'
      };
      
      // Add to database
      imagesDb.unshift(newImage);
      
      // Send success response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        image: newImage
      }));
    });
    
    return;
  }
  
  // Serve static files
  if (method === 'get' && !url.startsWith('/api/')) {
    // Strip query parameters
    const urlPath = url.split('?')[0];
    
    // Default to index.html if no path is specified
    const filePath = urlPath === '/' 
      ? path.join(__dirname, 'index.html') 
      : path.join(__dirname, urlPath);
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        // If file not found, serve index.html for client-side routing
        if (err.code === 'ENOENT') {
          fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
            if (err) {
              res.writeHead(500);
              res.end('Error loading index.html');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          });
        } else {
          // Other server error
          res.writeHead(500);
          res.end(`Server Error: ${err.code}`);
        }
        return;
      }
      
      // Determine content type based on file extension
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      
      switch (ext) {
        case '.js':
          contentType = 'text/javascript';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    });
    return;
  }
  
  // Handle unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
}); 