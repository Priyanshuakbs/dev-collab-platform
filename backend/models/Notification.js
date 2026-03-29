// backend/models/Notification.js

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "invitation_received",  // team invite aaya
        "invitation_accepted",  // invite accept hua
        "invitation_rejected",  // invite reject hua
        "project_joined",       // koi project join kiya
        "task_assigned",        // task assign hua
        "task_completed",       // task complete hua
        "workspace_joined",     // koi workspace join kiya
        "file_created",         // nai file bani
        "mention",              // chat mein mention
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    read: {
      type: Boolean,
      default: false,
    },

    // Related resource link
    link: {
      type: String,
      default: "",
    },

    // Extra data (project name, task title etc.)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
