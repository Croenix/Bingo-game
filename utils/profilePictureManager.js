const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const JSON_FILE_PATH = path.join(__dirname, '..', 'profilePictures.json');

let cachedPictures = null;
let lastReadTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache

/**
 * Ensures profilePictures.json exists and returns array of image URLs (cached in memory).
 * @returns {string[]} Array of profile picture image URLs
 */
function getProfilePictures() {
  const now = Date.now();
  if (cachedPictures !== null && now - lastReadTime < CACHE_TTL_MS) {
    return [...cachedPictures];
  }
  try {
    if (!fs.existsSync(JSON_FILE_PATH)) {
      fs.writeFileSync(JSON_FILE_PATH, JSON.stringify([], null, 2), 'utf8');
      cachedPictures = [];
      lastReadTime = now;
      return [];
    }
    const data = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const parsed = JSON.parse(data);
    cachedPictures = Array.isArray(parsed) ? parsed : [];
    lastReadTime = now;
    return [...cachedPictures];
  } catch (err) {
    console.error('Error reading profilePictures.json:', err.message);
    return cachedPictures || [];
  }
}

/**
 * Saves profile picture array to profilePictures.json and updates in-memory cache.
 * @param {string[]} pictures
 */
function saveProfilePictures(pictures) {
  try {
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(pictures, null, 2), 'utf8');
    cachedPictures = [...pictures];
    lastReadTime = Date.now();
  } catch (err) {
    console.error('Error writing to profilePictures.json:', err.message);
    throw err;
  }
}

/**
 * Adds a direct profile picture URL if not already existing.
 * @param {string} url - Direct image URL
 * @returns {string[]} Updated list of image URLs
 */
function addProfilePicture(url) {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) {
    throw new Error('Image URL cannot be empty');
  }
  const pictures = getProfilePictures();
  if (!pictures.includes(cleanUrl)) {
    pictures.push(cleanUrl);
    saveProfilePictures(pictures);
  }
  return pictures;
}

/**
 * Deletes a profile picture URL from profilePictures.json.
 * @param {string} url - Image URL to delete
 * @returns {string[]} Updated list of image URLs
 */
function deleteProfilePicture(url) {
  const cleanUrl = String(url || '').trim();
  let pictures = getProfilePictures();
  pictures = pictures.filter(item => item !== cleanUrl);
  saveProfilePictures(pictures);
  return pictures;
}

/**
 * Selects a random profile picture URL from profilePictures.json.
 * @returns {string} Random profile picture URL or default fallback
 */
function getRandomProfilePicture() {
  const pictures = getProfilePictures();
  if (pictures.length === 0) {
    // Fallback if no images uploaded yet
    return '';
  }
  const randomIndex = Math.floor(Math.random() * pictures.length);
  return pictures[randomIndex];
}

/**
 * Uploads base64/image file data to ImgBB API and saves direct URL into profilePictures.json.
 * @param {string} base64Data - Base64 encoded image string or raw data
 * @param {string} apiKey - ImgBB API Key
 * @returns {Promise<string>} Direct URL of uploaded image
 */
function uploadToImgBB(base64Data, apiKey) {
  return new Promise((resolve, reject) => {
    const key = String(apiKey || process.env.IMGBB_API_KEY || '').trim();
    if (!key) {
      return reject(new Error('ImgBB API key is required. Please provide a valid ImgBB API key.'));
    }

    let cleanBase64 = String(base64Data || '').trim();
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    if (!cleanBase64) {
      return reject(new Error('No image data provided for upload'));
    }

    const postData = new URLSearchParams({
      key: key,
      image: cleanBase64
    }).toString();

    const options = {
      hostname: 'api.imgbb.com',
      port: 443,
      path: '/1/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode === 200 && response.success && response.data && response.data.url) {
            const imageUrl = response.data.url;
            addProfilePicture(imageUrl);
            resolve(imageUrl);
          } else {
            const errorMsg = (response.error && response.error.message) || response.message || `ImgBB Upload failed (HTTP ${res.statusCode})`;
            reject(new Error(errorMsg));
          }
        } catch (e) {
          reject(new Error(`Failed to parse ImgBB response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`ImgBB upload connection error: ${err.message}`));
    });

    req.write(postData);
    req.end();
  });
}

module.exports = {
  getProfilePictures,
  addProfilePicture,
  deleteProfilePicture,
  getRandomProfilePicture,
  uploadToImgBB
};
