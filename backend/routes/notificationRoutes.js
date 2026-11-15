 const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/my-notifications", verifyToken, notificationController.getMyNotifications);
router.put("/:notificationId/read", verifyToken, notificationController.markAsRead);

router.get("/supervisor/my-notifications", verifyToken, notificationController.getMySupervisorNotifications);
router.put("/supervisor/:notificationId/read", verifyToken, notificationController.markSupervisorNotificationAsRead);

module.exports = router;