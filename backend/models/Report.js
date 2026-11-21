const db = require("../config/db");

const addReport = (data, callback) => {
    const sql = `INSERT INTO reports (student_id, report_name, file_path, content) VALUES (?, ?, ?, ?)`;
    db.query(sql, [data.student_id, data.report_name, data.file_path || "", data.content || null], callback);
};

const getByStudentId = (studentId, callback) => {
    const sql = `SELECT report_id, student_id, report_name, generated_at FROM reports WHERE student_id = ? ORDER BY report_id DESC`;
    db.query(sql, [studentId], callback);
};

module.exports = {
    addReport,
    getByStudentId
};