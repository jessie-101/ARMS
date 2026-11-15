 const bcrypt = require("bcryptjs");
const Supervisor = require("../models/Supervisor");
const Evaluation = require("../models/Evaluation");
const Notification = require("../models/Notification");
const db = require("../config/db");

// REGISTER SUPERVISOR
exports.registerSupervisor = (req, res) => {

    const {
        first_name,
        last_name,
        email,
        phone_number,
        department,
        password
    } = req.body;

    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({
            message: "Missing required fields"
        });
    }

    Supervisor.findByEmail(email, (err, existing) => {

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

            const supervisorData = {
                first_name,
                last_name,
                email,
                phone_number,
                department,
                password: hashedPassword
            };

            Supervisor.registerSupervisor(supervisorData, (insertErr, result) => {

                if (insertErr) {
                    console.log("MYSQL ERROR (registerSupervisor):", insertErr);

                    if (insertErr.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "Email already in use"
                        });
                    }

                    return res.status(500).json({
                        message: "Supervisor registration failed",
                        error: insertErr.message
                    });
                }

                res.status(201).json({
                    message: "Supervisor registered successfully",
                    supervisor_id: result.insertId
                });
            });
        });
    });
};

// GET STUDENTS ASSIGNED TO THE LOGGED-IN SUPERVISOR
exports.getAssignedStudents = (req, res) => {

    const supervisorId = req.user.supervisor_id;

    const sql = `
        SELECT
            s.student_id, s.registration_number, s.first_name, s.last_name,
            s.email, s.course, s.year_of_study,
            ar.attachment_id, ar.organization_name, ar.start_date, ar.end_date, ar.status
        FROM attachment_records ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.academic_supervisor_id = ?
    `;

    db.query(sql, [supervisorId], (err, results) => {

        if (err) {
            console.log("MYSQL ERROR (getAssignedStudents):", err);
            return res.status(500).json({
                message: "Failed to fetch assigned students",
                error: err.message
            });
        }

        res.status(200).json(results);
    });
};
exports.getAssignedLogbookEntries = (req, res) => {
    const supervisorId = req.user.supervisor_id;
    const sql = `
        SELECT le.*, s.first_name, s.last_name, s.registration_number
        FROM logbook_entries le
        JOIN attachment_records ar ON le.student_id = ar.student_id
        JOIN students s ON le.student_id = s.student_id
        WHERE ar.academic_supervisor_id = ?
        ORDER BY le.date_submitted DESC
    `;
    db.query(sql, [supervisorId], (err, results) => {
        if (err) {
            console.log("MYSQL ERROR (getAssignedLogbookEntries):", err);
            return res.status(500).json({ message: "Failed to fetch logbook entries", error: err.message });
        }
        res.status(200).json(results);
    });
};

// GET ONE ASSIGNED STUDENT'S FULL DETAIL (student + attachment + logbook count + evaluation)
exports.getAssignedStudentDetail = (req, res) => {

    const supervisorId = req.user.supervisor_id;
    const studentId = req.params.studentId;

    const studentSql = `
        SELECT
            s.student_id, s.registration_number, s.first_name, s.last_name,
            s.email, s.phone_number, s.course, s.year_of_study,
            ar.attachment_id, ar.organization_name, ar.department, ar.county, ar.town,
            ar.start_date, ar.end_date, ar.status, ar.academic_supervisor_id
        FROM students s
        JOIN attachment_records ar ON s.student_id = ar.student_id
        WHERE s.student_id = ?
    `;

    db.query(studentSql, [studentId], (err, results) => {

        if (err) {
            console.log("MYSQL ERROR (getAssignedStudentDetail):", err);
            return res.status(500).json({
                message: "Failed to fetch student detail",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Student or attachment not found" });
        }

        const student = results[0];

        if (student.academic_supervisor_id !== supervisorId) {
            return res.status(403).json({ message: "This student is not assigned to you" });
        }

        const logbookSql = `SELECT COUNT(*) AS count FROM logbook_entries WHERE student_id = ?`;
        const evalSql = `SELECT * FROM evaluations WHERE student_id = ? LIMIT 1`;

        db.query(logbookSql, [studentId], (logErr, logResults) => {

            if (logErr) {
                console.log("MYSQL ERROR (logbook count):", logErr);
                return res.status(500).json({ message: "Failed to fetch logbook count", error: logErr.message });
            }

            db.query(evalSql, [studentId], (evalErr, evalResults) => {

                if (evalErr) {
                    console.log("MYSQL ERROR (evaluation):", evalErr);
                    return res.status(500).json({ message: "Failed to fetch evaluation", error: evalErr.message });
                }

                res.status(200).json({
                    student,
                    logbook_count: logResults[0].count,
                    evaluation: evalResults.length > 0 ? evalResults[0] : null
                });
            });
        });
    });
};

// SUPERVISOR SUBMITS AN EVALUATION FOR A STUDENT
exports.addEvaluation = (req, res) => {

    const supervisorId = req.user.supervisor_id;

    const {
        student_id,
        technical_skills,
        communication,
        teamwork,
        punctuality,
        remarks,
        evaluation_date
    } = req.body;

    if (
        !student_id || technical_skills == null || communication == null ||
        teamwork == null || punctuality == null || !evaluation_date
    ) {
        return res.status(400).json({
            message: "student_id, all four scores, and evaluation_date are required"
        });
    }

    Evaluation.isStudentAssignedToSupervisor(student_id, supervisorId, (assignErr, assigned) => {

        if (assignErr) {
            console.log("MYSQL ERROR (isStudentAssignedToSupervisor):", assignErr);
            return res.status(500).json({
                message: "Failed to verify assignment",
                error: assignErr.message
            });
        }

        if (assigned.length === 0) {
            return res.status(403).json({
                message: "This student is not assigned to you"
            });
        }

        Evaluation.getBySupervisorAndStudent(supervisorId, student_id, (checkErr, existing) => {

            if (checkErr) {
                console.log("MYSQL ERROR (getBySupervisorAndStudent):", checkErr);
                return res.status(500).json({
                    message: "Failed to check existing evaluation",
                    error: checkErr.message
                });
            }

            if (existing.length > 0) {
                return res.status(409).json({
                    message: "You have already evaluated this student"
                });
            }

            const overallScore = Math.round(
                (Number(technical_skills) + Number(communication) + Number(teamwork) + Number(punctuality)) / 4
            );

            const data = {
                student_id,
                supervisor_id: supervisorId,
                technical_skills,
                communication,
                teamwork,
                punctuality,
                overall_score: overallScore,
                remarks,
                evaluation_date
            };

            Evaluation.addEvaluation(data, (err, result) => {

                if (err) {
                    console.log("MYSQL ERROR (addEvaluation):", err);
                    return res.status(500).json({
                        message: "Failed to add evaluation",
                        error: err.message
                    });
                }

                const notifMessage = `Your supervisor has submitted your evaluation. Overall score: ${overallScore}/10.`;
                Notification.addNotification(student_id, notifMessage, (notifErr) => {
                    if (notifErr) {
                        console.log("NOTIFICATION ERROR (addEvaluation):", notifErr);
                    }
                });

                res.status(201).json({
                    message: "Evaluation submitted successfully",
                    evaluation_id: result.insertId,
                    overall_score: overallScore
                });
            });
        });
    });
};