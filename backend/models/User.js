// backend/models/User.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    // ── Profile Fields ──────────────────────────────────
    avatar: {
      type: String,
      default: "", // Cloudinary URL ya base64
    },

    bio: {
      type: String,
      default: "",
      maxlength: 300,
    },

    skills: {
      type: [String], // ["React", "Node.js", "MongoDB"]
      default: [],
    },

    github: {
      type: String,
      default: "",
    },

    linkedin: {
      type: String,
      default: "",
    },

    isPublic: {
      type: Boolean,
      default: true, // public profile by default
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
