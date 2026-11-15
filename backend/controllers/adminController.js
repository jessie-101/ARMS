 const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");
const db = require("../config/db");

// REGISTER ADMIN
exports.registerAdmin = (req, res) => {

    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({
            message: "full_name, email and password are required"
        });
    }

    Admin.findByEmail(email, (err, existing) => {

        if (err) {
            console.log("MYSQL ERROR (findByEmail):", err);
            return res.status(500).json({
                message: "Registration failed",
                error: err.message
            });
        }

        if (existing.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        bcrypt.hash(password, 10, (hashErr, hashedPassword) => {

            if (hashErr) {
                console.log("BCRYPT ERROR:", hashErr);
                return res.status(500).json({
                    message: "Registration failed",
                    error: hashErr.message
                });
            }

            Admin.registerAdmin(
                { full_name, email, password: hashedPassword },
                (insertErr, result) => {

                    if (insertErr) {
                        console.log("MYSQL ERROR (registerAdmin):", insertErr);

                        if (insertErr.code === "ER_DUP_ENTRY") {
                            return res.status(409).json({
                                message: "Email already in use"
                            });
                        }

                        return res.status(500).json({
                            message: "Admin registration failed",
                            error: insertErr.message
                        });
                    }

                    res.status(201).json({
                        message: "Admin registered successfully",
                        admin_id: result.insertId
                    });
                }
            );
        });
    });
};

// GET ALL STUDENTS (with their attachment + assigned supervisor, if any)
exports.getAllStudents = (req, res) => {

    const sql = `
        SELECT
            s.student_id, s.registration_number, s.first_name, s.last_name, s.email,
            ar.attachment_id, ar.organization_name, ar.academic_supervisor_id,
            sv.first_name AS supervisor_first_name, sv.last_name AS supervisor_last_name
        FROM students s
        LEFT JOIN attachment_records ar ON s.student_id = ar.student_id
        LEFT JOIN supervisors sv ON ar.academic_supervisor_id = sv.supervisor_id
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log("MYSQL ERROR (getAllStudents):", err);
            return res.status(500).json({
                message: "Failed to fetch students",
                error: err.message
            });
        }

        res.status(200).json(results);
    });
};

// GET ALL SUPERVISORS
exports.getAllSupervisors = (req, res) => {

    const sql = `SELECT supervisor_id, first_name, last_name, email, department FROM supervisors`;

    db.query(sql, (err, results) => {

        if (err) {
            console.log("MYSQL ERROR (getAllSupervisors):", err);
            return res.status(500).json({
                message: "Failed to fetch supervisors",
                error: err.message
            });
        }

        res.status(200).json(results);
    });
};

// ASSIGN A SUPERVISOR TO A STUDENT'S ATTACHMENT RECORD
exports.assignSupervisor = (req, res) => {

    const { student_id, supervisor_id } = req.body;

    if (!student_id || !supervisor_id) {
        return res.status(400).json({
            message: "student_id and supervisor_id are required"
        });
    }

    const checkSql = `SELECT attachment_id FROM attachment_records WHERE student_id = ? LIMIT 1`;

    db.query(checkSql, [student_id], (checkErr, existing) => {

        if (checkErr) {
            console.log("MYSQL ERROR (check attachment):", checkErr);
            return res.status(500).json({
                message: "Failed to verify attachment record",
                error: checkErr.message
            });
        }

        if (existing.length === 0) {
            return res.status(404).json({
                message: "This student has no attachment record yet"
            });
        }

        const updateSql = `
            UPDATE attachment_records
            SET academic_supervisor_id = ?
            WHERE student_id = ?
        `;

        db.query(updateSql, [supervisor_id, student_id], (updateErr) => {

            if (updateErr) {
                console.log("MYSQL ERROR (assignSupervisor):", updateErr);
                return res.status(500).json({
                    message: "Failed to assign supervisor",
                    error: updateErr.message
                });
            }

            const notifMessage = `A supervisor has been assigned to your attachment.`;
            Notification.addNotification(student_id, notifMessage, (notifErr) => {
                if (notifErr) {
                    console.log("NOTIFICATION ERROR (assignSupervisor):", notifErr);
                }
            });

            res.status(200).json({
                message: "Supervisor assigned successfully"
            });
        });
    });
};

// UPDATE A STUDENT'S DETAILS (admin)
exports.updateStudent = (req, res) => {

    const studentId = req.params.studentId;
    const { first_name, last_name, email, phone_number, course, year_of_study } = req.body;

    if (!first_name && !last_name && !email && !phone_number && !course && !year_of_study) {
        return res.status(400).json({
            message: "At least one field is required to update"
        });
    }

    const fields = [];
    const values = [];

    if (first_name) { fields.push("first_name = ?"); values.push(first_name); }
    if (last_name) { fields.push("last_name = ?"); values.push(last_name); }
    if (email) { fields.push("email = ?"); values.push(email); }
    if (phone_number) { fields.push("phone_number = ?"); values.push(phone_number); }
    if (course) { fields.push("course = ?"); values.push(course); }
    if (year_of_study) { fields.push("year_of_study = ?"); values.push(year_of_study); }

    values.push(studentId);

    const sql = `UPDATE students SET ${fields.join(", ")} WHERE student_id = ?`;

    db.query(sql, values, (err, result) => {

        if (err) {
            console.log("MYSQL ERROR (updateStudent):", err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ message: "Email already in use" });
            }

            return res.status(500).json({
                message: "Failed to update student",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json({ message: "Student updated successfully" });
    });
};

// DELETE A STUDENT (admin)
exports.deleteStudent = (req, res) => {

    const studentId = req.params.studentId;

    const sql = `DELETE FROM students WHERE student_id = ?`;

    db.query(sql, [studentId], (err, result) => {

        if (err) {
            console.log("MYSQL ERROR (deleteStudent):", err);
            return res.status(500).json({
                message: "Failed to delete student",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json({ message: "Student deleted successfully" });
    });
};

// UPDATE A SUPERVISOR'S DETAILS (admin)
exports.updateSupervisor = (req, res) => {

    const supervisorId = req.params.supervisorId;
    const { first_name, last_name, email, phone_number, department } = req.body;

    if (!first_name && !last_name && !email && !phone_number && !department) {
        return res.status(400).json({
            message: "At least one field is required to update"
        });
    }

    const fields = [];
    const values = [];

    if (first_name) { fields.push("first_name = ?"); values.push(first_name); }
    if (last_name) { fields.push("last_name = ?"); values.push(last_name); }
    if (email) { fields.push("email = ?"); values.push(email); }
    if (phone_number) { fields.push("phone_number = ?"); values.push(phone_number); }
    if (department) { fields.push("department = ?"); values.push(department); }

    values.push(supervisorId);

    const sql = `UPDATE supervisors SET ${fields.join(", ")} WHERE supervisor_id = ?`;

    db.query(sql, values, (err, result) => {

        if (err) {
            console.log("MYSQL ERROR (updateSupervisor):", err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ message: "Email already in use" });
            }

            return res.status(500).json({
                message: "Failed to update supervisor",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Supervisor not found" });
        }

        res.status(200).json({ message: "Supervisor updated successfully" });
    });
};

// DELETE A SUPERVISOR (admin)
exports.deleteSupervisor = (req, res) => {

    const supervisorId = req.params.supervisorId;

    const sql = `DELETE FROM supervisors WHERE supervisor_id = ?`;

    db.query(sql, [supervisorId], (err, result) => {

        if (err) {
            console.log("MYSQL ERROR (deleteSupervisor):", err);
            return res.status(500).json({
                message: "Failed to delete supervisor",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Supervisor not found" });
        }

        res.status(200).json({ message: "Supervisor deleted successfully" });
    });
};