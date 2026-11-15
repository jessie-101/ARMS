 const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const Report = require("../models/Report");

exports.generateReport = (req, res) => {

    const studentId = req.user.student_id;

    const studentSql = `SELECT * FROM students WHERE student_id = ?`;
    const attachmentSql = `SELECT * FROM attachment_records WHERE student_id = ?`;
    const logbookSql = `SELECT * FROM logbook_entries WHERE student_id = ? ORDER BY week_number ASC`;
    const evaluationSql = `SELECT * FROM evaluations WHERE student_id = ?`;

    db.query(studentSql, [studentId], (studentErr, studentResults) => {
        if (studentErr) {
            console.log("MYSQL ERROR (student):", studentErr);
            return res.status(500).json({ message: "Failed to generate report", error: studentErr.message });
        }
        if (studentResults.length === 0) {
            return res.status(404).json({ message: "Student not found" });
        }
        const student = studentResults[0];

        db.query(attachmentSql, [studentId], (attErr, attResults) => {
            if (attErr) {
                console.log("MYSQL ERROR (attachment):", attErr);
                return res.status(500).json({ message: "Failed to generate report", error: attErr.message });
            }

            db.query(logbookSql, [studentId], (logErr, logResults) => {
                if (logErr) {
                    console.log("MYSQL ERROR (logbook):", logErr);
                    return res.status(500).json({ message: "Failed to generate report", error: logErr.message });
                }

                db.query(evaluationSql, [studentId], (evalErr, evalResults) => {
                    if (evalErr) {
                        console.log("MYSQL ERROR (evaluation):", evalErr);
                        return res.status(500).json({ message: "Failed to generate report", error: evalErr.message });
                    }

                    let content = `ATTACHMENT PROGRESS REPORT\n`;
                    content += `Generated: ${new Date().toISOString()}\n`;
                    content += `========================================\n\n`;

                    content += `STUDENT\n`;
                    content += `Name: ${student.first_name} ${student.last_name}\n`;
                    content += `Registration No: ${student.registration_number}\n`;
                    content += `Course: ${student.course}, Year ${student.year_of_study}\n\n`;

                    content += `ATTACHMENT DETAILS\n`;
                    if (attResults.length > 0) {
                        const a = attResults[0];
                        content += `Organization: ${a.organization_name} (${a.organization_type || "N/A"})\n`;
                        content += `Location: ${a.town || "N/A"}, ${a.county || "N/A"}\n`;
                        content += `Duration: ${a.start_date} to ${a.end_date}\n`;
                        content += `Status: ${a.status}\n\n`;
                    } else {
                        content += `No attachment record on file.\n\n`;
                    }

                    content += `LOGBOOK ENTRIES (${logResults.length} total)\n`;
                    logResults.forEach((entry) => {
                        content += `-- Week ${entry.week_number} (${entry.date_submitted}) [${entry.approval_status}]\n`;
                        content += `   Activity: ${entry.activity}\n`;
                        if (entry.supervisor_comment) {
                            content += `   Supervisor comment: ${entry.supervisor_comment}\n`;
                        }
                    });
                    content += `\n`;

                    content += `EVALUATION\n`;
                    if (evalResults.length > 0) {
                        const e = evalResults[0];
                        content += `Technical Skills: ${e.technical_skills}/10\n`;
                        content += `Communication: ${e.communication}/10\n`;
                        content += `Teamwork: ${e.teamwork}/10\n`;
                        content += `Punctuality: ${e.punctuality}/10\n`;
                        content += `Overall Score: ${e.overall_score}/10\n`;
                        content += `Remarks: ${e.remarks || "None"}\n`;
                    } else {
                        content += `Not yet evaluated.\n`;
                    }

                    const reportsDir = path.join(__dirname, "..", "uploads", "reports");
                    if (!fs.existsSync(reportsDir)) {
                        fs.mkdirSync(reportsDir, { recursive: true });
                    }

                    const fileName = `report_student${studentId}_${Date.now()}.txt`;
                    const filePath = path.join(reportsDir, fileName);

                    fs.writeFile(filePath, content, (writeErr) => {
                        if (writeErr) {
                            console.log("FILE WRITE ERROR:", writeErr);
                            return res.status(500).json({ message: "Failed to save report file", error: writeErr.message });
                        }

                        const reportData = {
                            student_id: studentId,
                            report_name: fileName,
                            file_path: `uploads/reports/${fileName}`
                        };

                        Report.addReport(reportData, (dbErr, result) => {
                            if (dbErr) {
                                console.log("MYSQL ERROR (addReport):", dbErr);
                                return res.status(500).json({ message: "Failed to log report", error: dbErr.message });
                            }

                            res.status(201).json({
                                message: "Report generated successfully",
                                report_id: result.insertId,
                                report_name: fileName,
                                content: content
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.getMyReports = (req, res) => {
    const studentId = req.user.student_id;
    Report.getByStudentId(studentId, (err, results) => {
        if (err) {
            console.log("MYSQL ERROR (getMyReports):", err);
            return res.status(500).json({ message: "Failed to fetch reports", error: err.message });
        }
        res.status(200).json(results);
    });
};

// GET THE FULL TEXT CONTENT OF ONE PAST REPORT (owned by the logged-in student)
exports.getReportContent = (req, res) => {
    const studentId = req.user.student_id;
    const reportId = req.params.reportId;

    const sql = `SELECT * FROM reports WHERE report_id = ? AND student_id = ? LIMIT 1`;

    db.query(sql, [reportId, studentId], (err, results) => {
        if (err) {
            console.log("MYSQL ERROR (getReportContent):", err);
            return res.status(500).json({ message: "Failed to fetch report", error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Report not found" });
        }

        const report = results[0];
        const fullPath = path.join(__dirname, "..", report.file_path);

        fs.readFile(fullPath, "utf8", (readErr, content) => {
            if (readErr) {
                console.log("FILE READ ERROR:", readErr);
                return res.status(500).json({ message: "Failed to read report file", error: readErr.message });
            }
                        res.status(200).json({
                report_id: report.report_id,
                report_name: report.report_name,
                generated_at: report.generated_at,
                content: content
            });
        });
    });
};