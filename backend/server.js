const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config({ path: '../.env'});

const app = express();

// Configure CORS
app.use(cors({
    origin: 'http://localhost:3000', // React app's URL
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

// Middleware
app.use(bodyParser.json());


// Log middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// Import routes
const summarizeRoute = require('./api/summarize');

// Use routes
app.use('/api/summarize', summarizeRoute);

// Handle middlware errors
app.use((err, rq, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});