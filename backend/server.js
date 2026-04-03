const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

app.listen(port, async () => {
    console.log(`Server is running on port: ${port}`);
    try {
        const res = await db.query('SELECT NOW()');
        console.log('Database connected successfully:', res.rows[0].now);
    } catch (err) {
        console.error('Failed to connect to the database:', err.message);
    }
});
