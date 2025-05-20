// backend/server.js

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // verbose gives more detailed stack traces
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Use secret from .env

// Middleware
app.use(cors()); // Enable CORS for all routes (important for frontend communication)
app.use(express.json()); // Enable parsing of JSON request bodies

// Database Setup
// In a real application, you might use a separate file for database logic
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create tables if they don't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            url TEXT NOT NULL,
            title TEXT,
            favicon TEXT,
            summary TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`);
        console.log('Tables "users" and "bookmarks" checked/created.');
    }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // No token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = user; // Attach user information (e.g., userId) to the request
        next();
    });
};

// --- API Routes ---

// 1. Sign-up
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash password with salt rounds 10

        db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: users.email')) {
                    return res.status(409).json({ message: 'Email already registered.' });
                }
                console.error('Error during sign-up:', err.message);
                return res.status(500).json({ message: 'Error during sign-up.' });
            }
            res.status(201).json({ message: 'User registered successfully!' });
        });
    } catch (error) {
        console.error('Hashing error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// 2. Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('Error during login:', err.message);
            return res.status(500).json({ message: 'Internal server error.' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        try {
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            // Generate JWT token
            const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ message: 'Logged in successfully!', token: token });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Internal server error.' });
        }
    });
});

// 3. Save a Bookmark (Requires Authentication)
app.post('/api/bookmarks', authenticateToken, async (req, res) => {
    const { url } = req.body;
    const userId = req.user.userId; // Get userId from the authenticated token

    if (!url) {
        return res.status(400).json({ message: 'URL is required.' });
    }

    // --- Fetch Title, Favicon, and Summary ---
    // This is the core logic for fetching external data.
    // In a production app, you might want to use a dedicated service for this.

    let title = '';
    let favicon = '';
    let summary = '';

    try {
        // Fetch HTML to extract title and potentially OpenGraph tags for favicon
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Failed to fetch URL ${url}: ${response.statusText}`);
            // Still proceed, just without title/favicon
        } else {
            const html = await response.text();
            // Basic title extraction
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
            }

            // Basic favicon extraction (looking for common patterns)
            const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]+href=["'](.*?)["']/i);
            if (faviconMatch && faviconMatch[1]) {
                // Construct absolute URL for favicon if it's relative
                const parsedUrl = new URL(url);
                favicon = new URL(faviconMatch[1], parsedUrl.origin).href;
            } else {
                // Fallback to default /favicon.ico
                const parsedUrl = new URL(url);
                favicon = `${parsedUrl.origin}/favicon.ico`;
            }
        }
    } catch (error) {
        console.error(`Error fetching title/favicon for ${url}:`, error.message);
        // Continue without title/favicon
    }

    // Call Jina AI Auto-Summary API
    // See Appendix A of the challenge brief
    try {
        const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                'Accept': 'application/json' // Request JSON summary
            }
        });
        if (jinaResponse.ok) {
            const jinaData = await jinaResponse.json();
            // Jina AI's response structure might vary; check their docs or test it.
            // Assuming the summary is directly in the response body or a key like 'summary'
            summary = jinaData.content || jinaData.summary || 'No summary available.'; // Adjust based on actual Jina response
        } else {
            console.warn(`Jina AI summary failed for ${url}: ${jinaResponse.statusText}`);
            summary = 'Failed to generate summary.';
        }
    } catch (error) {
        console.error(`Error calling Jina AI for ${url}:`, error.message);
        summary = 'Error generating summary.';
    }

    db.run(
        'INSERT INTO bookmarks (userId, url, title, favicon, summary) VALUES (?, ?, ?, ?, ?)',
        [userId, url, title, favicon, summary],
        function (err) {
            if (err) {
                console.error('Error saving bookmark:', err.message);
                return res.status(500).json({ message: 'Error saving bookmark.' });
            }
            res.status(201).json({ id: this.lastID, url, title, favicon, summary, message: 'Bookmark saved!' });
        }
    );
});

// 4. Get User's Bookmarks (Requires Authentication)
app.get('/api/bookmarks', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    db.all('SELECT * FROM bookmarks WHERE userId = ? ORDER BY createdAt DESC', [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching bookmarks:', err.message);
            return res.status(500).json({ message: 'Error fetching bookmarks.' });
        }
        res.json(rows);
    });
});

// 5. Delete a Bookmark (Requires Authentication)
app.delete('/api/bookmarks/:id', authenticateToken, (req, res) => {
    const bookmarkId = req.params.id;
    const userId = req.user.userId;

    db.run('DELETE FROM bookmarks WHERE id = ? AND userId = ?', [bookmarkId, userId], function (err) {
        if (err) {
            console.error('Error deleting bookmark:', err.message);
            return res.status(500).json({ message: 'Error deleting bookmark.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Bookmark not found or not authorized.' });
        }
        res.status(200).json({ message: 'Bookmark deleted successfully.' });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});