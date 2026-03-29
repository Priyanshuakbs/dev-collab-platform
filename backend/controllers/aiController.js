// backend/controllers/aiController.js
// Custom AI Code Assistant — No external API needed!

// ── Code patterns database ────────────────────────────────────────────
const CODE_PATTERNS = {
  javascript: {
    fetchExample: `fetch('https://api.example.com/data')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`,
    asyncExample: `const getData = async () => {
  try {
    const res = await fetch('https://api.example.com/data');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(err);
  }
};`,
    arrayMethods: `// Map — transform each element
const doubled = [1,2,3].map(x => x * 2); // [2,4,6]

// Filter — keep matching elements  
const evens = [1,2,3,4].filter(x => x % 2 === 0); // [2,4]

// Reduce — combine into single value
const sum = [1,2,3].reduce((acc, x) => acc + x, 0); // 6`,
  },
  python: {
    listComp: `# List comprehension
squares = [x**2 for x in range(10)]

# With condition
evens = [x for x in range(20) if x % 2 == 0]`,
    decorator: `def my_decorator(func):
    def wrapper(*args, **kwargs):
        print("Before function")
        result = func(*args, **kwargs)
        print("After function")
        return result
    return wrapper

@my_decorator
def say_hello():
    print("Hello!")`,
  },
};

// ── Bug detection patterns ────────────────────────────────────────────
const detectBugs = (code, language) => {
  const bugs = [];

  if (language === "javascript" || language === "typescript") {
    if (code.includes("== ") && !code.includes("==="))
      bugs.push("⚠️ Use `===` instead of `==` for strict equality comparison.");
    if (code.includes("var "))
      bugs.push("⚠️ Avoid `var` — use `const` or `let` instead.");
    if (code.match(/\.then\(.*\)/) && !code.includes(".catch("))
      bugs.push("⚠️ Promise `.then()` found without `.catch()` — add error handling.");
    if (code.includes("console.log") && code.includes("async"))
      bugs.push("💡 Make sure you're awaiting async calls before logging results.");
    if (code.match(/for\s*\(var/))
      bugs.push("⚠️ Use `let` in for loops instead of `var` to avoid scope issues.");
  }

  if (language === "python") {
    if (code.match(/except\s*:/))
      bugs.push("⚠️ Bare `except:` catches everything — use `except Exception as e:` instead.");
    if (code.includes("==None"))
      bugs.push("⚠️ Use `is None` instead of `== None`.");
    if (code.match(/print [^(]/))
      bugs.push("⚠️ Python 3 requires parentheses: `print(...)` not `print ...`");
  }

  return bugs;
};

// ── Code explainer ────────────────────────────────────────────────────
const explainCode = (code, language) => {
  const lines    = code.split("\n").filter((l) => l.trim()).length;
  const hasFunc  = code.match(/function|def |const .* =.*=>|async/);
  const hasLoop  = code.match(/for |while |forEach|map\(|filter\(|reduce\(/);
  const hasClass = code.match(/class |interface /);
  const hasApi   = code.match(/fetch\(|axios|http\.|request\(/);
  const hasAsync = code.match(/async|await|Promise|\.then\(/);
  const hasImport= code.match(/import |require\(/);

  let explanation = `📋 **Code Analysis** (${lines} lines of ${language})\n\n`;

  if (hasImport)  explanation += "📦 **Imports/Dependencies** — External modules are being used.\n";
  if (hasClass)   explanation += "🏗️ **Class/Interface** — Object-oriented structure detected.\n";
  if (hasFunc)    explanation += "⚙️ **Functions** — Contains function definitions.\n";
  if (hasAsync)   explanation += "⏳ **Async Operations** — Handles asynchronous code.\n";
  if (hasApi)     explanation += "🌐 **API Calls** — Makes HTTP/network requests.\n";
  if (hasLoop)    explanation += "🔄 **Loops/Iterations** — Iterates over data.\n";

  explanation += `\n**Summary:** This ${language} code has ${lines} lines`;
  if (hasFunc) explanation += ", defines functions";
  if (hasAsync) explanation += ", uses async/await";
  if (hasApi) explanation += ", calls external APIs";
  explanation += ".";

  return explanation;
};

// ── Add comments to code ──────────────────────────────────────────────
const addComments = (code, language) => {
  const lines = code.split("\n");
  const commented = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return line;

    if (language === "javascript" || language === "typescript") {
      if (trimmed.match(/^(const|let|var)\s+\w+\s*=/))
        return `// Variable declaration\n${line}`;
      if (trimmed.match(/^(function|const\s+\w+\s*=\s*(async\s*)?\(|async function)/))
        return `\n// Function definition\n${line}`;
      if (trimmed.match(/^(if|else|switch)/))
        return `// Conditional logic\n${line}`;
      if (trimmed.match(/^(for|while|forEach|map|filter|reduce)/))
        return `// Loop/iteration\n${line}`;
      if (trimmed.match(/^(return)/))
        return `// Return value\n${line}`;
      if (trimmed.match(/^(import|require)/))
        return `// Import dependency\n${line}`;
    }

    if (language === "python") {
      if (trimmed.match(/^def /))  return `\n# Function definition\n${line}`;
      if (trimmed.match(/^class /)) return `\n# Class definition\n${line}`;
      if (trimmed.match(/^if |^elif |^else:/)) return `# Conditional\n${line}`;
      if (trimmed.match(/^for |^while /)) return `# Loop\n${line}`;
      if (trimmed.match(/^return /)) return `# Return value\n${line}`;
      if (trimmed.match(/^import |^from /)) return `# Import\n${line}`;
    }

    return line;
  });

  return commented.join("\n");
};

// ── Main AI handler ───────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, code, language = "javascript", action } = req.body;
    const msg = (message || "").toLowerCase().trim();
    let response = "";

    // ── Quick Actions ───────────────────────────────────────────────
    if (action === "explain" && code) {
      response = explainCode(code, language);
    }

    else if (action === "fix" && code) {
      const bugs = detectBugs(code, language);
      if (bugs.length === 0) {
        response = "✅ **No obvious bugs found!**\n\nYour code looks clean. Here are some general tips:\n- Add error handling for async operations\n- Add input validation\n- Consider adding unit tests";
      } else {
        response = `🐛 **Found ${bugs.length} potential issue(s):**\n\n${bugs.join("\n")}\n\n💡 Fix these issues and your code should work better!`;
      }
    }

    else if (action === "comment" && code) {
      const commented = addComments(code, language);
      response = `📝 **Code with comments added:**\n\n\`\`\`${language}\n${commented}\n\`\`\``;
    }

    else if (action === "convert" && code) {
      response = `🔄 **Language Conversion Guide:**\n\nTo convert this ${language} code, specify the target language in your message. For example:\n- "Convert to Python"\n- "Convert to TypeScript"\n- "Convert to Java"\n\nI'll provide a conversion guide!`;
    }

    // ── Keyword responses ───────────────────────────────────────────
    else if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      response = `👋 Hello! I'm your AI Code Assistant.\n\nI can help you with:\n- 💡 Explaining code\n- 🐛 Finding bugs\n- 📝 Adding documentation\n- 🔄 Code conversion tips\n- ⚡ Code examples\n\nWhat would you like help with?`;
    }

    else if (msg.includes("fetch") || msg.includes("api call") || msg.includes("http request")) {
      response = `🌐 **Making API calls in ${language}:**\n\n\`\`\`javascript\n${CODE_PATTERNS.javascript.fetchExample}\n\`\`\`\n\nOr using async/await:\n\`\`\`javascript\n${CODE_PATTERNS.javascript.asyncExample}\n\`\`\``;
    }

    else if (msg.includes("array") || msg.includes("list") || msg.includes("map") || msg.includes("filter")) {
      response = `📚 **Array Methods in JavaScript:**\n\n\`\`\`javascript\n${CODE_PATTERNS.javascript.arrayMethods}\n\`\`\``;
    }

    else if (msg.includes("async") || msg.includes("await") || msg.includes("promise")) {
      response = `⏳ **Async/Await in JavaScript:**\n\n\`\`\`javascript\n${CODE_PATTERNS.javascript.asyncExample}\n\`\`\`\n\n**Key points:**\n- Always use \`try/catch\` with async/await\n- \`await\` only works inside \`async\` functions\n- Use \`Promise.all()\` for parallel operations`;
    }

    else if (msg.includes("bug") || msg.includes("error") || msg.includes("fix") || msg.includes("debug")) {
      if (code) {
        const bugs = detectBugs(code, language);
        response = bugs.length > 0
          ? `🐛 **Issues found in your code:**\n\n${bugs.join("\n")}`
          : `✅ No obvious bugs found in your code!\n\nFor deeper debugging:\n- Use browser DevTools\n- Add \`console.log()\` statements\n- Check network requests in DevTools`;
      } else {
        response = `🐛 **Debugging Tips:**\n\n1. Use \`console.log()\` to trace values\n2. Check browser DevTools (F12)\n3. Read error messages carefully\n4. Use breakpoints in DevTools\n5. Check for typos in variable names`;
      }
    }

    else if (msg.includes("explain") || msg.includes("what does") || msg.includes("how does")) {
      if (code) {
        response = explainCode(code, language);
      } else {
        response = "Please open a file in the editor first, then click **Explain Code** button or ask me about specific code.";
      }
    }

    else if (msg.includes("react") || msg.includes("component") || msg.includes("hook")) {
      response = `⚛️ **React Tips:**\n\n\`\`\`jsx\n// Functional component with hooks\nimport { useState, useEffect } from 'react';\n\nconst MyComponent = ({ title }) => {\n  const [count, setCount] = useState(0);\n  \n  useEffect(() => {\n    document.title = title;\n  }, [title]);\n\n  return (\n    <div>\n      <h1>{title}</h1>\n      <button onClick={() => setCount(c => c + 1)}>\n        Count: {count}\n      </button>\n    </div>\n  );\n};\n\nexport default MyComponent;\n\`\`\``;
    }

    else if (msg.includes("node") || msg.includes("express") || msg.includes("backend") || msg.includes("server")) {
      response = `🚀 **Express.js Route Example:**\n\n\`\`\`javascript\nconst express = require('express');\nconst router = express.Router();\n\n// GET route\nrouter.get('/', async (req, res) => {\n  try {\n    const data = await SomeModel.find();\n    res.json(data);\n  } catch (err) {\n    res.status(500).json({ message: err.message });\n  }\n});\n\n// POST route\nrouter.post('/', async (req, res) => {\n  try {\n    const item = await SomeModel.create(req.body);\n    res.status(201).json(item);\n  } catch (err) {\n    res.status(400).json({ message: err.message });\n  }\n});\n\nmodule.exports = router;\n\`\`\``;
    }

    else if (msg.includes("mongodb") || msg.includes("mongoose") || msg.includes("database") || msg.includes("schema")) {
      response = `🗄️ **MongoDB/Mongoose Schema Example:**\n\n\`\`\`javascript\nconst mongoose = require('mongoose');\n\nconst userSchema = new mongoose.Schema({\n  name:  { type: String, required: true },\n  email: { type: String, required: true, unique: true },\n  role:  { type: String, enum: ['admin', 'user'], default: 'user' },\n  createdAt: { type: Date, default: Date.now }\n});\n\nmodule.exports = mongoose.model('User', userSchema);\n\`\`\``;
    }

    else if (msg.includes("css") || msg.includes("style") || msg.includes("tailwind")) {
      response = `🎨 **Tailwind CSS Tips:**\n\n\`\`\`jsx\n// Flexbox centering\n<div className="flex items-center justify-center h-screen">\n\n// Card component\n<div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">\n\n// Responsive grid\n<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">\n\n// Button\n<button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">\n\`\`\``;
    }

    else if (msg.includes("python")) {
      response = `🐍 **Python Tips:**\n\n\`\`\`python\n${CODE_PATTERNS.python.listComp}\n\`\`\`\n\n\`\`\`python\n${CODE_PATTERNS.python.decorator}\n\`\`\``;
    }

    else if (msg.includes("optimize") || msg.includes("performance") || msg.includes("faster") || msg.includes("speed")) {
      response = `⚡ **Performance Optimization Tips:**\n\n**JavaScript:**\n- Use \`const\` over \`let\` when possible\n- Avoid unnecessary re-renders in React\n- Use \`useMemo\` and \`useCallback\` hooks\n- Lazy load components with \`React.lazy()\`\n\n**General:**\n- Cache expensive calculations\n- Use pagination for large data\n- Minimize API calls with debouncing\n- Use indexes in database queries`;
    }

    else if (msg.includes("convert to python") || msg.includes("python se")) {
      response = `🔄 **JS → Python Conversion Guide:**\n\n\`\`\`python\n# JS: const x = 5  →  Python: x = 5\n# JS: console.log()  →  Python: print()\n# JS: function f() {}  →  Python: def f():\n# JS: // comment  →  Python: # comment\n# JS: null  →  Python: None\n# JS: true/false  →  Python: True/False\n# JS: arr.push(x)  →  Python: arr.append(x)\n# JS: arr.length  →  Python: len(arr)\n\`\`\``;
    }

    else {
      // Default response
      response = `🤖 I understand you're asking about: **"${message}"**\n\nHere's what I can help you with:\n\n- 💡 **Explain Code** — Click the button or say "explain this code"\n- 🐛 **Fix Bugs** — Click "Fix Bugs" or say "find bugs"\n- 📝 **Add Docs** — Click "Add Docs" for comments\n- ⚡ **Examples** — Ask for "react example", "fetch example", "mongoose schema"\n- 🔄 **Convert** — Say "convert to Python/TypeScript"\n\nTry asking something more specific!`;
    }

    res.json({ response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
