 const Notification = require("../models/Notification");

exports.getMyNotifications = (req, res) => {
    const studentId = req.user.student_id;
    Notification.getByStudentId(studentId, (err, results) => {
        if (err) {
            console.log("MYSQL ERROR (getMyNotifications):", err);
            return res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
        }
        res.status(200).json(results);
    });
};

exports.markAsRead = (req, res) => {
    const studentId = req.user.student_id;
    const notificationId = req.params.notificationId;
    Notification.markAsRead(notificationId, studentId, (err, result) => {
        if (err) {
            console.log("MYSQL ERROR (markAsRead):", err);
            return res.status(500).json({ message: "Failed to update notification", error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.status(200).json({ message: "Notification marked as read" });
    });
};

exports.getMySupervisorNotifications = (req, res) => {
    const supervisorId = req.user.supervisor_id;
    Notification.getBySupervisorId(supervisorId, (err, results) => {
        if (err) {
            console.log("MYSQL ERROR (getMySupervisorNotifications):", err);
            return res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
        }
        res.status(200).json(results);
    });
};

exports.markSupervisorNotificationAsRead = (req, res) => {
    const supervisorId = req.user.supervisor_id;
    const notificationId = req.params.notificationId;
    Notification.markSupervisorNotificationAsRead(notificationId, supervisorId, (err, result) => {
        if (err) {
            console.log("MYSQL ERROR (markSupervisorNotificationAsRead):", err);
            return res.status(500).json({ message: "Failed to update notification", error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.status(200).json({ message: "Notification marked as read" });
    });
};