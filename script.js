// DOM Elements
const uploadForm = document.getElementById('upload-form');
const fileUpload = document.getElementById('file-upload');
const fileName = document.querySelector('.file-name');
const photoTitle = document.getElementById('photo-title');
const photoGallery = document.getElementById('photo-gallery');
const uploadBtn = document.querySelector('.upload-btn');
const uploadBtnContent = document.querySelector('.btn-content');
const serverStatus = document.getElementById('server-status');
const statusIndicator = document.querySelector('.status-indicator');
const statusText = document.querySelector('.status-text');
const retryConnectionBtn = document.getElementById('retry-connection');

// Admin elements
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminModal = document.getElementById('admin-modal');
const closeModalBtn = document.querySelector('.close-modal');
const adminLoginForm = document.getElementById('admin-login-form');
const adminPanel = document.getElementById('admin-panel');
const adminCloseBtn = document.getElementById('admin-close-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const adminGallery = document.getElementById('admin-gallery');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const adminUsernameDisplay = document.getElementById('admin-username-display');
const togglePasswordBtn = document.querySelector('.toggle-password');
const adminPassword = document.getElementById('admin-password');
const passwordField = document.querySelector('.password-field');
const totalImagesElement = document.getElementById('total-images');
const storageUsedElement = document.getElementById('storage-used');
const lastUploadElement = document.getElementById('last-upload');
const uploadTrendChart = document.getElementById('upload-trend-chart');

// Server configuration
const SERVER_HOST = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://localhost:3001';
const API_ENDPOINTS = {
    upload: `${SERVER_HOST}/api/upload`,
    images: `${SERVER_HOST}/api/images`,
    deleteImage: `${SERVER_HOST}/api/delete-image`
};

// Admin authentication - obscure the credentials
// Base64 encode the credentials to make them not immediately visible
const _a = "YWRha2l0YWtlY2U="; // Base64 encoded username
const _p = "aXZlbG92ZXIxMjM="; // Base64 encoded password

// Function to decode the credentials when needed
function getCredentials() {
    return {
        username: atob(_a),
        password: atob(_p)
    };
}

// Admin state
let isAdminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
let selectedImages = new Set();
let adminGalleryImages = [];
let uploadChart = null;
let adminStatistics = {
    totalImages: 0,
    storageUsed: 0,
    lastUpload: null,
    uploadTrends: {
        labels: [],
        data: []
    },
    fileTypes: {},
    popularDays: {}
};

// Server connection state
let isServerConnected = false;

// Admin panel variables
let statsRefreshInterval = null;
const STATS_REFRESH_INTERVAL = 30000; // 30 seconds

// Add retry connection button event listener if it exists
if (retryConnectionBtn) {
    retryConnectionBtn.addEventListener('click', () => {
        checkServerConnection();
        retryConnectionBtn.style.display = 'none';
        
        // Show checking status
        statusIndicator.className = 'status-indicator';
        statusText.textContent = 'Checking server...';
    });
}

// Admin Login button click
adminLoginBtn.addEventListener('click', () => {
    // If already logged in, just show the admin panel
    if (isAdminLoggedIn) {
        adminPanel.classList.add('active');
        
        // Refresh data when reopening
        loadAdminGallery();
        
        // Start statistics refresh interval
        startStatsRefreshInterval();
        
        return;
    }
    
    // Otherwise show the login modal
    adminModal.classList.add('active');
});

// Close modal on click
closeModalBtn.addEventListener('click', () => {
    adminModal.classList.remove('active');
});

// Close modal when clicking outside
adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
        adminModal.classList.remove('active');
    }
});

// Add clear fields button to admin login form
adminLoginForm.addEventListener('reset', () => {
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    
    // Remove any password field styling
    const passwordField = document.querySelector('.password-field');
    if (passwordField) {
        passwordField.classList.remove('focus');
    }
    
    // Reset any toggle button state
    const toggleBtn = document.querySelector('.toggle-password');
    if (toggleBtn) {
        toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
        toggleBtn.classList.remove('showing');
    }
});

// Add a helper function to clean credentials for checking
function sanitizeInput(str) {
    return str.trim().replace(/\s+/g, ' ');
}

// Admin login form submission
adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get input elements for easier reference
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    
    // Ensure the fields aren't null
    if (!usernameInput || !passwordInput) {
        console.error('Login form fields not found');
        showNotification('Login form error. Please refresh the page.', 'error');
        return;
    }
    
    // Clean the inputs to avoid whitespace issues
    const username = sanitizeInput(usernameInput.value);
    const password = passwordInput.value; // Don't trim password as it might contain significant spaces
    
    // Set loading state
    const loginBtn = adminLoginForm.querySelector('.admin-login-btn');
    const originalBtnText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    // Log attempt details for debugging
    console.log('Login attempt details:');
    console.log(`- Entered username: "${username}" (${username.length} chars)`);
    console.log(`- Expected username: "${getCredentials().username}" (${getCredentials().username.length} chars)`);
    console.log(`- Username match (case insensitive): ${username.toLowerCase() === getCredentials().username.toLowerCase()}`);
    console.log(`- Password length entered: ${password.length}`);
    console.log(`- Expected password length: ${getCredentials().password.length}`);
    console.log(`- Password match: ${password === getCredentials().password}`);
    
    // Simulate network delay (can be removed in production)
    setTimeout(() => {
        // More robust credential checking
        if (username.toLowerCase() === getCredentials().username.toLowerCase() && 
            password === getCredentials().password) {
            // Login successful
            console.log('Login successful');
            isAdminLoggedIn = true;
            
            // Save login state to localStorage
            localStorage.setItem('adminLoggedIn', 'true');
            
            adminModal.classList.remove('active');
            
            // Update admin button UI
            updateAdminButtonUI();
            
            // Display admin panel
            adminPanel.classList.add('active');
            adminUsernameDisplay.textContent = getCredentials().username; // Use the correct case from credentials
            
            // Load images in admin gallery
            loadAdminGallery();
            
            // Start the statistics refresh interval
            startStatsRefreshInterval();
            
            // Reset form and state
            adminLoginForm.reset();
            
            // Reset any visual feedback
            usernameInput.style.borderColor = '';
            passwordInput.style.borderColor = '';
        } else {
            // Login failed
            console.log('Login failed');
            
            // Specific feedback and visual indication
            if (username.toLowerCase() !== getCredentials().username.toLowerCase()) {
                showNotification('Invalid username', 'error');
                usernameInput.style.borderColor = 'rgba(244, 67, 54, 0.7)';
                usernameInput.focus();
            } else {
                showNotification('Invalid password', 'error');
                passwordInput.style.borderColor = 'rgba(244, 67, 54, 0.7)';
                passwordInput.focus();
            }
            
            // Shake the form for visual feedback
            const formContent = document.querySelector('.modal-content');
            formContent.classList.add('shake');
            setTimeout(() => formContent.classList.remove('shake'), 600);
            
            // Reset border color after a delay
            setTimeout(() => {
                usernameInput.style.borderColor = '';
                passwordInput.style.borderColor = '';
            }, 2000);
        }
        
        // Reset button state
        loginBtn.disabled = false;
        loginBtn.textContent = originalBtnText;
    }, 500); // Simulated delay for better UX feedback
});

// Function to start the stats refresh interval
function startStatsRefreshInterval() {
    // Clear any existing interval
    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
    }
    
    // Set new interval
    statsRefreshInterval = setInterval(() => {
        if (isAdminLoggedIn && adminPanel.classList.contains('active')) {
            console.log('Auto-refreshing admin statistics');
            
            // Fetch fresh data
            fetch(API_ENDPOINTS.images)
                .then(response => response.json())
                .then(images => {
                    adminGalleryImages = images;
                    updateAdminStatistics(images);
                })
                .catch(err => console.error('Failed to refresh statistics:', err));
        } else {
            // Stop refreshing if not logged in or panel is closed
            clearInterval(statsRefreshInterval);
            statsRefreshInterval = null;
        }
    }, STATS_REFRESH_INTERVAL);
}

// Admin panel close button
adminCloseBtn.addEventListener('click', () => {
    // Add a class for closing animation
    adminPanel.classList.add('closing');
    
    // Wait for animation to complete before removing active class
    setTimeout(() => {
        adminPanel.classList.remove('active');
        adminPanel.classList.remove('closing');
    }, 300);
    
    selectedImages.clear();
    updateDeleteButton();
    
    // Clear stats refresh interval when panel is closed
    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
        statsRefreshInterval = null;
    }
});

// Admin logout button
adminLogoutBtn.addEventListener('click', () => {
    isAdminLoggedIn = false;
    
    // Clear login state from localStorage
    localStorage.removeItem('adminLoggedIn');
    
    // Add closing animation
    adminPanel.classList.add('closing');
    
    // Wait for animation to complete
    setTimeout(() => {
        adminPanel.classList.remove('active');
        adminPanel.classList.remove('closing');
    }, 300);
    
    selectedImages.clear();
    adminGalleryImages = [];
    
    // Update admin button UI
    updateAdminButtonUI();
    
    // Clear stats refresh interval on logout
    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
        statsRefreshInterval = null;
    }
});

// Delete selected images button
deleteSelectedBtn.addEventListener('click', async () => {
    if (selectedImages.size === 0) return;
    
    const confirmDelete = confirm(`Are you sure you want to delete ${selectedImages.size} image(s)?`);
    if (!confirmDelete) return;
    
    try {
        // Create a loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <span class="loader"></span>
                <span>Deleting ${selectedImages.size} image(s)...</span>
            </div>
        `;
        
        // Style the overlay
        Object.assign(loadingOverlay.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
        });
        
        adminPanel.appendChild(loadingOverlay);
        
        // Process each image deletion one by one
        let successCount = 0;
        
        for (const imageId of selectedImages) {
            try {
                const response = await fetch(`${API_ENDPOINTS.deleteImage}/${imageId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to delete image ${imageId}:`, error);
            }
        }
        
        // Refresh galleries
        await loadImages();
        await loadAdminGallery();
        
        // Remove loading overlay
        adminPanel.removeChild(loadingOverlay);
        
        // Success message removed as requested
        
        // Clear selection
        selectedImages.clear();
        updateDeleteButton();
        
    } catch (error) {
        console.error('Error deleting images:', error);
        showNotification('Error deleting images. Please try again.', 'error');
    }
});

// Load admin gallery
async function loadAdminGallery() {
    try {
        const response = await fetch(API_ENDPOINTS.images);
        const images = await response.json();
        
        // Clear gallery first
        adminGallery.innerHTML = '';
        
        // Add each image to the gallery
        images.forEach(image => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'admin-gallery-item';
            galleryItem.dataset.id = image.id;
            
            // Create image element
            const img = new Image();
            
            // Add load event to handle image loading
            img.onload = function() {
                // Get the actual aspect ratio of the loaded image
                const aspectRatio = (img.naturalHeight / img.naturalWidth) * 100;
                
                // Create container with the correct aspect ratio
                const imageContainer = document.createElement('div');
                imageContainer.className = 'image-container';
                imageContainer.style.position = 'relative';
                imageContainer.style.width = '100%';
                imageContainer.style.paddingTop = `${aspectRatio}%`; // Set padding based on actual ratio
                imageContainer.style.overflow = 'hidden';
                
                img.style.position = 'absolute';
                img.style.top = '0';
                img.style.left = '0';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                
                imageContainer.appendChild(img);
                galleryItem.appendChild(imageContainer);
                
                // Set grid row spans based on actual image aspect ratio
                let rowSpan = Math.ceil(aspectRatio / 10); // Calculate rows based on aspect ratio
                
                // Set minimum and maximum row spans to ensure consistent layout
                rowSpan = Math.max(15, Math.min(rowSpan, 35));
                
                // Set the grid-row-end property
                galleryItem.style.gridRowEnd = `span ${rowSpan}`;
                
                // Add title overlay
                const itemTitle = document.createElement('div');
                itemTitle.className = 'item-title';
                itemTitle.textContent = image.title;
                galleryItem.appendChild(itemTitle);
            };
            
            // Set image source
            img.src = SERVER_HOST + image.url;
            img.alt = image.title;
            
            // Initial loader
            galleryItem.innerHTML = `
                <div class="gallery-item-loading">
                    <span class="loader"></span>
                </div>
            `;
            
            // Toggle selection on click
            galleryItem.addEventListener('click', () => {
                if (selectedImages.has(image.id)) {
                    selectedImages.delete(image.id);
                    galleryItem.classList.remove('selected');
                } else {
                    selectedImages.add(image.id);
                    galleryItem.classList.add('selected');
                }
                
                updateDeleteButton();
            });
            
            adminGallery.appendChild(galleryItem);
        });
        
        updateDeleteButton();
    } catch (error) {
        console.error('Error loading admin gallery:', error);
        adminGallery.innerHTML = '<p class="error-message">Failed to load images</p>';
    }
}

// Update delete button based on selection
function updateDeleteButton() {
    if (selectedImages.size > 0) {
        deleteSelectedBtn.disabled = false;
        deleteSelectedBtn.textContent = `Delete Selected (${selectedImages.size})`;
    } else {
        deleteSelectedBtn.disabled = true;
        deleteSelectedBtn.textContent = 'Delete Selected (0)';
    }
}

// Check server connection
async function checkServerConnection() {
    try {
        console.log('Checking server connection at:', SERVER_HOST);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${SERVER_HOST}/api/images`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
            cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        console.log('Server response status:', response.status);
        
        if (response.status >= 200 && response.status < 300) {
            console.log('Server is online!');
            isServerConnected = true;
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Server online';
            uploadBtn.disabled = false;
            
            if (retryConnectionBtn) {
                retryConnectionBtn.style.display = 'none';
            }
            
            // Try to load images from server
            loadImages();
            return true;
        } else {
            throw new Error(`Server returned status ${response.status}`);
        }
    } catch (error) {
        console.error('Server connection error:', error);
        isServerConnected = false;
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Server offline';
        uploadBtn.disabled = true;
        
        if (retryConnectionBtn) {
            retryConnectionBtn.style.display = 'flex';
        }
        
        // Show sample images
        initializeWithSampleImages();
        return false;
    }
}

// Make the entire file drop area respond to drag and drop
const fileDropArea = document.querySelector('.file-drop-area');
fileDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropArea.classList.add('drag-over');
});

fileDropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    fileDropArea.classList.remove('drag-over');
});

fileDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropArea.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length) {
        fileUpload.files = e.dataTransfer.files;
        handleFileSelection(e.dataTransfer.files[0]);
    }
});

// Make the file drop area clickable to select a file
fileDropArea.addEventListener('click', () => {
    fileUpload.click();
});

// Handle file selection and preview
function handleFileSelection(file) {
    if (!file) {
        fileName.textContent = 'No file selected';
        return;
    }
    
    // Show a loading indicator while generating preview
    fileName.textContent = `Processing ${file.name}...`;
    
    // Check if file is an image
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            // Create image element to check dimensions
            const img = new Image();
            img.onload = function() {
                const dimensions = `${img.width} × ${img.height}`;
                const fileSize = formatFileSize(file.size);
                
                // Update file name
                fileName.textContent = file.name;
                
                // Auto-fill title based on filename if empty
                if (!photoTitle.value) {
                    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                    // Convert to title case and replace underscores/hyphens with spaces
                    photoTitle.value = nameWithoutExt
                        .replace(/[-_]/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());
                }
            };
            
            img.onerror = function() {
                fileName.textContent = `Error: ${file.name}`;
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            fileName.textContent = `Error reading file`;
        };
        
        reader.readAsDataURL(file);
    } else {
        fileName.textContent = `Not an image file`;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Display file name when file is selected
fileUpload.addEventListener('change', (e) => {
    if (fileUpload.files.length > 0) {
        handleFileSelection(fileUpload.files[0]);
    } else {
        fileName.textContent = 'No file selected';
    }
});

// Add button feedback effects
uploadBtn.addEventListener('mousedown', () => {
    uploadBtn.style.transform = 'translateY(2px)';
    uploadBtn.style.boxShadow = '0 2px 8px rgba(255, 94, 133, 0.4)';
});

uploadBtn.addEventListener('mouseup', () => {
    uploadBtn.style.transform = '';
    uploadBtn.style.boxShadow = '';
});

// Handle form submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate form
    if (!fileUpload.files.length) {
        showNotification('Please select a file to upload', 'error');
        return;
    }

    const file = fileUpload.files[0];
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
        showNotification('Only image files are allowed', 'error');
        return;
    }
    
    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
        showNotification('File size exceeds 20MB limit', 'error');
        return;
    }

    // Disable the upload button and show loading state
    uploadBtn.disabled = true;
    uploadBtnContent.innerHTML = '<span class="loader"></span> Uploading...';
    
    // Reset progress bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.parentElement.style.display = 'block';
    }
    
    // Reset formData and create a new instance
    const formData = new FormData();
    formData.append('title', photoTitle.value || 'Untitled Image');

    // Now append the file with the correct field name to match server-side
    formData.append('file', file);
    
    try {
        // Show a progress bar during upload
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) progress = 90; // Cap at 90% until complete
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
                progressFill.nextElementSibling.textContent = `${Math.round(progress)}%`;
            }
        }, 300);
        
        // Check server connection first
        if (!isServerConnected) {
            clearInterval(progressInterval);
            throw new Error('Server is not connected. Please try again later.');
        }
        
        console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        // Set timeout for the fetch request - 30 seconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(`${API_ENDPOINTS.upload}`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        
        // Complete the progress bar
        if (progressFill) {
            progressFill.style.width = '100%';
            progressFill.nextElementSibling.textContent = '100%';
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `Upload failed with status ${response.status}`);
        }
        
        if (result.success) {
            // Add the image to the gallery
            const fullImageUrl = `${SERVER_HOST}${result.image.url}`;
            addImageToGallery(fullImageUrl, result.image.title);
            
            // Clear the form
            uploadForm.reset();
            fileName.textContent = 'No file selected';
            
            // Hide progress bar after a delay
            setTimeout(() => {
                if (progressFill) progressFill.parentElement.style.display = 'none';
            }, 2000);
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        
        let errorMessage = 'Failed to upload image';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Upload timed out. Please try again with a smaller file.';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        // Reset the button state
        uploadBtn.disabled = false;
        uploadBtnContent.textContent = 'Upload Photo';
    }
});

// Function to show notification
function showNotification(message, type = 'info') {
    // Remove any existing notifications to prevent duplicates
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => {
        if (notif.parentNode) {
            document.body.removeChild(notif);
        }
    });

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Set styles directly - tiny minimalist notification at bottom left
    notification.style.position = 'fixed';
    notification.style.bottom = '10px';
    notification.style.left = '10px'; // Changed to left for bottom left corner
    notification.style.backgroundColor = '#3498db';
    notification.style.color = 'white';
    notification.style.padding = '4px 8px';
    notification.style.borderRadius = '2px';
    notification.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
    notification.style.fontSize = '11px';
    notification.style.zIndex = '9999';
    notification.style.opacity = '1';
    notification.style.transition = 'opacity 0.3s ease';
    notification.style.maxWidth = '150px';
    notification.style.textAlign = 'center';
    notification.style.lineHeight = '1.2';
    notification.style.whiteSpace = 'nowrap';
    notification.style.overflow = 'hidden';
    notification.style.textOverflow = 'ellipsis';
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

// Function to show Pinterest-style notification with image
function showPinterestStyleNotification(message, type, imageUrl) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `pinterest-notification ${type}`;
    notification.innerHTML = `
        <div class="pinterest-notification-content">
            <div class="pinterest-notification-image">
                <img src="${imageUrl}" alt="Uploaded image">
            </div>
            <div class="pinterest-notification-message">
                <div class="pinterest-notification-title">Success!</div>
                <div class="pinterest-notification-subtitle">${message}</div>
            </div>
        </div>
    `;
    
    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        color: '#333',
        padding: '0',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        zIndex: '1000',
        transition: 'all 0.3s ease',
        opacity: '0',
        transform: 'translateY(20px)',
        overflow: 'hidden',
        width: '300px'
    });
    
    // Style the content
    const content = notification.querySelector('.pinterest-notification-content');
    Object.assign(content.style, {
        display: 'flex',
        alignItems: 'center',
        width: '100%'
    });
    
    // Style the image container
    const imageContainer = notification.querySelector('.pinterest-notification-image');
    Object.assign(imageContainer.style, {
        width: '70px',
        height: '70px',
        overflow: 'hidden',
        flexShrink: '0'
    });
    
    // Style the image
    const image = notification.querySelector('.pinterest-notification-image img');
    Object.assign(image.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    });
    
    // Style the message
    const messageContainer = notification.querySelector('.pinterest-notification-message');
    Object.assign(messageContainer.style, {
        padding: '12px',
        flexGrow: '1'
    });
    
    // Style the title
    const title = notification.querySelector('.pinterest-notification-title');
    Object.assign(title.style, {
        fontWeight: 'bold',
        fontSize: '16px',
        marginBottom: '4px'
    });
    
    // Style the subtitle
    const subtitle = notification.querySelector('.pinterest-notification-subtitle');
    Object.assign(subtitle.style, {
        fontSize: '14px',
        color: '#555'
    });
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Function to add an image to the gallery
function addImageToGallery(url, title, date) {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    
    // Set initial loading state
    galleryItem.innerHTML = `
        <div class="gallery-item-loading">
            <span class="loader"></span>
        </div>
    `;
    
    // Add to the beginning of the gallery
    photoGallery.insertBefore(galleryItem, photoGallery.firstChild);
    
    // Create image element
    const img = new Image();
    
    // Add load event to determine height based on aspect ratio
    img.onload = function() {
        // Get the actual aspect ratio of the loaded image
        const aspectRatio = (img.naturalHeight / img.naturalWidth) * 100;
        
        // Create a container with the correct aspect ratio
        galleryItem.innerHTML = '';
        
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        imageContainer.style.position = 'relative';
        imageContainer.style.width = '100%';
        imageContainer.style.paddingTop = `${aspectRatio}%`; // Set padding based on actual ratio
        imageContainer.style.overflow = 'hidden';
        
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        
        imageContainer.appendChild(img);
        galleryItem.appendChild(imageContainer);
        
        // Set grid row spans based on actual image aspect ratio
        let rowSpan = Math.ceil(aspectRatio / 6); // Calculate rows based on aspect ratio (6px per row)
        
        // Set minimum and maximum row spans to ensure consistent layout
        rowSpan = Math.max(20, Math.min(rowSpan, 40));
        
        // Set the grid-row-end property
        galleryItem.style.gridRowEnd = `span ${rowSpan}`;
        
        // Add image info for hover
        const galleryItemInfo = document.createElement('div');
        galleryItemInfo.className = 'gallery-item-info';
        
        const galleryItemTitle = document.createElement('div');
        galleryItemTitle.className = 'gallery-item-title';
        galleryItemTitle.textContent = title;
        
        galleryItemInfo.appendChild(galleryItemTitle);
        galleryItem.appendChild(galleryItemInfo);
    };
    
    img.onerror = function() {
        galleryItem.innerHTML = `
            <div class="gallery-item-error">Image failed to load</div>
            <div class="gallery-item-info">
                <div class="gallery-item-title">${title}</div>
            </div>
        `;
    };
    
    img.src = url;
    img.alt = title;
    
    return galleryItem;
}

// Fetch and display images from the server
async function loadImages() {
    try {
        const response = await fetch(API_ENDPOINTS.images);
        const images = await response.json();
        
        // Clear gallery first
        photoGallery.innerHTML = '';
        
        // Add each image to the gallery
        images.forEach(image => {
            // Add the server host to the image URL
            const fullImageUrl = `${SERVER_HOST}${image.url}`;
            addImageToGallery(fullImageUrl, image.title);
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
            title: "IVE Group Photo"
        },
        {
            url: "https://i.imgur.com/x2Xh5y4.jpg",
            title: "IVE Performance"
        },
        {
            url: "https://i.imgur.com/4fTOjft.jpg",
            title: "Wonyoung and Yujin"
        }
    ];
    
    sampleImages.forEach(image => {
        addImageToGallery(image.url, image.title);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if admin is logged in based on localStorage
    isAdminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    console.log('Admin login state on load:', isAdminLoggedIn);
    
    // Update the admin button UI on page load
    updateAdminButtonUI();
    
    // Automatically show admin panel if user is logged in
    if (isAdminLoggedIn) {
        // Display admin panel
        adminPanel.classList.add('active');
        adminUsernameDisplay.textContent = getCredentials().username;
        
        // Load images in admin gallery
        loadAdminGallery();
        
        // Start the statistics refresh interval
        startStatsRefreshInterval();
    }
    
    // Animate title and subtitle
    animateTitle();
    animateSubtitle();
    
    // Check server connection multiple times 
    checkServerConnection();
    
    // Retry connection after a short delay if first attempt fails
    setTimeout(() => {
        if (!isServerConnected) {
            console.log("Retrying server connection...");
            checkServerConnection();
        }
    }, 2000);
});

// Handle password field focus effects
if (adminPassword && passwordField) {
    adminPassword.addEventListener('focus', function() {
        passwordField.classList.add('focus');
    });
    
    adminPassword.addEventListener('blur', function() {
        passwordField.classList.remove('focus');
    });
}

// Toggle password visibility
if (togglePasswordBtn && adminPassword) {
    togglePasswordBtn.addEventListener('click', function() {
        // Toggle the password field type
        const type = adminPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        adminPassword.setAttribute('type', type);
        
        // Toggle password-visible class for consistent styling
        if (type === 'text') {
            adminPassword.classList.add('password-visible');
        } else {
            adminPassword.classList.remove('password-visible');
        }
        
        // Toggle the eye icon
        if (type === 'text') {
            this.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
            
            // Add a class for styling
            togglePasswordBtn.classList.add('showing');
        } else {
            this.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
            
            // Remove the class
            togglePasswordBtn.classList.remove('showing');
        }
        
        // Focus the password field after toggling
        adminPassword.focus();
    });
}

// Update admin statistics
function updateAdminStatistics(images) {
    if (!images || !Array.isArray(images)) return;
    
    // Update total images count with animation
    adminStatistics.totalImages = images.length;
    animateCounter(totalImagesElement, 0, adminStatistics.totalImages, 1000);
    
    // Calculate total storage used
    let totalSize = 0;
    const monthCounts = {};
    const fileTypes = {};
    const dayOfWeekCounts = {};
    let latestUpload = null;
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    images.forEach(image => {
        // Sum up file sizes
        totalSize += image.fileSize || 0;
        
        // Track the latest upload
        const uploadDate = image.date ? new Date(image.date) : null;
        if (uploadDate && (!latestUpload || uploadDate > latestUpload)) {
            latestUpload = uploadDate;
        }
        
        // Count images by month for the chart
        if (uploadDate) {
            const monthYear = `${uploadDate.getMonth() + 1}/${uploadDate.getFullYear().toString().substr(2)}`;
            monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;
            
            // Track day of week for popular day stat
            const dayOfWeek = dayNames[uploadDate.getDay()];
            dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
        }
        
        // Count file types
        if (image.fileType) {
            const fileType = image.fileType.toLowerCase();
            fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
        }
    });
    
    // Calculate most popular day
    let maxDay = 'N/A';
    let maxCount = 0;
    Object.entries(dayOfWeekCounts).forEach(([day, count]) => {
        if (count > maxCount) {
            maxCount = count;
            maxDay = day;
        }
    });
    adminStatistics.popularDays = { day: maxDay, count: maxCount };
    
    // Save file type stats
    adminStatistics.fileTypes = fileTypes;
    
    // Add file type distribution to top stats section if file types exist
    if (Object.keys(fileTypes).length > 0) {
        // Find the most common file type
        let maxType = '';
        let maxTypeCount = 0;
        Object.entries(fileTypes).forEach(([type, count]) => {
            if (count > maxTypeCount) {
                maxTypeCount = count;
                maxType = type;
            }
        });
        
        // Update file type distribution in HTML if element exists
        const fileTypeDistElement = document.getElementById('file-type-dist');
        if (fileTypeDistElement) {
            fileTypeDistElement.innerHTML = '';
            
            // Add a visual representation of file types
            Object.entries(fileTypes).forEach(([type, count]) => {
                const percentage = Math.round((count / images.length) * 100);
                const typeElement = document.createElement('div');
                typeElement.className = 'file-type-item';
                typeElement.innerHTML = `
                    <div class="file-type-label">${type.toUpperCase()}</div>
                    <div class="file-type-bar-wrapper">
                        <div class="file-type-bar" style="width: ${percentage}%"></div>
                        <span>${percentage}%</span>
                    </div>
                `;
                fileTypeDistElement.appendChild(typeElement);
            });
        }
        
        // Update most popular file type in HTML if element exists
        const popularTypeElement = document.getElementById('popular-type');
        if (popularTypeElement) {
            popularTypeElement.textContent = maxType ? `${maxType.toUpperCase()} (${maxTypeCount})` : 'None';
        }
    }
    
    // Update most popular day in HTML if element exists
    const popularDayElement = document.getElementById('popular-day');
    if (popularDayElement) {
        popularDayElement.textContent = maxCount > 0 ? `${maxDay} (${maxCount})` : 'None';
    }
    
    // Format and display storage used
    adminStatistics.storageUsed = totalSize;
    let formattedSize = '0 B';
    if (totalSize > 0) {
        if (totalSize < 1024) formattedSize = `${totalSize} B`;
        else if (totalSize < 1048576) formattedSize = `${(totalSize / 1024).toFixed(1)} KB`;
        else formattedSize = `${(totalSize / 1048576).toFixed(1)} MB`;
    }
    animateCounter(storageUsedElement, 0, totalSize, 1000, formattedSize);
    
    // Display latest upload time
    adminStatistics.lastUpload = latestUpload;
    if (latestUpload) {
        const now = new Date();
        const diffMs = now - latestUpload;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        let timeAgo;
        if (diffDays > 0) {
            timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffMinutes > 0) {
            timeAgo = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else {
            timeAgo = 'Just now';
        }
        
        lastUploadElement.textContent = timeAgo;
    } else {
        lastUploadElement.textContent = 'Never';
    }
    
    // Prepare chart data - sort by month
    const sortedMonths = Object.keys(monthCounts).sort((a, b) => {
        const [aMonth, aYear] = a.split('/').map(Number);
        const [bMonth, bYear] = b.split('/').map(Number);
        return (aYear - bYear) || (aMonth - bMonth);
    });
    
    adminStatistics.uploadTrends.labels = sortedMonths;
    adminStatistics.uploadTrends.data = sortedMonths.map(month => monthCounts[month]);
    
    // Update the chart
    updateUploadTrendChart();
}

// Animate counter for statistics
function animateCounter(element, start, end, duration, finalText = null) {
    if (!element) return;
    
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const startTime = new Date().getTime();
    const endTime = startTime + duration;
    
    function updateCounter() {
        const now = new Date().getTime();
        const remaining = Math.max((endTime - now) / duration, 0);
        const value = Math.round(end - (remaining * range));
        
        // If finalText is provided, use it at the end, otherwise just use the value
        if (finalText && now >= endTime) {
            element.textContent = finalText;
        } else {
            element.textContent = value;
        }
        
        if (value === end) {
            clearInterval(timer);
        }
    }
    
    // Update the counter right away
    updateCounter();
    
    // Then update it every stepTime milliseconds
    const timer = setInterval(updateCounter, stepTime);
}

// Create and update the upload trend chart
function updateUploadTrendChart() {
    if (!uploadTrendChart) return;
    
    const ctx = uploadTrendChart.getContext('2d');
    
    // Destroy previous chart if it exists
    if (uploadChart) {
        uploadChart.destroy();
    }
    
    // Check if we have data
    if (adminStatistics.uploadTrends.labels.length === 0) {
        ctx.font = '14px Poppins';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText('No upload data available', uploadTrendChart.width / 2, uploadTrendChart.height / 2);
        return;
    }
    
    // Chart configuration
    uploadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: adminStatistics.uploadTrends.labels,
            datasets: [{
                label: 'Image Uploads',
                data: adminStatistics.uploadTrends.data,
                fill: true,
                backgroundColor: 'rgba(255, 133, 162, 0.2)',
                borderColor: 'rgba(255, 94, 133, 1)',
                tension: 0.3,
                pointBackgroundColor: 'rgba(255, 255, 255, 1)',
                pointBorderColor: 'rgba(255, 94, 133, 1)',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(40, 40, 50, 0.9)',
                    titleColor: '#fff',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(255, 94, 133, 0.5)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            return `${tooltipItems[0].label}`;
                        },
                        label: function(context) {
                            return `${context.parsed.y} image${context.parsed.y !== 1 ? 's' : ''} uploaded`;
                        }
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Add this function after the admin login event listener
// Function to update admin button UI based on login state
function updateAdminButtonUI() {
    if (isAdminLoggedIn) {
        adminLoginBtn.textContent = 'Admin Panel';
        adminLoginBtn.classList.add('admin-logged-in');
    } else {
        adminLoginBtn.textContent = 'Admin Login';
        adminLoginBtn.classList.remove('admin-logged-in');
    }
}

// Animation functions for title and subtitle
function animateTitle() {
    document.body.classList.add('loaded');
    setTimeout(() => {
        const title = document.querySelector('.title');
        if (title) title.style.opacity = 1;
    }, 300);
}

function animateSubtitle() {
    setTimeout(() => {
        const subtitle = document.querySelector('.subtitle');
        if (subtitle) subtitle.style.opacity = 1;
    }, 500);
} 