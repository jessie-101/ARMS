const Logbook = require("../models/Logbook");
const Attachment = require("../models/Attachment");
const Notification = require("../models/Notification");

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDate(str) {
    return new Date(String(str).slice(0, 10) + "T00:00:00Z");
}

function weekNumberFor(startStr, dateStr) {
    const start = toUtcDate(startStr);
    const daysSinceMonday = (start.getUTCDay() + 6) % 7;
    const firstMonday = new Date(start.getTime() - daysSinceMonday * DAY_MS);
    return Math.floor((toUtcDate(dateStr) - firstMonday) / (7 * DAY_MS)) + 1;
}

exports.addEntry = (req, res) => {
    const studentId = req.user.student_id;
    const { activity, skills_gained, challenges, date_submitted } = req.body;

    if (!activity || !date_submitted) {
        return res.status(400).json({ message: "activity and date_submitted are required" });
    }

    const entryDate = toUtcDate(date_submitted);
    if (isNaN(entryDate.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
    }

    const day = entryDate.getUTCDay();
    if (day === 0 || day === 6) {
        return res.status(400).json({ message: "Entries can only be made for Monday to Friday" });
    }

    Attachment.getByStudentId(studentId, (attErr, attResults) => {
        if (attErr) {
            console.log("MYSQL ERROR (attachment):", attErr);
            return res.status(500).json({ message: "Failed to check attachment", error: attErr.message });
        }
        if (attResults.length === 0) {
            return res.status(400).json({ message: "Add your attachment details before writing logbook entries" });
        }

        const attachment = attResults[0];
        if (entryDate < toUtcDate(attachment.start_date) || entryDate > toUtcDate(attachment.end_date)) {
            return res.status(400).json({ message: "That date is outside your attachment period" });
        }

        Logbook.getByStudentId(studentId, (listErr, existing) => {
            if (listErr) {
                console.log("MYSQL ERROR (getByStudentId):", listErr);
                return res.status(500).json({ message: "Failed to check existing entries", error: listErr.message });
            }

            const dateKey = String(date_submitted).slice(0, 10);
            if (existing.some((e) => String(e.date_submitted).slice(0, 10) === dateKey)) {
                return res.status(409).json({ message: `An entry for ${dateKey} already exists` });
            }

                     const weekNumber = weekNumberFor(attachment.start_date, dateKey);
            if (weekNumber < 1 || weekNumber > 12) {
                return res.status(400).json({ message: "The attachment runs for 12 weeks only" });
            }
            const now = new Date();
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            if (dateKey > todayKey) {
                return res.status(400).json({ message: "You cannot write an entry for a future date" });
            };

            Logbook.addEntry(data, (err, result) => {
                if (err) {
                    console.log("MYSQL ERROR (addEntry):", err);
                    return res.status(500).json({ message: "Failed to add logbook entry", error: err.message });
                }
                res.status(201).json({
                    message: "Logbook entry added successfully",
                    log_id: result.insertId,
                    week_number: weekNumber
                });
            });
        });
    });
};

exports.getMyEntries = (req, res) => {
    const studentId = req.user.student_id;
    Logbook.getByStudentId(studentId, (err, results) => {
        if (err) {
            console.log("MYSQL ERROR (getMyEntries):", err);
            return res.status(500).json({ message: "Failed to fetch logbook entries", error: err.message });
        }
        res.status(200).json(results);
    });
};

exports.reviewEntry = (req, res) => {
    if (req.user.role !== "supervisor") {
        return res.status(403).json({ message: "Only supervisors can review logbook entries" });
    }
    const supervisorId = req.user.supervisor_id;
    const logId = req.params.logId;
    const { supervisor_comment, approval_status } = req.body;
    const validStatuses = ["Pending", "Approved", "Rejected"];
    if (!approval_status || !validStatuses.includes(approval_status)) {
        return res.status(400).json({ message: "approval_status must be one of: Pending, Approved, Rejected" });
    }
    Logbook.getByIdWithSupervisor(logId, (err, results) => {
        if (err) {
            console.log("MYSQL ERROR (getByIdWithSupervisor):", err);
            return res.status(500).json({ message: "Failed to fetch logbook entry", error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Logbook entry not found" });
        }
        const entry = results[0];
        if (entry.academic_supervisor_id !== supervisorId) {
            return res.status(403).json({ message: "You are not assigned to this student's attachment" });
        }
        if (entry.approval_status !== "Pending") {
            return res.status(409).json({
                message: `This entry has already been ${entry.approval_status.toLowerCase()} and cannot be reviewed again`
            });
        }
        Logbook.updateReview(logId, supervisor_comment || null, approval_status, (updateErr) => {
            if (updateErr) {
                console.log("MYSQL ERROR (updateReview):", updateErr);
                return res.status(500).json({ message: "Failed to update logbook entry", error: updateErr.message });
            }
            const notifMessage = `Your Week ${entry.week_number} logbook entry was ${approval_status.toLowerCase()}.`;
            Notification.addNotification(entry.student_id, notifMessage, (notifErr) => {
                if (notifErr) console.log("NOTIFICATION ERROR (reviewEntry):", notifErr);
            });
            res.status(200).json({ message: "Logbook entry reviewed successfully" });
        });
    });
};