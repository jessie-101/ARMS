 const db = require("../config/db");

const addNotification = (studentId, message, callback) => {
    const sql = `INSERT INTO notifications (student_id, message) VALUES (?, ?)`;
    db.query(sql, [studentId, message], callback);
};

const addSupervisorNotification = (supervisorId, message, callback) => {
    const sql = `INSERT INTO notifications (supervisor_id, message) VALUES (?, ?)`;
    db.query(sql, [supervisorId, message], callback);
};

const getByStudentId = (studentId, callback) => {
    const sql = `SELECT * FROM notifications WHERE student_id = ? ORDER BY created_at DESC`;
    db.query(sql, [studentId], callback);
};

const getBySupervisorId = (supervisorId, callback) => {
    const sql = `SELECT * FROM notifications WHERE supervisor_id = ? ORDER BY created_at DESC`;
    db.query(sql, [supervisorId], callback);
};

const markAsRead = (notificationId, studentId, callback) => {
    const sql = `UPDATE notifications SET status = 'Read' WHERE notification_id = ? AND student_id = ?`;
    db.query(sql, [notificationId, studentId], callback);
};

const markSupervisorNotificationAsRead = (notificationId, supervisorId, callback) => {
    const sql = `UPDATE notifications SET status = 'Read' WHERE notification_id = ? AND supervisor_id = ?`;
    db.query(sql, [notificationId, supervisorId], callback);
};

module.exports = {
    addNotification,
    addSupervisorNotification,
    getByStudentId,
    getBySupervisorId,
    markAsRead,
    markSupervisorNotificationAsRead
};