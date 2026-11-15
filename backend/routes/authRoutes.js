const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passwordController = require("../controllers/passwordController");

router.post("/student/login", authController.studentLogin);
router.post("/supervisor/login", authController.supervisorLogin);
router.post("/admin/login", authController.adminLogin);
router.post("/forgot-password", passwordController.requestReset);
router.post("/reset-password", passwordController.resetPassword);

module.exports = router;