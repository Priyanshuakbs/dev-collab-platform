const https = require("https");

class Judge0Runner {
  constructor() {
    this.apiUrl = process.env.JUDGE0_API_URL || "https://ce.judge0.com";
    this.apiKey = process.env.JUDGE0_API_KEY || "";
    // Standard Judge0 language IDs
    // Python 3: 71, C++ (GCC 9.2.0): 54, Java (OpenJDK 13.0.1): 62, JS: 63, TS: 74
    this.languageIdMap = {
      python: 71,
      javascript: 63,
      typescript: 74,
      cpp: 54,
      c: 50,
      java: 62
    };
  }

  async execute(code, language, stdin = "", fileName = "main") {
    const lang = language.toLowerCase();
    const languageId = this.languageIdMap[lang] || 71; // Default to python

    const payload = JSON.stringify({
      source_code: Buffer.from(code).toString("base64"),
      language_id: languageId,
      stdin: Buffer.from(stdin).toString("base64")
    });

    return new Promise((resolve) => {
      // Parse URL
      const url = new URL(`${this.apiUrl}/submissions?wait=true&base64_encoded=true`);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      };

      if (this.apiKey) {
        options.headers["X-RapidAPI-Key"] = this.apiKey;
        options.headers["X-RapidAPI-Host"] = url.hostname;
      }

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode >= 400) {
            return resolve({
              success: false,
              compileError: "",
              runtimeError: `Judge0 API error with status ${res.statusCode}: ${data}`,
              stdout: "",
              stderr: `Judge0 error: ${data}`
            });
          }

          try {
            const response = JSON.parse(data);
            const status = response.status || {};
            
            const stdout = response.stdout ? Buffer.from(response.stdout, "base64").toString("utf8") : "";
            const compileError = response.compile_output ? Buffer.from(response.compile_output, "base64").toString("utf8") : "";
            const stderr = response.stderr ? Buffer.from(response.stderr, "base64").toString("utf8") : "";
            
            resolve({
              success: status.id === 3, // 3 means Accepted
              compileError,
              runtimeError: stderr || (status.id > 3 && status.id !== 4 ? status.description : ""),
              stdout,
              stderr: compileError || stderr,
              exitCode: response.exit_code
            });
          } catch (e) {
            resolve({
              success: false,
              compileError: "",
              runtimeError: `Failed to parse response from Judge0 API: ${e.message}`,
              stdout: "",
              stderr: `Parsing error: ${e.message}`
            });
          }
        });
      });

      req.on("error", (e) => {
        resolve({
          success: false,
          compileError: "",
          runtimeError: `Network error connecting to Judge0 API: ${e.message}`,
          stdout: "",
          stderr: `Network error: ${e.message}`
        });
      });

      req.write(payload);
      req.end();
    });
  }
}

module.exports = Judge0Runner;
