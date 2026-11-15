 const express = require("express");
const router = express.Router();

const supervisorController = require("../controllers/supervisorController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/register", supervisorController.registerSupervisor);
router.get("/my-students", verifyToken, supervisorController.getAssignedStudents);
router.get("/students/:studentId", verifyToken, supervisorController.getAssignedStudentDetail);
router.post("/evaluations", verifyToken, supervisorController.addEvaluation);
router.get("/logbooks", verifyToken, supervisorController.getAssignedLogbookEntries);

module.exports = router;