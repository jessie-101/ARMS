 const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/register", adminController.registerAdmin);
router.get("/students", verifyToken, adminController.getAllStudents);
router.get("/supervisors", verifyToken, adminController.getAllSupervisors);
router.post("/assign-supervisor", verifyToken, adminController.assignSupervisor);
router.put("/students/:studentId", verifyToken, adminController.updateStudent);
router.delete("/students/:studentId", verifyToken, adminController.deleteStudent);
router.put("/supervisors/:supervisorId", verifyToken, adminController.updateSupervisor);
router.delete("/supervisors/:supervisorId", verifyToken, adminController.deleteSupervisor);

module.exports = router;