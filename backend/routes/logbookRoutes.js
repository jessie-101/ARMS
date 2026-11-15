const express = require("express");
const router = express.Router();

const logbookController = require("../controllers/logbookController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/", verifyToken, logbookController.addEntry);
router.get("/my-entries", verifyToken, logbookController.getMyEntries);
router.put("/:logId/review", verifyToken, logbookController.reviewEntry);

module.exports = router;