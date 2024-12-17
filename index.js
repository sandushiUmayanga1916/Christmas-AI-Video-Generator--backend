const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); 
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' })); 

// In-memory storage for wishes (in a real application, use a database)
const wishes = [];

const uploadsDir = path.join(__dirname, 'uploads');
const createUploadsDir = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
};

createUploadsDir();

// Logging middleware
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.path}`);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  next();
});

// GET endpoint to retrieve wishes
// GET endpoint to retrieve wishes
app.get('/submit-wish', (req, res) => {
  try {
    // Optional query parameters for filtering
    const { 
      name, 
      email, 
      phone_number, 
      input_text, 
      gender, 
      temp_image_path,
      user_photo_path
    } = req.query;

    // Filter wishes based on query parameters
    let filteredWishes = wishes;

    if (name) {
      filteredWishes = filteredWishes.filter(wish => 
        wish.name.toLowerCase().includes(name.toLowerCase())
      );
    }

    if (email) {
      filteredWishes = filteredWishes.filter(wish => 
        wish.email.toLowerCase().includes(email.toLowerCase())
      );
    }

    if (phone_number) {
      filteredWishes = filteredWishes.filter(wish => 
        wish.phone_number.includes(phone_number)
      );
    }

    if (input_text) {
      filteredWishes = filteredWishes.filter(wish => 
        wish.input_text.toLowerCase().includes(input_text.toLowerCase())
      );
    }

    if (gender) {
      filteredWishes = filteredWishes.filter(wish => 
        wish.gender.toLowerCase() === gender.toLowerCase()
      );
    }

    if (temp_image_path) {
      filteredWishes = filteredWishes.filter(wish => 
        wish.temp_image_path === temp_image_path
      );
    }

    if (user_photo_path) {
      filteredWishes = filteredWishes.filter(wish => 
        wish.user_photo_path === user_photo_path
      );
    }

    res.status(200).json({
      message: 'List of submitted wishes',
      total: filteredWishes.length,
      wishes: filteredWishes.map(wish => ({
        id: wish.id,
        name: wish.name,
        email: wish.email,
        phone_number: wish.phone_number,
        gender: wish.gender,
        input_text: wish.input_text,
        temp_image_path: wish.temp_image_path,
        user_photo_path: wish.user_photo_path,
        createdAt: wish.createdAt
      }))
    });
  } catch (error) {
    console.error('Error retrieving wishes:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve wishes', 
      details: error.message 
    });
  }
});

// POST endpoint to submit a wish
app.post('/submit-wish', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone_number, 
      input_text, 
      gender, 
      temp_image_path,
      user_photo_path 
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone_number || !input_text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Phone number validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Handle photo upload
    let photoPath = null;
    if (user_photo_path) {
      // Remove data URL prefix if exists
      const base64Data = user_photo_path.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const photoFilename = `wish-photo-${uuidv4()}.jpg`;
      photoPath = path.join(uploadsDir, photoFilename);
      
      await fs.writeFile(photoPath, buffer);
    }

    // Create wish object
    const wishDetails = {
      id: uuidv4(),
      name,
      email,
      phone_number,
      input_text,
      gender,
      temp_image_path,
      user_photo_path: photoPath ? path.relative(__dirname, photoPath) : null,
      createdAt: new Date().toISOString(),
    };

    // Store wish
    wishes.push(wishDetails);

    // Prepare response (remove sensitive or large data)
    const responseWish = { ...wishDetails };
    delete responseWish.user_photo_path;

    res.status(201).json({
      message: 'Wish submitted successfully!',
      wish: responseWish,
    });

  } catch (error) {
    console.error('Error submitting wish:', error);

    res.status(500).json({ 
      error: 'Submission failed', 
      details: error.message 
    });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

module.exports = app;