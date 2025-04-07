// DOM Elements
const uploadForm = document.getElementById('upload-form');
const fileUpload = document.getElementById('file-upload');
const fileName = document.getElementById('file-name');
const photoTitle = document.getElementById('photo-title');
const photoDate = document.getElementById('photo-date');
const photoGallery = document.getElementById('photo-gallery');
const linkCards = document.querySelectorAll('.link-card');

// Set current date as default for date input
const today = new Date().toISOString().split('T')[0];
photoDate.value = today;

// Display file name when file is selected
fileUpload.addEventListener('change', () => {
    if (fileUpload.files.length > 0) {
        fileName.textContent = fileUpload.files[0].name;
    } else {
        fileName.textContent = 'Tidak ada file yang dipilih';
    }
});

// Handle form submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (fileUpload.files.length === 0) {
        alert('Please select an image to upload');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo', fileUpload.files[0]);
    formData.append('title', photoTitle.value);
    formData.append('date', photoDate.value);
    
    try {
        // Show loading state
        const uploadBtn = uploadForm.querySelector('.upload-btn');
        const originalBtnText = uploadBtn.textContent;
        uploadBtn.textContent = 'Uploading...';
        uploadBtn.disabled = true;
        
        // Send the form data to the server
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Add the new image to the gallery
            addImageToGallery(result.image.url, result.image.title, result.image.date);
            
            // Reset the form
            uploadForm.reset();
            fileName.textContent = 'Tidak ada file yang dipilih';
            photoDate.value = today;
            
            // Show success message
            alert('Image uploaded successfully!');
        } else {
            alert(`Upload failed: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image. Please try again.');
    } finally {
        // Restore button state
        const uploadBtn = uploadForm.querySelector('.upload-btn');
        uploadBtn.textContent = 'Upload';
        uploadBtn.disabled = false;
    }
});

// Function to add an image to the gallery
function addImageToGallery(url, title, date) {
    // Create gallery item element
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    galleryItem.innerHTML = `
        <img src="${url}" alt="${title}">
        <div class="gallery-item-info">
            <div class="gallery-item-title">${title}</div>
            <div class="gallery-item-date">${formatDate(date)}</div>
        </div>
    `;
    
    // Add to the beginning of the gallery
    photoGallery.insertBefore(galleryItem, photoGallery.firstChild);
    
    // Apply fade-in animation
    galleryItem.style.animation = 'fadeIn 0.5s forwards';
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Fetch and display images from the server
async function loadImages() {
    try {
        const response = await fetch('/api/images');
        const images = await response.json();
        
        // Clear gallery first
        photoGallery.innerHTML = '';
        
        // Add each image to the gallery
        images.forEach(image => {
            addImageToGallery(image.url, image.title, image.date);
        });
    } catch (error) {
        console.error('Error loading images:', error);
        // If server fetch fails, show sample images instead
        initializeWithSampleImages();
    }
}

// Initialize with sample images if server is not available
function initializeWithSampleImages() {
    const sampleImages = [
        {
            url: "https://i.imgur.com/JQZJimN.jpg",
            title: "IVE Group Photo",
            date: "2023-06-15"
        },
        {
            url: "https://i.imgur.com/x2Xh5y4.jpg",
            title: "IVE Performance",
            date: "2023-05-22"
        },
        {
            url: "https://i.imgur.com/4fTOjft.jpg",
            title: "Wonyoung and Yujin",
            date: "2023-07-10"
        }
    ];
    
    sampleImages.forEach(image => {
        addImageToGallery(image.url, image.title, image.date);
    });
}

// Add hover effects to link cards
linkCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.querySelector('.link-icon').textContent = '➔';
    });
    
    card.addEventListener('mouseleave', () => {
        card.querySelector('.link-icon').textContent = '→';
    });
});

// Add a subtle animation to the page on load
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    
    // Add animations
    setTimeout(() => {
        document.querySelector('.title').style.opacity = 1;
        document.querySelector('.subtitle').style.opacity = 1;
    }, 300);
    
    // Try to load images from server
    loadImages();
}); 