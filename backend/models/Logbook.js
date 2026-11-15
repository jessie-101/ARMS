const db = require("../config/db");

// Add a new weekly logbook entry for a student
const addEntry = (data, callback) => {
    const sql = `
        INSERT INTO logbook_entries
        (student_id, week_number, activity, skills_gained, challenges, date_submitted)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            data.student_id,
            data.week_number,
            data.activity,
            data.skills_gained,
            data.challenges,
            data.date_submitted
        ],
        callback
    );
};

// Get all logbook entries for one student, most recent week first
const getByStudentId = (studentId, callback) => {
    const sql = `
        SELECT * FROM logbook_entries
        WHERE student_id = ?
        ORDER BY week_number DESC
    `;
    db.query(sql, [studentId], callback);
};

// Check whether a student already submitted an entry for a given week
const getByStudentAndWeek = (studentId, weekNumber, callback) => {
    const sql = `
        SELECT * FROM logbook_entries
        WHERE student_id = ? AND week_number = ?
        LIMIT 1
    `;
    db.query(sql, [studentId, weekNumber], callback);
};

// Get one logbook entry by its id, together with the assigned supervisor
// on that student's attachment record
const getByIdWithSupervisor = (logId, callback) => {
    const sql = `
        SELECT le.*, ar.academic_supervisor_id
        FROM logbook_entries le
        JOIN attachment_records ar ON le.student_id = ar.student_id
        WHERE le.log_id = ?
        LIMIT 1
    `;
    db.query(sql, [logId], callback);
};

// Supervisor updates the comment and approval status of one entry
const updateReview = (logId, supervisorComment, approvalStatus, callback) => {
    const sql = `
        UPDATE logbook_entries
        SET supervisor_comment = ?, approval_status = ?
        WHERE log_id = ?
    `;
    db.query(sql, [supervisorComment, approvalStatus, logId], callback);
};

module.exports = {
    addEntry,
    getByStudentId,
    getByStudentAndWeek,
    getByIdWithSupervisor,
    updateReview
};