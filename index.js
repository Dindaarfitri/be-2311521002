const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
  host: '34.101.233.80',
  user: 'root',
  password: 'KomputasiAwan2026!',
  database: 'db_2311521002',
  connectTimeout: 30000,
  acquireTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 5,
};

// Create pool
const pool = mysql.createPool(dbConfig);

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('DATABASE CONNECTED');
    connection.release();
  } catch (err) {
    console.error('DATABASE ERROR:', err);
  }
})();

// Helper function to initialize database tables
async function initDb() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_makanan VARCHAR(100) NOT NULL,
        kategori VARCHAR(50) NOT NULL,
        harga INT NOT NULL,
        deskripsi TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    connection.release();
    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database tables:', err.message);
  }
}

// Validation function
function validateFood(reqBody) {
  const { nama_makanan, kategori, harga } = reqBody;
  if (nama_makanan === undefined || nama_makanan === null || String(nama_makanan).trim() === "") {
    return false;
  }
  if (kategori === undefined || kategori === null || String(kategori).trim() === "") {
    return false;
  }
  if (harga === undefined || harga === null || String(harga).trim() === "") {
    return false;
  }
  return true;
}

// Endpoints
// 0. GET / (root - for frontend connection test)
app.get('/', (req, res) => {
  return res.status(200).json({
    "status": "success",
    "message": "Backend API for Manajemen Data Makanan",
    "student": {
      "name": "Dinda Arfitri",
      "nim": "2311521002"
    }
  });
});

// 1. GET /health
app.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return res.status(200).json({
      "status": "success",
      "message": "Backend is running",
      "database": "connected",
      "student": {
        "name": "Dinda Arfitri",
        "nim": "2311521002"
      }
    });
  } catch (error) {
    console.error('Healthcheck DB Error:', error.message);
    return res.status(500).json({
      "status": "error",
      "message": error.message,
      "database": "disconnected",
      "student": {
        "name": "Dinda Arfitri",
        "nim": "2311521002"
      }
    });
  }
});

// 2. GET /schema
app.get('/schema', (req, res) => {
  return res.status(200).json({
    "student": {
      "name": "Dinda Arfitri",
      "nim": "2311521002"
    },
    "resource": {
      "name": "foods",
      "label": "Data Makanan",
      "description": "Aplikasi untuk mengelola data makanan beserta kategori, harga, dan deskripsinya"
    },
    "fields": [
      {
        "name": "nama_makanan",
        "label": "Nama Makanan",
        "type": "text",
        "required": true,
        "showInTable": true
      },
      {
        "name": "kategori",
        "label": "Kategori",
        "type": "text",
        "required": true,
        "showInTable": true
      },
      {
        "name": "harga",
        "label": "Harga",
        "type": "number",
        "required": true,
        "showInTable": true
      },
      {
        "name": "deskripsi",
        "label": "Deskripsi",
        "type": "text",
        "required": false,
        "showInTable": true
      }
    ],
    "endpoints": {
      "list": "/foods",
      "detail": "/foods/{id}",
      "create": "/foods",
      "update": "/foods/{id}",
      "delete": "/foods/{id}"
    }
  });
});

// 3. GET /foods
app.get('/foods', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM foods ORDER BY id DESC');
    return res.status(200).json({
      "status": "success",
      "message": "Data retrieved successfully",
      "data": rows
    });
  } catch (error) {
    console.error('GET /foods Error:', error.message);
    return res.status(500).json({
      "status": "error",
      "message": "Database error occurred"
    });
  }
});

// 4. GET /foods/:id
app.get('/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM foods WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        "status": "error",
        "message": "Data not found"
      });
    }

    return res.status(200).json({
      "status": "success",
      "message": "Data retrieved successfully",
      "data": rows[0]
    });
  } catch (error) {
    console.error('GET /foods/:id Error:', error.message);
    return res.status(500).json({
      "status": "error",
      "message": "Database error occurred"
    });
  }
});

// 5. POST /foods
app.post('/foods', async (req, res) => {
  try {
    if (!validateFood(req.body)) {
      return res.status(400).json({
        "status": "error",
        "message": "Validation failed: nama_makanan, kategori, and harga are required fields and cannot be empty"
      });
    }

    const { nama_makanan, kategori, harga, deskripsi } = req.body;
    const [result] = await pool.query(
      'INSERT INTO foods (nama_makanan, kategori, harga, deskripsi) VALUES (?, ?, ?, ?)',
      [nama_makanan, kategori, Number(harga), deskripsi || null]
    );

    const [rows] = await pool.query('SELECT * FROM foods WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      "status": "success",
      "message": "Data created successfully",
      "data": rows[0]
    });
  } catch (error) {
    console.error('POST /foods Error:', error.message);
    return res.status(500).json({
      "status": "error",
      "message": "Database error occurred"
    });
  }
});

// 6. PUT /foods/:id
app.put('/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateFood(req.body)) {
      return res.status(400).json({
        "status": "error",
        "message": "Validation failed: nama_makanan, kategori, and harga are required fields and cannot be empty"
      });
    }

    const [existing] = await pool.query('SELECT * FROM foods WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        "status": "error",
        "message": "Data not found"
      });
    }

    const { nama_makanan, kategori, harga, deskripsi } = req.body;
    await pool.query(
      'UPDATE foods SET nama_makanan = ?, kategori = ?, harga = ?, deskripsi = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nama_makanan, kategori, Number(harga), deskripsi || null, id]
    );

    const [rows] = await pool.query('SELECT * FROM foods WHERE id = ?', [id]);

    return res.status(200).json({
      "status": "success",
      "message": "Data updated successfully",
      "data": rows[0]
    });
  } catch (error) {
    console.error('PUT /foods/:id Error:', error.message);
    return res.status(500).json({
      "status": "error",
      "message": "Database error occurred"
    });
  }
});

// 7. DELETE /foods/:id
app.delete('/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM foods WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        "status": "error",
        "message": "Data not found"
      });
    }

    await pool.query('DELETE FROM foods WHERE id = ?', [id]);

    return res.status(200).json({
      "status": "success",
      "message": "Data deleted successfully"
    });
  } catch (error) {
    console.error('DELETE /foods/:id Error:', error.message);
    return res.status(500).json({
      "status": "error",
      "message": "Database error occurred"
    });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`Backend server running on port ${PORT}`);
  await initDb();
});
