// backend/models/Project.js
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    teamName: {
      type: String,
      required: true,
      trim: true,
    },

    teamLogo: {
      type: String, // Can store base64 data URL or external URL
      default: "",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          default: "member",
        },
        workRole: {
          type: String,
          enum: [
            "Project Manager",
            "Frontend Developer",
            "Backend Developer",
            "UI/UX Designer",
            "QA Engineer",
            "DevOps Engineer",
          ],
          default: "Frontend Developer",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    inviteLinks: [
      {
        token: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        workRole: {
          type: String,
          required: true,
        },
        expiresAt: {
          type: Date,
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    pendingInvites: [
      {
        email: {
          type: String,
          required: true,
          trim: true,
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        workRole: {
          type: String,
          required: true,
        },
        token: {
          type: String,
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    deadline: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);