# IVE Network - Photo Sharing Website

A fan website inspired by fan network sites, featuring real-time photo uploads with titles and dates. This website allows fans to share and view IVE photos in a beautiful, Pinterest-like gallery.

## Preview

![IVE Network Homepage](https://i.imgur.com/Qjmm9cT.png)

### Website Features Preview:

- **Dark Theme Interface**: Modern dark UI with gradient accents
- **Upload Section**: Add photos with titles and dates
- **Gallery Display**: Grid layout showing all uploaded photos
- **Social Links**: Quick access to official IVE accounts

The website is optimized for both desktop and mobile viewing experiences.

## Features

- **Photo Upload**: Upload images with titles and dates
- **Real-time Gallery**: View uploaded images immediately in the gallery
- **Persistent Storage**: Images and metadata are saved on the server
- **Responsive Design**: Works well on mobile and desktop
- **Clean UI**: Dark theme with grid-based photo gallery

## Tech Stack

- Frontend: HTML, CSS, JavaScript (vanilla)
- Backend: Node.js with formidable for file uploads
- Storage: Local file system with JSON database

## Getting Started

### Prerequisites

- Node.js (v12 or higher)
- NPM or Yarn

### Installation

1. Clone this repository
```bash
git clone https://github.com/Trixiacute/IVE-NETWORK.git
cd IVE-NETWORK
```

2. Install dependencies
```bash
npm install
```

3. Start the server
```bash
npm start
```

4. Open your browser and go to `http://localhost:3000`

## Usage

### Uploading Images

1. Fill in the photo title
2. Select a date (defaults to today)
3. Click "PILIH FILE" to select an image
4. Click "Upload" to submit

The image will appear at the top of the gallery immediately after upload.

### Viewing the Gallery

The gallery displays all uploaded images in a grid layout, sorted by most recent first. Each image shows:
- The image itself
- Title
- Upload date

## Deployment

This application can be deployed to any Node.js hosting platform:

- Heroku
- Vercel
- Netlify (with serverless functions)
- AWS, Google Cloud, or Azure

## Customization

### Styling

Modify `styles.css` to change:
- Color scheme
- Layout
- Fonts
- Animation effects

### Backend

The server uses a simple file-based storage system. For production use, consider:
- Adding a proper database (MongoDB, PostgreSQL)
- Implementing user authentication
- Adding image optimization

## License

This project is available for personal and non-commercial use.

## Acknowledgements

- Images used in the sample gallery are for demonstration purposes only 