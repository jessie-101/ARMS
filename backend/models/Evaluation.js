 const db = require("../config/db");

const isStudentAssignedToSupervisor = (studentId, supervisorId, callback) => {
    const sql = `
        SELECT attachment_id FROM attachment_records
        WHERE student_id = ? AND academic_supervisor_id = ?
        LIMIT 1
    `;
    db.query(sql, [studentId, supervisorId], callback);
};

const getBySupervisorAndStudent = (supervisorId, studentId, callback) => {
    const sql = `
        SELECT * FROM evaluations
        WHERE supervisor_id = ? AND student_id = ?
        LIMIT 1
    `;
    db.query(sql, [supervisorId, studentId], callback);
};

const addEvaluation = (data, callback) => {
    const sql = `
        INSERT INTO evaluations
        (student_id, supervisor_id, technical_skills, communication, teamwork, punctuality, overall_score, remarks, evaluation_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            data.student_id,
            data.supervisor_id,
            data.technical_skills,
            data.communication,
            data.teamwork,
            data.punctuality,
            data.overall_score,
            data.remarks,
            data.evaluation_date
        ],
        callback
    );
};

const getByStudentId = (studentId, callback) => {
    const sql = `
        SELECT e.*, sv.first_name AS supervisor_first_name, sv.last_name AS supervisor_last_name, sv.department AS supervisor_department, sv.email AS supervisor_email
        FROM evaluations e
        JOIN supervisors sv ON e.supervisor_id = sv.supervisor_id
        WHERE e.student_id = ?
        LIMIT 1
    `;
    db.query(sql, [studentId], callback);
};

module.exports = {
    isStudentAssignedToSupervisor,
    getBySupervisorAndStudent,
    addEvaluation,
    getByStudentId
};