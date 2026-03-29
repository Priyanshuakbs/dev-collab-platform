const express = require("express");
const router  = express.Router({ mergeParams: true });
const {
  getFiles, getFile, createFile, updateFile, deleteFile,
} = require("../controllers/fileController");
const { protect } = require("../middleware/authMiddleware");

router.get(   "/",           protect, getFiles);
router.post(  "/",           protect, createFile);
router.get(   "/:fileId",    protect, getFile);
router.put(   "/:fileId",    protect, updateFile);
router.delete("/:fileId",    protect, deleteFile);

module.exports = router;