const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME || process.env.DB_DATABASE,
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 5,
    ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined
});

db.getConnection((err, connection) => {
    if (err) {
        console.log("MYSQL CONNECTION ERROR:", err.message);
        return;
    }
    console.log("Connected to MySQL database");
    connection.release();
});

module.exports = db;