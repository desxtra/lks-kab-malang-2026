const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');

const app = express();
const PORT = 3000;

// Load dari .env - PASTIKAN file .env ada di folder yang sama
const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'lks-rds.cihieuwmw1xw.us-east-1.rds.amazonaws.com',
  user: process.env.MYSQL_USER || 'admin',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'mysql'
};

// Redis config dari .env - GUNAKAN ENDPOINT YANG BENAR
const REDIS_HOST = process.env.REDIS_HOST || 'redis.brcmro.ng.0001.use1.cache.amazonaws.com';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
const REDIS_TLS = process.env.REDIS_TLS === 'true';

let mysqlStatus = '❌ NOT CONNECTED';
let redisStatus = '❌ NOT CONNECTED';

// Cek MySQL
async function checkMySQL() {
  try {
    console.log(`Connecting to MySQL: ${DB_CONFIG.host}`);
    const connection = await mysql.createConnection(DB_CONFIG);
    const [rows] = await connection.execute('SELECT 1 as test');
    mysqlStatus = '✅ CONNECTED';
    await connection.end();
    return true;
  } catch (error) {
    mysqlStatus = `❌ ${error.code || 'Connection failed'}`;
    return false;
  }
}

// Cek Redis - PAKAI ENDPOINT YANG SUDAH TERBUKTI BISA
async function checkRedis() {
  console.log(`Connecting to Redis: ${REDIS_HOST}:${REDIS_PORT} (TLS: ${REDIS_TLS})`);
  
  try {
    const client = redis.createClient({
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        tls: REDIS_TLS,
        // Timeout lebih lama
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          return Math.min(retries * 100, 3000);
        }
      }
    });

    // Handle events untuk debugging
    client.on('error', (err) => {
      console.log('Redis client error:', err.message);
    });

    client.on('connect', () => {
      console.log('Redis client connecting...');
    });

    client.on('ready', () => {
      console.log('Redis client ready');
    });

    await client.connect();
    
    // Test sederhana
    await client.set('lks_test', 'connected_' + new Date().toISOString());
    const value = await client.get('lks_test');
    
    redisStatus = `✅ CONNECTED (Value: ${value})`;
    await client.quit();
    return true;
  } catch (error) {
    console.error('Redis connection error:', error.message);
    redisStatus = `❌ ${error.code || error.message}`;
    return false;
  }
}

// Route utama
app.get('/', async (req, res) => {
  await Promise.all([checkMySQL(), checkRedis()]);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>LKS Cloud 2026</title></head>
    <body style="font-family: Arial; padding: 20px; text-align: center;">
      <h1>✅ ITS WORK!</h1>
      <h2>Status Layanan:</h2>
      
      <div style="background: ${mysqlStatus.includes('✅') ? '#d4edda' : '#f8d7da'}; 
                  color: ${mysqlStatus.includes('✅') ? '#155724' : '#721c24'};
                  padding: 10px; margin: 10px; border-radius: 5px;">
        <strong>MySQL/RDS:</strong> ${mysqlStatus}
      </div>
      
      <div style="background: ${redisStatus.includes('✅') ? '#d4edda' : '#f8d7da'}; 
                  color: ${redisStatus.includes('✅') ? '#155724' : '#721c24'};
                  padding: 10px; margin: 10px; border-radius: 5px;">
        <strong>Redis:</strong> ${redisStatus}
      </div>
      
      <div style="background: #d4edda; color: #155724; 
                  padding: 10px; margin: 10px; border-radius: 5px;">
        <strong>EC2 Instance:</strong> ✅ RUNNING (Port: ${PORT})
      </div>
      
      <hr>
      <p><small>MySQL: ${DB_CONFIG.host} | Redis: ${REDIS_HOST}:${REDIS_PORT}</small></p>
      <p><small>Environment variables loaded from .env file</small></p>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const mysqlOk = await checkMySQL();
  const redisOk = await checkRedis();
  
  res.json({
    status: mysqlOk && redisOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      mysql: mysqlStatus,
      redis: redisStatus,
      ec2: "running"
    }
  });
});

// Jalankan server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 LKS Cloud App Starting...`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Access: http://0.0.0.0:${PORT}`);
  console.log(`📊 MySQL: ${DB_CONFIG.host}`);
  console.log(`🎯 Redis: ${REDIS_HOST}:${REDIS_PORT}`);
  console.log(`=========================================`);
  
  // Test koneksi saat startup
  checkMySQL().then(() => {
    console.log(`✅ MySQL: ${mysqlStatus}`);
  });
  
  checkRedis().then(() => {
    console.log(`✅ Redis: ${redisStatus}`);
  });
});