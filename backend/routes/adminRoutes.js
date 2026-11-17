const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const adminOnly = [verifyToken, requireRole("admin")];

router.post("/register", adminOnly, adminController.registerAdmin);
router.get("/students", adminOnly, adminController.getAllStudents);
router.get("/supervisors", adminOnly, adminController.getAllSupervisors);
router.post("/assign-supervisor", adminOnly, adminController.assignSupervisor);
router.put("/students/:studentId", adminOnly, adminController.updateStudent);
router.delete("/students/:studentId", adminOnly, adminController.deleteStudent);
router.put("/supervisors/:supervisorId", adminOnly, adminController.updateSupervisor);
router.delete("/supervisors/:supervisorId", adminOnly, adminController.deleteSupervisor);

module.exports = router;