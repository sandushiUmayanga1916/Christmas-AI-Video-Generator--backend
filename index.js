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

app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.path}`);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  next();
});


app.get('/submit-wish', (req, res) => {
  res.status(200).json({
    message: 'List of all submitted wishes',
    wishes,
  });
});


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


    if (!name || !email || !phone_number || !input_text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }


    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }


    let photoPath = null;
    if (user_photo_path) {
      // Remove data URL prefix if exists
      const base64Data = user_photo_path.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const photoFilename = `wish-photo-${uuidv4()}.jpg`;
      photoPath = path.join(uploadsDir, photoFilename);
      
      await fs.writeFile(photoPath, buffer);
    }


    const wishDetails = {
      id: uuidv4(),
      name,
      email,
      phone_number,
      input_text,
      gender,
      temp_image_path,
      user_photo_path: photoPath ? path.relative(__dirname, photoPath) : null,
      createdAt: new Date(),
    };


    wishes.push(wishDetails);


    res.status(200).json({
      message: 'Wish submitted successfully!',
      wish: wishDetails,
    });

  } catch (error) {
    console.error('Error submitting wish:', error);

    res.status(500).json({ 
      error: 'Submission failed', 
      details: error.message 
    });
  }
});


app.get('/', (req, res) => {
  res.json({ 
    message: 'Christmas Wish Submission Backend is running',
    endpoints: ['/submit-wish (GET)', '/submit-wish (POST)']
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});


process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

module.exports = app;