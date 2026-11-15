const db = require("../config/db");

// Register a new supervisor
const registerSupervisor = (supervisor, callback) => {
    const sql = `
        INSERT INTO supervisors
        (first_name, last_name, email, phone_number, department, password)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            supervisor.first_name,
            supervisor.last_name,
            supervisor.email,
            supervisor.phone_number,
            supervisor.department,
            supervisor.password
        ],
        callback
    );
};

// Find a supervisor by email (used for login + duplicate-email checks)
const findByEmail = (email, callback) => {
    const sql = `SELECT * FROM supervisors WHERE email = ? LIMIT 1`;
    db.query(sql, [email], callback);
};

// Find a supervisor by id
const findById = (supervisorId, callback) => {
    const sql = `SELECT * FROM supervisors WHERE supervisor_id = ? LIMIT 1`;
    db.query(sql, [supervisorId], callback);
};

module.exports = {
    registerSupervisor,
    findByEmail,
    findById
};