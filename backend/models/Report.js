const db = require("../config/db");

// Save a record of a generated report
const addReport = (data, callback) => {
    const sql = `
        INSERT INTO reports
        (student_id, report_name, file_path)
        VALUES (?, ?, ?)
    `;
    db.query(sql, [data.student_id, data.report_name, data.file_path], callback);
};

// Get all reports generated for one student
const getByStudentId = (studentId, callback) => {
    const sql = `
        SELECT * FROM reports
        WHERE student_id = ?
        ORDER BY generated_at DESC
    `;
    db.query(sql, [studentId], callback);
};

module.exports = {
    addReport,
    getByStudentId
};