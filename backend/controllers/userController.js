// backend/controllers/userController.js

const User = require("../models/User");
const Project = require("../models/Project");

// ─── Search Users (existing — unchanged) ────────────────────────────
exports.searchUsers = async (req, res) => {
  try {
    const keyword = req.query.q;
    if (!keyword) return res.json([]);

    const users = await User.find({
      $and: [
        {
          $or: [
            { name: { $regex: keyword, $options: "i" } },
            { email: { $regex: keyword, $options: "i" } },
          ],
        },
        { _id: { $ne: req.user._id } },
      ],
    }).select("_id name email avatar skills isPublic");

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get All Users (existing — unchanged) ───────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isPublic: true }).select(
      "_id name email avatar skills bio"
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Single User by ID (public profile) ─────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "_id name email avatar bio skills github linkedin isPublic createdAt"
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    // Private profile — sirf khud dekh sakta hai
    const isOwner = req.user?.id === user._id.toString();
    if (!user.isPublic && !isOwner) {
      return res.status(403).json({ message: "This profile is private" });
    }

    // User ke projects bhi fetch karo
    const projects = await Project.find({
      $or: [{ owner: user._id }, { members: user._id }],
    }).select("_id name description createdAt");

    res.json({ ...user.toObject(), projects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get My Profile (apna profile) ──────────────────────────────────
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    const projects = await Project.find({
      $or: [{ owner: user._id }, { members: user._id }],
    }).select("_id name description createdAt");

    res.json({ ...user.toObject(), projects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Update My Profile ───────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, skills, github, linkedin, avatar, isPublic } = req.body;

    // Skills string aayi ho toh array mein convert karo
    const skillsArray =
      typeof skills === "string"
        ? skills.split(",").map((s) => s.trim()).filter(Boolean)
        : skills;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(skillsArray && { skills: skillsArray }),
        ...(github !== undefined && { github }),
        ...(linkedin !== undefined && { linkedin }),
        ...(avatar !== undefined && { avatar }),
        ...(isPublic !== undefined && { isPublic }),
      },
      { new: true }
    ).select("-password");

    res.json({ message: "Profile updated", user: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
