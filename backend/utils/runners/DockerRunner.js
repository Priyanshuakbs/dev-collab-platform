const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("crypto"); // using crypto random UUID fallback if uuid package isn't installed

class DockerRunner {
  constructor() {
    this.tempDir = path.join(__dirname, "../../../temp_runs");
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  generateUUID() {
    // Basic UUID generator without external dependency
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async execute(code, language, stdin = "", fileName = "main") {
    const runId = this.generateUUID();
    const runDir = path.join(this.tempDir, runId);
    fs.mkdirSync(runDir, { recursive: true });

    const lang = language.toLowerCase();

    // Map extension and prepare image details
    const config = {
      python: {
        ext: "py",
        image: "python:3.10-slim",
        command: (file) => `python ${file}`
      },
      cpp: {
        ext: "cpp",
        image: "gcc:latest",
        command: (file) => `g++ -o main ${file} && ./main`
      },
      java: {
        ext: "java",
        image: "openjdk:17-slim",
        command: (file) => `javac ${file} && java Main` // assumes Main class
      },
      javascript: {
        ext: "js",
        image: "node:18-slim",
        command: (file) => `node ${file}`
      }
    };

    const targetConfig = config[lang];
    if (!targetConfig) {
      return {
        success: false,
        compileError: "",
        runtimeError: `Unsupported language in Docker runner: ${language}`,
        stdout: "",
        stderr: `Unsupported language: ${language}`
      };
    }

    const actualFileName = lang === "java" ? "Main.java" : `${fileName}.${targetConfig.ext}`;
    const codePath = path.join(runDir, actualFileName);
    const stdinPath = path.join(runDir, "input.txt");

    fs.writeFileSync(codePath, code);
    fs.writeFileSync(stdinPath, stdin);

    // Escape code path for docker command (convert Windows paths to unix-like mount paths)
    const normalizedRunDir = runDir.replace(/\\/g, "/");

    // Command configuration with resource limits
    const dockerCmd = `docker run --rm -i \
      --memory="100m" \
      --cpus="0.5" \
      --network none \
      -v "${normalizedRunDir}:/usr/src/app" \
      -w /usr/src/app \
      ${targetConfig.image} \
      sh -c "${targetConfig.command(actualFileName)} < input.txt"`;

    return new Promise((resolve) => {
      // 5 second execution timeout limit
      exec(dockerCmd, { timeout: 5000 }, (error, stdout, stderr) => {
        // Cleanup temp folder
        try {
          fs.rmSync(runDir, { recursive: true, force: true });
        } catch (cleanupErr) {
          console.error("Cleanup error:", cleanupErr);
        }

        if (error && error.killed) {
          return resolve({
            success: false,
            compileError: "",
            runtimeError: "Time limit exceeded (5000ms)",
            stdout: "",
            stderr: "Execution Timeout: Code took too long to execute."
          });
        }

        const isCompileError = lang === "cpp" && stderr.includes("error:");
        
        resolve({
          success: !error,
          compileError: isCompileError ? stderr : "",
          runtimeError: !isCompileError ? stderr : "",
          stdout: stdout,
          stderr: stderr,
          exitCode: error ? error.code : 0
        });
      });
    });
  }
}

module.exports = DockerRunner;
