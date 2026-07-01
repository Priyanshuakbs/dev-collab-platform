// backend/controllers/projectController.js
const Project   = require("../models/Project");
const Workspace = require("../models/Workspace");
const User      = require("../models/User");
const crypto    = require("crypto");
const { createNotification } = require("./notificationController");
const sendEmail = require("../utils/email");

// Helper: check if user is a member/owner
const isMember = (project, userId) => {
  const id = userId.toString();
  return (
    project.owner.toString() === id ||
    (project.members || []).some((m) => m.user && (m.user._id || m.user).toString() === id)
  );
};

// ─── Create Project ──────────────────────────────────────────────────
exports.createProject = async (req, res) => {
  try {
    const { projectName, description, teamName, teamLogo, priority, deadline } = req.body;

    if (!projectName || !projectName.trim()) {
      return res.status(400).json({ message: "Project Name is required" });
    }
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ message: "Team Name is required" });
    }

    const project = await Project.create({
      projectName:   projectName.trim(),
      description:   description || "",
      teamName:      teamName.trim(),
      teamLogo:      teamLogo || "",
      priority:      priority || "medium",
      deadline:      deadline || null,
      owner:         req.user._id,
      members: [
        {
          user:     req.user._id,
          role:     "owner",
          workRole: "Project Manager",
        },
      ],
      workspace:     null,
    });

    const populated = await project.populate("owner", "name email avatar");
    res.status(201).json(populated);
  } catch (error) {
    console.error("createProject error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─── Get My Projects ──────────────────────────────────────────────────
exports.getMyProjects = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = {
      $or: [
        { owner: req.user._id },
        { "members.user": req.user._id },
      ],
    };
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;

    const projects = await Project.find(filter)
      .populate("owner",         "name email avatar")
      .populate("members.user",  "name email avatar")
      .populate({ path: "workspace", populate: { path: "createdBy", select: "name email avatar" } })
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Projects I Own ───────────────────────────────────────────────
exports.getOwnedProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id })
      .populate("owner",         "name email avatar")
      .populate("members.user",  "name email avatar")
      .populate({ path: "workspace", populate: { path: "createdBy", select: "name email avatar" } })
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Projects Shared With Me ──────────────────────────────────────
exports.getSharedProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      "members.user": req.user._id,
      owner:         { $ne: req.user._id },
    })
      .populate("owner",         "name email avatar")
      .populate("members.user",  "name email avatar")
      .populate({ path: "workspace", populate: { path: "createdBy", select: "name email avatar" } })
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Single Project ──────────────────────────────────────────────
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner",         "name email avatar")
      .populate("members.user",  "name email avatar")
      .populate({ path: "workspace", populate: { path: "createdBy", select: "name email avatar" } });

    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!isMember(project, req.user._id)) {
      return res.status(403).json({
        message: "Access denied. You are not a member of this project.",
      });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Project by Workspace ID ──────────────────────────────────────
exports.getProjectByWorkspace = async (req, res) => {
  try {
    const project = await Project.findOne({ workspace: req.params.workspaceId })
      .populate("owner",         "name email avatar")
      .populate("members.user",  "name email avatar");

    if (!project) return res.status(404).json({ message: "Project not found for this workspace" });

    if (!isMember(project, req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Update Project ──────────────────────────────────────────────────
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isOwner  = project.owner.toString() === req.user._id.toString();
    const isAdmin  = project.members.some(
      (m) => m.user && m.user.toString() === req.user._id.toString() && m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only owner can change status/priority/deadline/projectName/teamName/teamLogo/description
    const updates = {};
    const allowedFields = [
      "projectName", "description", "teamName", "teamLogo", "priority", "deadline", "status"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Project.findByIdAndUpdate(
      req.params.id, updates, { new: true }
    )
      .populate("owner",         "name email avatar")
      .populate("members.user",  "name email avatar")
      .populate("workspace",     "name");

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Delete Project ──────────────────────────────────────────────────
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the project owner can delete it" });

    // Clean up Workspace as well
    if (project.workspace) {
      await Workspace.findByIdAndDelete(project.workspace);
    }

    await project.deleteOne();
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Leave Project ───────────────────────────────────────────────────
exports.leaveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() === req.user._id.toString())
      return res.status(400).json({ message: "Owner cannot leave their own project" });

    project.members = project.members.filter(
      (m) => m.user && m.user.toString() !== req.user._id.toString()
    );
    await project.save();

    // Also remove from Workspace
    if (project.workspace) {
      const workspace = await Workspace.findById(project.workspace);
      if (workspace) {
        workspace.members = workspace.members.filter(
          (m) => m.toString() !== req.user._id.toString()
        );
        await workspace.save();
      }
    }

    res.json({ message: "You have left the project" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Remove Member ───────────────────────────────────────────────────
exports.removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const memberId = req.params.memberId;
    if (project.owner.toString() === memberId) {
      return res.status(400).json({ message: "Cannot remove the project owner" });
    }

    // Role-based auth: Only Owner or Admin can remove
    const requesterId = req.user._id.toString();
    const isRequesterOwner = project.owner.toString() === requesterId;
    const requesterMember = project.members.find((m) => m.user && m.user.toString() === requesterId);
    const isRequesterAdmin = requesterMember && requesterMember.role === "admin";

    if (!isRequesterOwner && !isRequesterAdmin) {
      return res.status(403).json({ message: "Only Owner or Admin can remove members" });
    }

    // Admins cannot remove Admins or Owners
    const targetMember = project.members.find((m) => m.user && m.user.toString() === memberId);
    if (isRequesterAdmin && targetMember && (targetMember.role === "admin" || targetMember.role === "owner")) {
      return res.status(403).json({ message: "Admins cannot remove other Admins or Owners" });
    }

    project.members = project.members.filter(
      (m) => m.user && m.user.toString() !== memberId
    );
    await project.save();

    // Also remove from Workspace
    if (project.workspace) {
      const workspace = await Workspace.findById(project.workspace);
      if (workspace) {
        workspace.members = workspace.members.filter(
          (m) => m.toString() !== memberId
        );
        await workspace.save();
      }
    }

    // Trigger instant client socket update
    if (global.io && project.workspace) {
      global.io.to(project.workspace.toString()).emit("membersListUpdated");
    }

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Update Member Role (Permission Role / Work Role) ────────────────
exports.updateMemberRole = async (req, res) => {
  try {
    const { role, workRole } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const memberId = req.params.memberId;
    if (project.owner.toString() === memberId) {
      return res.status(400).json({ message: "Cannot change the role of the Owner" });
    }

    // Role-based auth
    const requesterId = req.user._id.toString();
    const isRequesterOwner = project.owner.toString() === requesterId;
    const requesterMember = project.members.find((m) => m.user && m.user.toString() === requesterId);
    const isRequesterAdmin = requesterMember && requesterMember.role === "admin";

    if (!isRequesterOwner && !isRequesterAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Admins cannot edit other Admins or Owners
    const targetMember = project.members.find((m) => m.user && m.user.toString() === memberId);
    if (!targetMember) return res.status(404).json({ message: "Member not found in project" });

    if (isRequesterAdmin && (targetMember.role === "admin" || targetMember.role === "owner")) {
      return res.status(403).json({ message: "Admins cannot change role of other Admins or Owners" });
    }

    if (role && ["admin", "member"].includes(role)) {
      targetMember.role = role;
    }
    if (workRole) {
      targetMember.workRole = workRole;
    }

    await project.save();

    // Trigger instant client socket update
    if (global.io && project.workspace) {
      global.io.to(project.workspace.toString()).emit("membersListUpdated");
    }

    res.json({ message: "Member role updated successfully", member: targetMember });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Transfer Ownership ───────────────────────────────────────────────
exports.transferOwnership = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the current Owner can transfer ownership" });
    }

    const targetMember = project.members.find((m) => m.user && m.user.toString() === targetUserId);
    if (!targetMember) {
      return res.status(400).json({ message: "Target user is not a member of this project" });
    }

    // Current owner becomes Admin
    const ownerMember = project.members.find((m) => m.user && m.user.toString() === req.user._id.toString());
    if (ownerMember) ownerMember.role = "admin";

    // Target becomes Owner
    targetMember.role = "owner";
    project.owner = targetUserId;

    await project.save();

    // Trigger instant client socket update
    if (global.io && project.workspace) {
      global.io.to(project.workspace.toString()).emit("membersListUpdated");
    }

    res.json({ message: "Ownership transferred successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Generate Invite Link ─────────────────────────────────────────────
exports.generateInviteLink = async (req, res) => {
  try {
    const { role, workRole } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Auth check
    const requesterId = req.user._id.toString();
    const isOwner = project.owner.toString() === requesterId;
    const match = project.members.find((m) => m.user && m.user.toString() === requesterId);
    const isAdmin = match && match.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Only Owners and Admins can generate invite links" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    project.inviteLinks.push({
      token,
      role:     role || "member",
      workRole: workRole || "Frontend Developer",
      expiresAt,
    });

    await project.save();

    const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/invite/accept/${token}`;
    res.json({ link, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Invite by Email ──────────────────────────────────────────────────
exports.inviteByEmail = async (req, res) => {
  try {
    const { email, role, workRole } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Auth check
    const requesterId = req.user._id.toString();
    const isOwner = project.owner.toString() === requesterId;
    const match = project.members.find((m) => m.user && m.user.toString() === requesterId);
    const isAdmin = match && match.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Only Owners and Admins can invite members" });
    }

    // Check if already a member
    const foundUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (foundUser) {
      const alreadyIn = project.members.some(
        (m) => m.user && (m.user._id || m.user).toString() === foundUser._id.toString()
      );
      if (alreadyIn) return res.status(400).json({ message: "User is already a member" });
    }

    // Check if already pending
    const alreadyPending = project.pendingInvites.some(
      (inv) => inv.email.toLowerCase() === email.toLowerCase().trim()
    );
    if (alreadyPending) {
      return res.status(400).json({ message: "An invitation is already pending for this email" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    project.pendingInvites.push({
      email:     email.toLowerCase().trim(),
      role:      role || "member",
      workRole:  workRole || "Frontend Developer",
      token,
      invitedBy: req.user._id,
    });

    await project.save();

    // If user has an account, send a direct socket notification
    if (foundUser) {
      await createNotification({
        recipient: foundUser._id,
        sender:    req.user._id,
        type:      "invitation_received",
        message:   `${req.user.name} invited you to join team "${project.teamName}" for project "${project.projectName}"`,
        link:      `/workspace/${project.workspace}`,
        meta:      { projectId: project._id, token },
      });
    }

    let emailSent = false;
    try {
      const inviteLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/invite/accept/${token}`;
      emailSent = await sendEmail({
        to: email.toLowerCase().trim(),
        subject: `Invitation to join team "${project.teamName}" on DevCollab`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #7c3aed;">You've been invited!</h2>
            <p>Hello,</p>
            <p><strong>${req.user.name}</strong> has invited you to join the team <strong>"${project.teamName}"</strong> for the project <strong>"${project.projectName}"</strong> as a <strong>${workRole}</strong>.</p>
            <div style="margin: 25px 0;">
              <a href="${inviteLink}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
            </div>
            <p style="font-size: 12px; color: #777;">If the button doesn't work, you can copy and paste the following URL into your browser:</p>
            <p style="font-size: 12px; color: #777; word-break: break-all;">${inviteLink}</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error("Mail dispatch failed:", mailErr.message);
    }

    res.json({
      message: emailSent
        ? "Invite sent successfully via email!"
        : "Invite saved! (Email service not configured in .env, please share the invite link manually)",
      pending: project.pendingInvites,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Cancel Pending Invite ────────────────────────────────────────────
exports.cancelPendingInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Auth check
    const requesterId = req.user._id.toString();
    const isOwner = project.owner.toString() === requesterId;
    const match = project.members.find((m) => m.user && m.user.toString() === requesterId);
    const isAdmin = match && match.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    project.pendingInvites = project.pendingInvites.filter(
      (inv) => inv._id.toString() !== inviteId
    );

    await project.save();
    res.json({ message: "Invitation cancelled", pending: project.pendingInvites });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Accept Invite Token ──────────────────────────────────────────────
exports.acceptInviteToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Find the project containing either the inviteLink or pendingInvite matching this token
    let project = await Project.findOne({
      $or: [
        { "inviteLinks.token": token },
        { "pendingInvites.token": token },
      ],
    });

    if (!project) {
      return res.status(404).json({ message: "Invitation token invalid or expired" });
    }

    // Already a member?
    const userIdStr = req.user._id.toString();
    const alreadyIn = project.members.some(
      (m) => m.user && (m.user._id || m.user).toString() === userIdStr
    );
    if (alreadyIn) {
      return res.status(400).json({ message: "You are already a member of this project" });
    }

    // Get the invitation specs
    let selectedRole = "member";
    let selectedWorkRole = "Frontend Developer";

    // 1. Check pending email invite
    const emailMatch = project.pendingInvites.find((inv) => inv.token === token);
    if (emailMatch) {
      selectedRole = emailMatch.role;
      selectedWorkRole = emailMatch.workRole;
      // Clean up the email invite
      project.pendingInvites = project.pendingInvites.filter((inv) => inv.token !== token);
    } else {
      // 2. Check general invite link
      const linkMatch = project.inviteLinks.find((link) => link.token === token);
      if (linkMatch) {
        if (linkMatch.expiresAt && new Date(linkMatch.expiresAt) < new Date()) {
          return res.status(400).json({ message: "Invitation link has expired" });
        }
        selectedRole = linkMatch.role;
        selectedWorkRole = linkMatch.workRole;
      }
    }

    // Add to project members
    project.members.push({
      user:     req.user._id,
      role:     selectedRole,
      workRole: selectedWorkRole,
      joinedAt: new Date(),
    });

    await project.save();

    // Add to Workspace members
    if (project.workspace) {
      const workspace = await Workspace.findById(project.workspace);
      if (workspace) {
        const wsAlreadyIn = workspace.members.some((m) => m.toString() === userIdStr);
        if (!wsAlreadyIn) {
          workspace.members.push(req.user._id);
          await workspace.save();
        }
      }
    }

    // Trigger instant client socket update
    if (global.io && project.workspace) {
      global.io.to(project.workspace.toString()).emit("membersListUpdated");
    }

    // Notify all members
    const notifyPromises = project.members
      .filter((m) => m.user && m.user.toString() !== userIdStr)
      .map((m) =>
        createNotification({
          recipient: m.user,
          sender:    req.user._id,
          type:      "workspace_joined",
          message:   `${req.user.name} joined the team as ${selectedWorkRole}!`,
          link:      `/workspace/${project.workspace}`,
          meta:      { projectId: project._id },
        })
      );
    await Promise.all(notifyPromises);

    res.json({ message: "Successfully joined the project workspace!", workspaceId: project.workspace });
  } catch (error) {
    console.error("acceptInviteToken error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─── Create Project Workspace ──────────────────────────────────────────
exports.createProjectWorkspace = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Check if user is a member of the project
    if (!isMember(project, req.user._id)) {
      return res.status(403).json({ message: "Access denied. You must be a project member to create its workspace." });
    }

    if (project.workspace) {
      return res.status(400).json({ message: "Workspace already exists for this project" });
    }

    // Get all user IDs from project members
    const memberIds = project.members.map(m => m.user._id || m.user);

    // Create Workspace
    const workspace = await Workspace.create({
      name:      project.projectName,
      owner:     project.owner,
      createdBy: req.user._id, // Whoever triggers creation is the creator
      members:   memberIds,
    });

    // Link workspace to project
    project.workspace = workspace._id;
    await project.save();

    console.log(`✅ Workspace ${workspace._id} created for Project ${project._id} by user ${req.user._id}`);

    const populatedWorkspace = await Workspace.findById(workspace._id).populate("createdBy", "name email avatar");

    res.status(201).json({
      message: "Workspace created successfully",
      workspace: populatedWorkspace,
      project,
    });
  } catch (error) {
    console.error("createProjectWorkspace error:", error);
    res.status(500).json({ message: error.message });
  }
};