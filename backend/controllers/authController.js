 const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Supervisor = require("../models/Supervisor");
const Admin = require("../models/Admin");

// STUDENT LOGIN
exports.studentLogin = (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    Student.findByEmail(email, (err, results) => {

        if (err) {
            console.log("MYSQL ERROR (login):", err);
            return res.status(500).json({
                message: "Login failed",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const student = results[0];

        bcrypt.compare(password, student.password, (compareErr, isMatch) => {

            if (compareErr) {
                console.log("BCRYPT ERROR:", compareErr);
                return res.status(500).json({
                    message: "Login failed",
                    error: compareErr.message
                });
            }

            if (!isMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    student_id: student.student_id,
                    email: student.email,
                    role: "student"
                },
                process.env.JWT_SECRET,
                { expiresIn: "1d" }
            );

            res.status(200).json({
                message: "Login successful",
                token,
                student: {
                    student_id: student.student_id,
                    registration_number: student.registration_number,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    email: student.email,
                    course: student.course,
                    year_of_study: student.year_of_study
                }
            });
        });
    });
};

// SUPERVISOR LOGIN
exports.supervisorLogin = (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    Supervisor.findByEmail(email, (err, results) => {

        if (err) {
            console.log("MYSQL ERROR (supervisor login):", err);
            return res.status(500).json({
                message: "Login failed",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const supervisor = results[0];

        bcrypt.compare(password, supervisor.password, (compareErr, isMatch) => {

            if (compareErr) {
                console.log("BCRYPT ERROR:", compareErr);
                return res.status(500).json({
                    message: "Login failed",
                    error: compareErr.message
                });
            }

            if (!isMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    supervisor_id: supervisor.supervisor_id,
                    email: supervisor.email,
                    role: "supervisor"
                },
                process.env.JWT_SECRET,
                { expiresIn: "1d" }
            );

            res.status(200).json({
                message: "Login successful",
                token,
                supervisor: {
                    supervisor_id: supervisor.supervisor_id,
                    first_name: supervisor.first_name,
                    last_name: supervisor.last_name,
                    email: supervisor.email,
                    department: supervisor.department
                }
            });
        });
    });
};

// ADMIN LOGIN
exports.adminLogin = (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    Admin.findByEmail(email, (err, results) => {

        if (err) {
            console.log("MYSQL ERROR (admin login):", err);
            return res.status(500).json({
                message: "Login failed",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const admin = results[0];

        bcrypt.compare(password, admin.password, (compareErr, isMatch) => {

            if (compareErr) {
                console.log("BCRYPT ERROR:", compareErr);
                return res.status(500).json({
                    message: "Login failed",
                    error: compareErr.message
                });
            }

            if (!isMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    admin_id: admin.admin_id,
                    email: admin.email,
                    role: "admin"
                },
                process.env.JWT_SECRET,
                { expiresIn: "1d" }
            );

            res.status(200).json({
                message: "Login successful",
                token,
                admin: {
                    admin_id: admin.admin_id,
                    full_name: admin.full_name,
                    email: admin.email
                }
            });
        });
    });
};