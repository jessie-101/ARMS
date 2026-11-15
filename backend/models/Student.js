 const db = require("../config/db");

// Register a new student
const registerStudent = (student, callback) => {
    const sql = `
        INSERT INTO students
        (registration_number, first_name, last_name, email, phone_number, course, year_of_study, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            student.registration_number,
            student.first_name,
            student.last_name,
            student.email,
            student.phone_number,
            student.course,
            student.year_of_study,
            student.password
        ],
        callback
    );
};

// Find a student by email (used for login + duplicate-email checks)
const findByEmail = (email, callback) => {
    const sql = `SELECT * FROM students WHERE email = ? LIMIT 1`;
    db.query(sql, [email], callback);
};

// Find a student by id (useful later for profile lookups)
const findById = (studentId, callback) => {
    const sql = `SELECT * FROM students WHERE student_id = ? LIMIT 1`;
    db.query(sql, [studentId], callback);
};

// Student updates their own profile (self-service — no email change,
// since that's the login identifier and has a UNIQUE constraint)
const updateOwnProfile = (studentId, data, callback) => {
    const sql = `
        UPDATE students
        SET first_name = ?, last_name = ?, phone_number = ?, course = ?, year_of_study = ?
        WHERE student_id = ?
    `;
    db.query(
        sql,
        [data.first_name, data.last_name, data.phone_number, data.course, data.year_of_study, studentId],
        callback
    );
};

module.exports = {
    registerStudent,
    findByEmail,
    findById,
    updateOwnProfile
};