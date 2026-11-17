const express = require("express");
const router = express.Router();

const supervisorController = require("../controllers/supervisorController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const supervisorOnly = [verifyToken, requireRole("supervisor")];
const adminOnly = [verifyToken, requireRole("admin")];

router.post("/register", adminOnly, supervisorController.registerSupervisor);
router.get("/my-students", supervisorOnly, supervisorController.getAssignedStudents);
router.get("/students/:studentId", supervisorOnly, supervisorController.getAssignedStudentDetail);
router.post("/evaluations", supervisorOnly, supervisorController.addEvaluation);
router.get("/logbooks", supervisorOnly, supervisorController.getAssignedLogbookEntries);

module.exports = router;