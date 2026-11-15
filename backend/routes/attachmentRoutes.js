const express = require("express");
const router = express.Router();

const attachmentController = require("../controllers/attachmentController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/", verifyToken, attachmentController.addAttachment);
router.get("/my-attachment", verifyToken, attachmentController.getMyAttachment);

module.exports = router;