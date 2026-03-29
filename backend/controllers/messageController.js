const Message = require("../models/Message");

// Save Message
exports.saveMessage = async (req, res) => {
  try {
    const { workspaceId, message } = req.body;

    const newMessage = await Message.create({
      workspace: workspaceId,
      sender: req.user._id,
      message,
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Workspace Messages
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      workspace: req.params.workspaceId,
    })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};