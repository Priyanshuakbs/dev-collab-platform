// backend/controllers/fileController.js

const File      = require("../models/File");
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

// ─── Get all files in a workspace ───────────────────────────────────
exports.getFiles = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ 
        message: `Workspace ${workspaceId} not found` 
      });
    }

    // Check access
    if (!(await hasAccess(workspaceId, req.user._id))) {
      return res.status(403).json({ 
        message: "You don't have access to this workspace" 
      });
    }

    const files = await File.find({ workspace: workspaceId })
      .populate("owner", "name email avatar")
      .sort({ createdAt: 1 });

    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get single file content ─────────────────────────────────────────
exports.getFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId)
      .populate("owner", "name email avatar");

    if (!file) return res.status(404).json({ message: "File not found" });

    if (!(await hasAccess(file.workspace, req.user._id)))
      return res.status(403).json({ message: "Access denied" });

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Create new file ─────────────────────────────────────────────────
exports.createFile = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, language, content } = req.body;

    // Validate workspace exists and user has access
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (!(await hasAccess(workspaceId, req.user._id))) {
      return res.status(403).json({ message: "You don't have access to this workspace" });
    }

    // Duplicate file name check in same workspace
    const existing = await File.findOne({ workspace: workspaceId, name });
    if (existing)
      return res.status(400).json({ message: "A file with this name already exists" });

    const file = await File.create({
      name,
      language: language || detectLanguage(name),
      content:  content || getTemplate(language || detectLanguage(name)),
      workspace: workspaceId,
      owner: req.user._id,
    });

    const populated = await file.populate("owner", "name email avatar");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Update file content (only owner) ───────────────────────────────
exports.updateFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    // Only owner can edit
    if (file.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "You can only edit your own files" });

    const { content, name } = req.body;

    if (content !== undefined) file.content = content;
    if (name    !== undefined) file.name    = name;

    await file.save();
    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Delete file (only owner) ────────────────────────────────────────
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "You can only delete your own files" });

    await file.deleteOne();
    res.json({ message: "File deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Detect language from filename ───────────────────────────────────
function detectLanguage(filename) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp", cc: "cpp", cxx: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    html: "html", htm: "html",
    css: "css", scss: "scss",
    json: "json",
    md: "markdown",
    sql: "sql",
    sh: "shell", bash: "shell",
    yaml: "yaml", yml: "yaml",
    xml: "xml",
  };
  return map[ext] || "plaintext";
}

// ─── Starter templates ────────────────────────────────────────────────
function getTemplate(language) {
  const templates = {
    javascript: `// JavaScript file\nconsole.log("Hello, World!");\n`,
    typescript: `// TypeScript file\nconst greet = (name: string): string => {\n  return \`Hello, \${name}!\`;\n};\nconsole.log(greet("World"));\n`,
    python:     `# Python file\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n`,
    rust:       `// Rust file\nfn main() {\n    println!("Hello, World!");\n}\n`,
    go:         `// Go file\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n`,
    java:       `// Java file\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
    cpp:        `// C++ file\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n`,
    c:          `// C file\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
    html:       `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n`,
    css:        `/* CSS file */\nbody {\n  margin: 0;\n  font-family: sans-serif;\n}\n`,
    python:     `# Python file\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n`,
  };
  return templates[language] || `// ${language} file\n`;
}
