const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');

const app = express();
const PORT = 3000;

// Ambil config dari environment variable atau default
const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'mysql' // Pakai database default saja
};

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
};

let mysqlStatus = '❌ NOT CONNECTED';
let redisStatus = '❌ NOT CONNECTED';

// Cek koneksi MySQL saja - TIDAK buat tabel
async function checkMySQL() {
  try {
    const connection = await mysql.createConnection({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });
    
    // Hanya cek koneksi dan ambil nama database
    const [rows] = await connection.execute('SELECT DATABASE() as db_name');
    const dbName = rows[0].db_name || 'No database selected';
    
    mysqlStatus = `✅ CONNECTED (Database: ${dbName})`;
    await connection.end();
    return true;
  } catch (error) {
    mysqlStatus = `❌ ERROR: ${error.message}`;
    return false;
  }
}

// Cek koneksi Redis saja
async function checkRedis() {
  try {
    const client = redis.createClient(REDIS_CONFIG);
    await client.connect();
    
    // Simpan timestamp di Redis sebagai bukti kerja
    await client.set('lks_test', new Date().toISOString());
    const value = await client.get('lks_test');
    
    redisStatus = `✅ CONNECTED (Test Value: ${value})`;
    await client.quit();
    return true;
  } catch (error) {
    redisStatus = `❌ ERROR: ${error.message}`;
    return false;
  }
}

// Route utama - Sesuai permintaan "its work!"
app.get('/', async (req, res) => {
  // Cek koneksi setiap kali diakses
  await checkMySQL();
  await checkRedis();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>LKS Cloud 2026</title>
      <style>
        body { 
          font-family: Arial; 
          padding: 40px; 
          text-align: center;
          background: #f5f5f5;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2c3e50; }
        .status {
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
          font-weight: bold;
        }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .info { background: #d1ecf1; color: #0c5460; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 ITS WORK!</h1>
        <p class="info">LKS Cloud Computing 2026 - Simple Deployment Test</p>
        
        <h2>📊 Service Status:</h2>
        
        <div class="status ${mysqlStatus.includes('✅') ? 'success' : 'error'}">
          <strong>MySQL/RDS:</strong> ${mysqlStatus}
        </div>
        
        <div class="status ${redisStatus.includes('✅') ? 'success' : 'error'}">
          <strong>Redis:</strong> ${redisStatus}
        </div>
        
        <div class="status success">
          <strong>EC2 Instance:</strong> ✅ RUNNING (Port: ${PORT})
        </div>
        
        <h3>🔗 Quick Links:</h3>
        <p>
          <a href="/status">/status</a> | 
          <a href="/health">/health</a> | 
          <a href="/simple-check">/simple-check</a>
        </p>
        
        <hr>
        <p><small>Last checked: ${new Date().toLocaleString()}</small></p>
      </div>
    </body>
    </html>
  `);
});

// Route sederhana untuk JSON response
app.get('/status', async (req, res) => {
  const mysqlOk = await checkMySQL();
  const redisOk = await checkRedis();
  
  res.json({
    app: "LKS Cloud Computing 2026",
    message: "ITS WORK!",
    timestamp: new Date().toISOString(),
    services: {
      ec2: { status: "running", port: PORT },
      mysql: { 
        connected: mysqlOk,
        message: mysqlStatus,
        config: {
          host: DB_CONFIG.host,
          user: DB_CONFIG.user,
          database: DB_CONFIG.database
        }
      },
      redis: {
        connected: redisOk,
        message: redisStatus,
        config: REDIS_CONFIG
      }
    }
  });
});

// Health check minimal
app.get('/health', (req, res) => {
  res.json({ 
    status: "healthy",
    service: "LKS Cloud App",
    time: new Date().toISOString()
  });
});

// Cek paling sederhana
app.get('/simple-check', (req, res) => {
  res.send(`
    <div style="font-family: Arial; padding: 20px;">
      <h2>Simple Check Result:</h2>
      <p><strong>MySQL:</strong> ${mysqlStatus}</p>
      <p><strong>Redis:</strong> ${redisStatus}</p>
      <p><strong>EC2:</strong> ✅ Working</p>
      <br>
      <p><strong>Conclusion:</strong> ${mysqlStatus.includes('✅') && redisStatus.includes('✅') ? 'ALL SERVICES CONNECTED!' : 'SOME SERVICES FAILED'}</p>
    </div>
  `);
});

// Jalankan server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 LKS Cloud App Running on Port ${PORT}`);
  console.log(`📡 Access at: http://0.0.0.0:${PORT}`);
  console.log(`=========================================`);
  
  // Test koneksi saat startup
  console.log('🔍 Testing connections on startup...');
  checkMySQL().then(() => {
    console.log(`   MySQL: ${mysqlStatus}`);
  });
  
  checkRedis().then(() => {
    console.log(`   Redis: ${redisStatus}`);
  });
});