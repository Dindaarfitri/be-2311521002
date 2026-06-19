const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

/* =========================
   DATABASE CONFIG (FIXED)
========================= */
const dbConfig = {
  host: '34.101.233.80',
  user: 'appuser', // WAJIB user baru (bukan root)
  password: 'App12345!',
  database: 'db_2311521002',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  connectTimeout: 30000
};

const pool = mysql.createPool(dbConfig);

/* =========================
   TEST DATABASE CONNECTION
========================= */
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ DATABASE CONNECTED');
    conn.release();
  } catch (err) {
    console.error('❌ DATABASE CONNECTION ERROR:');
    console.error(err.message);
  }
})();

/* =========================
   INIT TABLE
========================= */
async function initDb() {
  try {
    const conn = await pool.getConnection();

    await conn.query(`
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

    conn.release();
    console.log('✅ TABLE READY');
  } catch (err) {
    console.error('❌ INIT DB ERROR:', err.message);
  }
}

/* =========================
   VALIDATION
========================= */
function validateFood(data) {
  const { nama_makanan, kategori, harga } = data;

  if (!nama_makanan || String(nama_makanan).trim() === '') return false;
  if (!kategori || String(kategori).trim() === '') return false;
  if (harga === undefined || harga === null || String(harga).trim() === '') return false;

  return true;
}

/* =========================
   ROOT TEST
========================= */
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API Food Management Running',
    student: {
      name: 'Dinda Arfitri',
      nim: '2311521002'
    }
  });
});

/* =========================
   HEALTH CHECK
========================= */
app.get('/health', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    conn.release();

    res.json({
      status: "success",
      message: "Backend is running",
      database: "connected",
      student: {
        name: "Dinda Arfitri",
        nim: "2311521002"
      }
    });

  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Backend is running, but database is not connected",
      database: "disconnected",
      student: {
        name: "Dinda Arfitri",
        nim: "2311521002"
      }
    });
  }
});

app.get('/schema', (req, res) => {
  res.json({
    student: {
      name: "Dinda Arfitri",
      nim: "2311521002"
    },
    resource: {
      name: "foods",
      label: "Data Makanan",
      description: "Aplikasi untuk mengelola data makanan"
    },
    fields: [
      {
        name: "nama_makanan",
        label: "Nama Makanan",
        type: "text",
        required: true,
        showInTable: true
      },
      {
        name: "kategori",
        label: "Kategori",
        type: "text",
        required: true,
        showInTable: true
      },
      {
        name: "harga",
        label: "Harga",
        type: "number",
        required: true,
        showInTable: true
      },
      {
        name: "deskripsi",
        label: "Deskripsi",
        type: "text",
        required: false,
        showInTable: true
      }
    ],
    endpoints: {
      list: "/foods",
      search: "/foods?search={keyword}",
      detail: "/foods/:id",
      create: "/foods",
      update: "/foods/:id",
      delete: "/foods/:id"
    }
  });
});

/* =========================
   GET ALL FOODS (with search)
========================= */
app.get('/foods', async (req, res) => {
  try {
    const { search } = req.query;
    let rows;

    if (search && String(search).trim() !== '') {
      const keyword = `%${String(search).trim()}%`;
      [rows] = await pool.query(
        `SELECT * FROM foods 
         WHERE nama_makanan LIKE ? 
            OR kategori LIKE ? 
            OR deskripsi LIKE ? 
         ORDER BY id DESC`,
        [keyword, keyword, keyword]
      );
    } else {
      [rows] = await pool.query(
        'SELECT * FROM foods ORDER BY id DESC'
      );
    }

    res.json({
      status: 'success',
      data: rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

/* =========================
   GET BY ID
========================= */
app.get('/foods/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM foods WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Data not found'
      });
    }

    res.json({
      status: 'success',
      data: rows[0]
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

/* =========================
   CREATE FOOD
========================= */
app.post('/foods', async (req, res) => {
  try {
    if (!validateFood(req.body)) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed'
      });
    }

    const { nama_makanan, kategori, harga, deskripsi } = req.body;

    const [result] = await pool.query(
      `INSERT INTO foods (nama_makanan, kategori, harga, deskripsi)
       VALUES (?, ?, ?, ?)`,
      [nama_makanan, kategori, Number(harga), deskripsi || null]
    );

    const [rows] = await pool.query(
      'SELECT * FROM foods WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      status: 'success',
      data: rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

/* =========================
   UPDATE FOOD
========================= */
app.put('/foods/:id', async (req, res) => {
  try {
    if (!validateFood(req.body)) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed'
      });
    }

    const { id } = req.params;
    const { nama_makanan, kategori, harga, deskripsi } = req.body;

    const [check] = await pool.query(
      'SELECT * FROM foods WHERE id = ?',
      [id]
    );

    if (check.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Data not found'
      });
    }

    await pool.query(
      `UPDATE foods 
       SET nama_makanan=?, kategori=?, harga=?, deskripsi=? 
       WHERE id=?`,
      [nama_makanan, kategori, Number(harga), deskripsi || null, id]
    );

    const [rows] = await pool.query(
      'SELECT * FROM foods WHERE id = ?',
      [id]
    );

    res.json({
      status: 'success',
      data: rows[0]
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

/* =========================
   DELETE FOOD
========================= */
app.delete('/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [check] = await pool.query(
      'SELECT * FROM foods WHERE id = ?',
      [id]
    );

    if (check.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Data not found'
      });
    }

    await pool.query(
      'DELETE FROM foods WHERE id = ?',
      [id]
    );

    res.json({
      status: 'success',
      message: 'Deleted successfully'
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initDb();
});