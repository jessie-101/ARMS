 const express = require("express");

const router = express.Router();

const studentController = require("../controllers/studentController");
const { verifyToken } = require("../middleware/authMiddleware");


router.post(
    "/register",
    studentController.registerStudent
);

router.get(
    "/profile",
    verifyToken,
    studentController.getProfile
);

router.put(
    "/profile",
    verifyToken,
    studentController.updateOwnProfile
);

router.get(
    "/my-evaluation",
    verifyToken,
    studentController.getMyEvaluation
);


module.exports = router;