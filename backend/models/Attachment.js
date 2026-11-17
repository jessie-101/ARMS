const db = require("../config/db");

const addAttachment = (data, callback) => {
    const sql = `
        INSERT INTO attachment_records
        (
            student_id, organization_name, organization_type, department,
            county, town, supervisor_name, supervisor_phone, supervisor_email,
            assessor_name, assessor_phone, assessor_email,
            academic_supervisor_id, start_date, end_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            data.student_id,
            data.organization_name,
            data.organization_type,
            data.department,
            data.county,
            data.town,
            data.supervisor_name,
            data.supervisor_phone,
            data.supervisor_email,
            data.assessor_name,
            data.assessor_phone,
            data.assessor_email,
            data.academic_supervisor_id || null,
            data.start_date,
            data.end_date
        ],
        callback
    );
};

const getByStudentId = (studentId, callback) => {
    const sql = `SELECT * FROM attachment_records WHERE student_id = ? LIMIT 1`;
    db.query(sql, [studentId], callback);
};

module.exports = {
    addAttachment,
    getByStudentId
};