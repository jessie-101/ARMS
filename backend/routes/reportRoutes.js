 const express = require("express");
const router = express.Router();

const reportController = require("../controllers/reportController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/generate", verifyToken, reportController.generateReport);
router.get("/my-reports", verifyToken, reportController.getMyReports);
router.get("/:reportId/content", verifyToken, reportController.getReportContent);

module.exports = router;