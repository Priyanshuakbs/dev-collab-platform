// backend/controllers/taskController.js

const Task      = require("../models/Task");
const Workspace = require("../models/Workspace");

// ─── Helper: check workspace access ─────────────────────────────────
const hasAccess = async (workspaceId, userId) => {
  try {
    const ws = await Workspace.findById(workspaceId);
    if (!ws) {
      console.error(`Workspace not found: ${workspaceId}`);
      return false;
    }

    const userIdStr = userId.toString();
    const ownerIdStr = ws.owner.toString();
    const memberIds = (ws.members || []).map((m) => m.toString());

    const hasOwnerAccess = ownerIdStr === userIdStr;
    const hasMemberAccess = memberIds.includes(userIdStr);

    return hasOwnerAccess || hasMemberAccess;
  } catch (error) {
    console.error("Error checking workspace access:", error);
    return false;
  }
};

// ─── Get all tasks in workspace ──────────────────────────────────────
exports.getTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    if (!(await hasAccess(workspaceId, req.user.id)))
      return res.status(403).json({ message: "Access denied" });

    const tasks = await Task.find({ workspace: workspaceId })
      .populate("assignedTo", "name email avatar")
      .populate("createdBy",  "name email avatar")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Create task ─────────────────────────────────────────────────────
exports.createTask = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title, description, priority, assignedTo, deadline } = req.body;

    if (!(await hasAccess(workspaceId, req.user._id)))
      return res.status(403).json({ message: "Access denied" });

    const task = await Task.create({
      title,
      description: description || "",
      priority:    priority    || "medium",
      assignedTo:  assignedTo  || null,
      deadline:    deadline    || null,
      workspace:   workspaceId,
      createdBy:   req.user._id,
      status:      "todo",
    });

    const populated = await task.populate([
      { path: "assignedTo", select: "name email avatar" },
      { path: "createdBy",  select: "name email avatar" },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Update task (title, description, priority, assignedTo, deadline) 
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!(await hasAccess(task.workspace, req.user.id)))
      return res.status(403).json({ message: "Access denied" });

    const { title, description, priority, assignedTo, deadline } = req.body;

    if (title       !== undefined) task.title       = title;
    if (description !== undefined) task.description = description;
    if (priority    !== undefined) task.priority    = priority;
    if (assignedTo  !== undefined) task.assignedTo  = assignedTo;
    if (deadline    !== undefined) task.deadline    = deadline;

    await task.save();

    const populated = await task.populate([
      { path: "assignedTo", select: "name email avatar" },
      { path: "createdBy",  select: "name email avatar" },
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Update task status (drag & drop) ───────────────────────────────
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!(await hasAccess(task.workspace, req.user.id)))
      return res.status(403).json({ message: "Access denied" });

    const oldStatus = task.status;
    task.status = status;
    await task.save();

    // Trigger notification if task is marked done/completed
    if (status === "done" && oldStatus !== "done") {
      try {
        const { createNotification } = require("./notificationController");
        const workspace = await Workspace.findById(task.workspace);
        
        const creatorId = (task.createdBy?._id || task.createdBy)?.toString();
        const assigneeId = (task.assignedTo?._id || task.assignedTo)?.toString();
        const ownerId = (workspace?.owner?._id || workspace?.owner)?.toString();
        const currentUserId = req.user._id.toString();

        // Notify workspace owner (if not the one who completed it)
        if (ownerId && ownerId !== currentUserId) {
          await createNotification({
            recipient: ownerId,
            sender: req.user._id,
            type: "task_completed",
            message: `Task "${task.title}" was completed by ${req.user.name}`,
            link: `/workspace/${task.workspace}`,
            meta: { taskId: task._id, workspaceId: task.workspace }
          });
        }
        
        // Notify the task creator (if not the owner and not the one who completed it)
        if (creatorId && creatorId !== currentUserId && creatorId !== ownerId) {
          await createNotification({
            recipient: creatorId,
            sender: req.user._id,
            type: "task_completed",
            message: `Task "${task.title}" was completed by ${req.user.name}`,
            link: `/workspace/${task.workspace}`,
            meta: { taskId: task._id, workspaceId: task.workspace }
          });
        }

        // Notify the assigned user (if not the creator/owner and not the one who completed it)
        if (assigneeId && assigneeId !== currentUserId && assigneeId !== ownerId && assigneeId !== creatorId) {
          await createNotification({
            recipient: assigneeId,
            sender: req.user._id,
            type: "task_completed",
            message: `Task "${task.title}" was completed by ${req.user.name}`,
            link: `/workspace/${task.workspace}`,
            meta: { taskId: task._id, workspaceId: task.workspace }
          });
        }
      } catch (err) {
        console.error("Task completion notification error:", err);
      }
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Delete task ─────────────────────────────────────────────────────
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!(await hasAccess(task.workspace, req.user.id)))
      return res.status(403).json({ message: "Access denied" });

    await task.deleteOne();
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
