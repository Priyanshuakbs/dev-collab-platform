// backend/controllers/executeController.js
// Executes code from the real workspace filesystem OR from an inline snippet.
// Supports: Python, JavaScript/Node.js, TypeScript, C++, C, Java

const path     = require("path");
const fs       = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");
const { getWorkspaceDir } = require("../terminal/ptyManager");

const execAsync = promisify(exec);
const TIMEOUT   = 15000; // 15 second execution timeout
const MAX_BYTES = 500 * 1024; // 500 KB output limit

const SUPPORTED = ["python", "javascript", "typescript", "cpp", "c", "java"];

// ── Language runner configs ────────────────────────────────────────────
function getRunner(language, filePath, tmpDir) {
  const isWin = process.platform === "win32";
  const base  = path.basename(filePath, path.extname(filePath));

  switch (language.toLowerCase()) {
    case "python":
      return { compile: null, run: `python "${filePath}"` };

    case "javascript":
    case "typescript":
      // TS: transpile with ts-node if available, else strip types naive
      return { compile: null, run: `node "${filePath}"` };

    case "cpp": {
      const outFile = path.join(tmpDir, isWin ? `${base}.exe` : base);
      return {
        compile: `g++ -std=c++17 -o "${outFile}" "${filePath}"`,
        run:     isWin ? `"${outFile}"` : `"${outFile}"`,
      };
    }

    case "c": {
      const outFile = path.join(tmpDir, isWin ? `${base}.exe` : base);
      return {
        compile: `gcc -o "${outFile}" "${filePath}"`,
        run:     isWin ? `"${outFile}"` : `"${outFile}"`,
      };
    }

    case "java": {
      const className = base; // assumes filename matches public class name
      return {
        compile: `javac "${filePath}"`,
        run:     `java -cp "${path.dirname(filePath)}" ${className}`,
      };
    }

    default:
      throw new Error(`Language '${language}' is not supported`);
  }
}

async function runCommand(cmd, cwd, stdin = "", timeout = TIMEOUT) {
  return new Promise((resolve) => {
    const proc = require("child_process").exec(
      cmd,
      { cwd, timeout, maxBuffer: MAX_BYTES },
      (err, stdout, stderr) => {
        if (err?.killed) {
          resolve({ stdout: stdout || "", stderr: `Process timed out after ${timeout / 1000}s`, timedOut: true });
        } else {
          resolve({ stdout: stdout || "", stderr: stderr || "", code: err?.code || 0 });
        }
      }
    );
    if (stdin && proc.stdin) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    }
  });
}

exports.executeCode = async (req, res) => {
  try {
    const { code, language, stdin = "", fileName, workspaceId, filePath: wsRelPath } = req.body;

    if (!language) return res.status(400).json({ message: "language is required" });
    if (!SUPPORTED.includes(language.toLowerCase())) {
      return res.status(400).json({
        message: `'${language}' is not supported. Supported: ${SUPPORTED.join(", ")}`,
      });
    }

    let actualFilePath;
    let tmpDir;
    let cleanup = false;

    if (workspaceId && wsRelPath) {
      // ── Run from real workspace filesystem ──────────────────────────
      const wsDir      = getWorkspaceDir(workspaceId);
      actualFilePath   = path.resolve(wsDir, wsRelPath.replace(/\\/g, "/"));
      tmpDir           = wsDir;

      // Ensure file exists (in case user runs without saving first)
      if (!fs.existsSync(actualFilePath)) {
        return res.status(404).json({ message: "File not found in workspace. Save it first." });
      }
    } else if (code) {
      // ── Run from inline code (legacy / fallback) ────────────────────
      const os    = require("os");
      tmpDir      = fs.mkdtempSync(path.join(os.tmpdir(), "devcollab-"));
      const ext   = { python:"py", javascript:"js", typescript:"ts", cpp:"cpp", c:"c", java:"java" }[language.toLowerCase()] || "txt";
      const fname = fileName || `main.${ext}`;
      actualFilePath = path.join(tmpDir, fname);
      fs.writeFileSync(actualFilePath, code, "utf-8");
      cleanup = true;
    } else {
      return res.status(400).json({ message: "Either 'code' or 'workspaceId + filePath' is required" });
    }

    const runner = getRunner(language, actualFilePath, tmpDir);

    // ── Compile step ───────────────────────────────────────────────────
    if (runner.compile) {
      const compileResult = await runCommand(runner.compile, tmpDir, "", TIMEOUT);
      if (compileResult.stderr && compileResult.code !== 0) {
        if (cleanup) fs.rmSync(tmpDir, { recursive: true, force: true });
        return res.json({
          success:      false,
          compileError: compileResult.stderr,
          runtimeError: "",
          stdout:       "",
          stderr:       compileResult.stderr,
        });
      }
    }

    // ── Run step ───────────────────────────────────────────────────────
    const runResult = await runCommand(runner.run, tmpDir, stdin, TIMEOUT);
    if (cleanup) fs.rmSync(tmpDir, { recursive: true, force: true });

    const hasError = runResult.code !== 0 || runResult.timedOut;
    res.json({
      success:      !hasError,
      compileError: "",
      runtimeError: hasError ? (runResult.timedOut ? "Execution timed out" : runResult.stderr) : "",
      stdout:       runResult.stdout,
      stderr:       runResult.stderr,
    });

  } catch (err) {
    console.error("executeCode error:", err);
    res.status(500).json({
      success: false, compileError: "", runtimeError: err.message, stdout: "", stderr: err.message,
    });
  }
};
