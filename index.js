const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const app = express();
const PORT = 3000;

// Konfigurasi Environment Variables
const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'password';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'lks_db';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Status koneksi
let mysqlConnected = false;
let redisConnected = false;

// Koneksi MySQL (RDS)
async function connectMySQL() {
    try {
        const connection = await mysql.createConnection({
            host: MYSQL_HOST,
            user: MYSQL_USER,
            password: MYSQL_PASSWORD,
            database: MYSQL_DATABASE
        });
        
        // Buat tabel jika belum ada
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS visitors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45),
                visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ MySQL/RDS connected successfully!');
        mysqlConnected = true;
        return connection;
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        mysqlConnected = false;
        return null;
    }
}

// Koneksi Redis
async function connectRedis() {
    try {
        const client = redis.createClient({
            socket: {
                host: REDIS_HOST,
                port: REDIS_PORT
            }
        });
        
        client.on('error', (err) => {
            console.error('Redis error:', err);
            redisConnected = false;
        });
        
        await client.connect();
        console.log('✅ Redis connected successfully!');
        redisConnected = true;
        return client;
    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        redisConnected = false;
        return null;
    }
}

// Inisialisasi aplikasi
async function initializeApp() {
    const mysqlConn = await connectMySQL();
    const redisClient = await connectRedis();
    
    // Middleware
    app.use(express.json());
    
    // Route utama - sesuai permintaan "its work!"
    app.get('/', (req, res) => {
        res.send(`
            <html>
                <head><title>LKS Cloud Computing 2026</title></head>
                <body style="font-family: Arial; padding: 20px;">
                    <h1>✅ ITS WORK!</h1>
                    <h2>Status Layanan:</h2>
                    <p>🔹 MySQL/RDS: ${mysqlConnected ? 'CONNECTED, WORKING' : 'DISCONNECTED'}</p>
                    <p>🔹 Redis: ${redisConnected ? 'CONNECTED, WORKING' : 'DISCONNECTED'}</p>
                    <p>🔹 EC2: RUNNING</p>
                    
                    <h3>Endpoints yang tersedia:</h3>
                    <ul>
                        <li><a href="/status">/status</a> - Detail status koneksi</li>
                        <li><a href="/test-mysql">/test-mysql</a> - Test koneksi MySQL</li>
                        <li><a href="/test-redis">/test-redis</a> - Test koneksi Redis dengan counter</li>
                        <li><a href="/visitors">/visitors</a> - Data pengunjung dari database</li>
                    </ul>
                </body>
            </html>
        `);
    });
    
    // Route status lengkap
    app.get('/status', (req, res) => {
        res.json({
            app: "LKS Cloud Computing App",
            status: "running",
            services: {
                ec2: "active",
                mysql: mysqlConnected ? "connected" : "disconnected",
                redis: redisConnected ? "connected" : "disconnected"
            },
            timestamp: new Date().toISOString()
        });
    });
    
    // Test MySQL/RDS
    app.get('/test-mysql', async (req, res) => {
        if (!mysqlConn) {
            return res.status(500).json({ error: "MySQL not connected" });
        }
        
        try {
            // Insert data pengunjung
            const [result] = await mysqlConn.execute(
                'INSERT INTO visitors (ip_address) VALUES (?)',
                [req.ip]
            );
            
            // Get total visitors
            const [rows] = await mysqlConn.execute('SELECT COUNT(*) as total FROM visitors');
            
            res.json({
                message: "MySQL/RDS working correctly!",
                insertedId: result.insertId,
                totalVisitors: rows[0].total,
                yourIP: req.ip
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Test Redis dengan counter (sesuai permintaan dokumen)
    app.get('/test-redis', async (req, res) => {
        if (!redisClient) {
            return res.status(500).json({ error: "Redis not connected" });
        }
        
        try {
            // Increment counter (sesuai spesifikasi dokumen)
            const counter = await redisClient.incr('page_visits');
            
            // Simpan data sementara di Redis (sesuai spesifikasi)
            await redisClient.setEx(`last_access:${req.ip}`, 300, new Date().toISOString());
            
            res.json({
                message: "Redis cache working correctly!",
                counter: counter,
                lastAccessStored: true,
                note: "Counter bertambah setiap kali diakses - sesuai spesifikasi LKS"
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Data pengunjung dari database
    app.get('/visitors', async (req, res) => {
        if (!mysqlConn) {
            return res.status(500).json({ error: "MySQL not connected" });
        }
        
        try {
            const [rows] = await mysqlConn.execute(
                'SELECT id, ip_address, visit_time FROM visitors ORDER BY visit_time DESC LIMIT 10'
            );
            
            res.json({
                total: rows.length,
                visitors: rows
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Health check untuk load balancer/ monitoring
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            mysql: mysqlConnected,
            redis: redisConnected,
            timestamp: new Date().toISOString()
        });
    });
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on EC2 instance at http://0.0.0.0:${PORT}`);
        console.log(`🔗 Akses di browser dengan IP EC2: http://<EC2_IP>:${PORT}`);
    });
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
    console.log('🔄 Shutting down gracefully...');
    process.exit(0);
});

// Jalankan aplikasi
initializeApp().catch(console.error);