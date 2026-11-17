const Attachment = require("../models/Attachment");

exports.addAttachment = (req, res) => {
    const studentId = req.user.student_id;

    const {
        organization_name, organization_type, department, county, town,
        supervisor_name, supervisor_phone, supervisor_email,
        assessor_name, assessor_phone, assessor_email,
        start_date, end_date
    } = req.body;

    if (!organization_name || !start_date || !end_date) {
        return res.status(400).json({
            message: "organization_name, start_date and end_date are required"
        });
    }

    Attachment.getByStudentId(studentId, (checkErr, existing) => {
        if (checkErr) {
            console.log("MYSQL ERROR (getByStudentId):", checkErr);
            return res.status(500).json({ message: "Failed to check existing attachment", error: checkErr.message });
        }

        if (existing.length > 0) {
            return res.status(409).json({ message: "An attachment record already exists for this student" });
        }

        const data = {
            student_id: studentId,
            organization_name, organization_type, department, county, town,
            supervisor_name, supervisor_phone, supervisor_email,
            assessor_name, assessor_phone, assessor_email,
            start_date, end_date
        };

        Attachment.addAttachment(data, (err, result) => {
            if (err) {
                console.log("MYSQL ERROR (addAttachment):", err);
                return res.status(500).json({ message: "Failed to add attachment details", error: err.message });
            }
            res.status(201).json({
                message: "Attachment details added successfully",
                attachment_id: result.insertId
            });
        });
    });
};

exports.getMyAttachment = (req, res) => {
    const studentId = req.user.student_id;

    Attachment.getByStudentId(studentId, (err, results) => {
        if (err) {
            console.log("MYSQL ERROR (getMyAttachment):", err);
            return res.status(500).json({ message: "Failed to fetch attachment details", error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "No attachment record found for this student" });
        }
        res.status(200).json(results[0]);
    });
};