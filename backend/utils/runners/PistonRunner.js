const https = require("https");

class PistonRunner {
  constructor() {
    this.apiUrl = "emkc.org";
    this.apiPath = "/api/v2/piston/execute";
    // Standard versions supported by Piston API
    this.versionMap = {
      python: "3.10.0",
      javascript: "18.15.0",
      typescript: "5.0.3",
      cpp: "10.2.0",
      c: "10.2.0",
      java: "15.0.2"
    };
  }

  async execute(code, language, stdin = "", fileName = "main") {
    const lang = language.toLowerCase();
    const pistonLang = lang === "cpp" ? "c++" : lang;
    const version = this.versionMap[lang] || "*";

    // Map filename extensions
    const extMap = {
      python: "py",
      javascript: "js",
      typescript: "ts",
      cpp: "cpp",
      c: "c",
      java: "java"
    };
    const ext = extMap[lang] || "txt";
    const fullFileName = fileName.includes(".") ? fileName : `${fileName}.${ext}`;

    const payload = JSON.stringify({
      language: pistonLang,
      version: version,
      files: [
        {
          name: fullFileName,
          content: code
        }
      ],
      stdin: stdin
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.apiUrl,
        port: 443,
        path: this.apiPath,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode >= 400) {
            try {
              const errObj = JSON.parse(data);
              return resolve({
                success: false,
                compileError: "",
                runtimeError: errObj.message || `API error with status ${res.statusCode}`,
                stdout: "",
                stderr: errObj.message || `API error: ${data}`
              });
            } catch {
              return resolve({
                success: false,
                compileError: "",
                runtimeError: `HTTP error status ${res.statusCode}`,
                stdout: "",
                stderr: `HTTP error status ${res.statusCode}`
              });
            }
          }

          try {
            const response = JSON.parse(data);
            const compile = response.compile || {};
            const run = response.run || {};

            const compileError = compile.stderr || "";
            const runtimeError = run.stderr || "";
            const stdout = run.stdout || "";
            const stderr = compileError || runtimeError || "";

            resolve({
              success: run.code === 0 && !compileError,
              compileError,
              runtimeError,
              stdout,
              stderr,
              exitCode: run.code
            });
          } catch (e) {
            reject(new Error("Failed to parse response from Piston API: " + e.message));
          }
        });
      });

      req.on("error", (e) => {
        resolve({
          success: false,
          compileError: "",
          runtimeError: `Network error connecting to execution API: ${e.message}`,
          stdout: "",
          stderr: `Network error: ${e.message}`
        });
      });

      req.write(payload);
      req.end();
    });
  }
}

module.exports = PistonRunner;
