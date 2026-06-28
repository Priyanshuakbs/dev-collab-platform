const PistonRunner = require("./runners/PistonRunner");
const Judge0Runner = require("./runners/Judge0Runner");
const DockerRunner = require("./runners/DockerRunner");

class CodeRunnerFactory {
  static getRunner() {
    const runnerType = (process.env.RUNNER_TYPE || "judge0").toLowerCase();

    switch (runnerType) {
      case "piston":
        return new PistonRunner();
      case "docker":
        return new DockerRunner();
      case "judge0":
      default:
        return new Judge0Runner();
    }
  }

  static async run(code, language, stdin = "", fileName = "main") {
    try {
      const runner = this.getRunner();
      return await runner.execute(code, language, stdin, fileName);
    } catch (error) {
      console.error("Runner execution error:", error);
      return {
        success: false,
        compileError: "",
        runtimeError: `Internal runtime engine error: ${error.message}`,
        stdout: "",
        stderr: error.message
      };
    }
  }
}

module.exports = CodeRunnerFactory;
