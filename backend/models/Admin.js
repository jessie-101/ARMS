const db = require("../config/db");

// Register a new admin
const registerAdmin = (admin, callback) => {
    const sql = `
        INSERT INTO administrators
        (full_name, email, password)
        VALUES (?, ?, ?)
    `;
    db.query(sql, [admin.full_name, admin.email, admin.password], callback);
};

// Find an admin by email (login + duplicate-email checks)
const findByEmail = (email, callback) => {
    const sql = `SELECT * FROM administrators WHERE email = ? LIMIT 1`;
    db.query(sql, [email], callback);
};

module.exports = {
    registerAdmin,
    findByEmail
};