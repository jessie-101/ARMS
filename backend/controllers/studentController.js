 const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const Evaluation = require("../models/Evaluation");

// REGISTER STUDENT
exports.registerStudent = (req, res) => {

    const {
        registration_number,
        first_name,
        last_name,
        email,
        phone_number,
        course,
        year_of_study,
        password
    } = req.body;

    if (
        !registration_number || !first_name || !last_name ||
        !email || !course || !year_of_study || !password
    ) {
        return res.status(400).json({
            message: "Missing required fields"
        });
    }

    Student.findByEmail(email, (err, existing) => {

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

            const studentData = {
                registration_number,
                first_name,
                last_name,
                email,
                phone_number,
                course,
                year_of_study,
                password: hashedPassword
            };

            Student.registerStudent(studentData, (insertErr, result) => {

                if (insertErr) {
                    console.log("MYSQL ERROR (registerStudent):", insertErr);

                    if (insertErr.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "Registration number or email already in use"
                        });
                    }

                    return res.status(500).json({
                        message: "Student registration failed",
                        error: insertErr.message
                    });
                }

                res.status(201).json({
                    message: "Student registered successfully",
                    student_id: result.insertId
                });
            });
        });
    });
};

// GET LOGGED-IN STUDENT'S PROFILE (requires a valid token)
exports.getProfile = (req, res) => {

    const studentId = req.user.student_id;

    Student.findById(studentId, (err, results) => {

        if (err) {
            console.log("MYSQL ERROR (getProfile):", err);
            return res.status(500).json({
                message: "Failed to fetch profile",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const student = results[0];

        res.status(200).json({
            student_id: student.student_id,
            registration_number: student.registration_number,
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            phone_number: student.phone_number,
            course: student.course,
            year_of_study: student.year_of_study
        });
    });
};

// STUDENT UPDATES THEIR OWN PROFILE (self-service — no email change)
exports.updateOwnProfile = (req, res) => {

    const studentId = req.user.student_id;
    const { first_name, last_name, phone_number, course, year_of_study } = req.body;

    if (!first_name || !last_name || !course || !year_of_study) {
        return res.status(400).json({
            message: "first_name, last_name, course and year_of_study are required"
        });
    }

    const data = { first_name, last_name, phone_number, course, year_of_study };

    Student.updateOwnProfile(studentId, data, (err, result) => {

        if (err) {
            console.log("MYSQL ERROR (updateOwnProfile):", err);
            return res.status(500).json({
                message: "Failed to update profile",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json({ message: "Profile updated successfully" });
    });
};

// GET THE LOGGED-IN STUDENT'S OWN EVALUATION
exports.getMyEvaluation = (req, res) => {

    const studentId = req.user.student_id;

    Evaluation.getByStudentId(studentId, (err, results) => {

        if (err) {
            console.log("MYSQL ERROR (getMyEvaluation):", err);
            return res.status(500).json({
                message: "Failed to fetch evaluation",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "No evaluation found yet"
            });
        }

        res.status(200).json(results[0]);
    });
};