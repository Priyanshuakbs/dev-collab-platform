// frontend/src/components/CodeEditor.jsx
// Install first: npm install @monaco-editor/react

import { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";

const LANGUAGES = ["javascript", "typescript", "python", "html", "css", "json", "markdown"];

export default function CodeEditor({
  code,
  onChange,
  fileName = "main.js",
  remoteCursors = {},
  readOnly = false,
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  // Detect language from file extension
  const getLanguage = (name) => {
    const ext = name.split(".").pop()?.toLowerCase();
    const map = {
      js: "javascript", jsx: "javascript",
      ts: "typescript", tsx: "typescript",
      py: "python",
      html: "html", htm: "html",
      css: "css", scss: "css",
      json: "json",
      md: "markdown",
    };
    return map[ext] || "javascript";
  };

  const language = getLanguage(fileName);

  // ── Remote cursors decorations ────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const newDecorations = Object.entries(remoteCursors).map(([userId, cursor]) => ({
      range: new monacoRef.current.Range(
        cursor.line, cursor.column,
        cursor.line, cursor.column + 1
      ),
      options: {
        className: "remote-cursor",
        hoverMessage: { value: cursor.name },
        afterContentClassName: "remote-cursor-label",
        glyphMarginClassName: "remote-cursor-glyph",
      },
    }));

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [remoteCursors]);

  const handleMount = (editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;

    // cursor position change emit
    editor.onDidChangeCursorPosition((e) => {
      if (onChange?.onCursorMove) {
        onChange.onCursorMove(e.position.lineNumber, e.position.column);
      }
    });
  };

  return (
    <div className="flex flex-col h-full">

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-700 rounded-md">
          <div className={`w-2 h-2 rounded-full ${
            language === "javascript" ? "bg-yellow-400" :
            language === "typescript" ? "bg-blue-400"   :
            language === "python"     ? "bg-green-400"  :
            language === "html"       ? "bg-orange-400" :
            language === "css"        ? "bg-pink-400"   : "bg-gray-400"
          }`} />
          <span className="text-xs text-gray-300">{fileName}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-600">{language}</span>
          {Object.keys(remoteCursors).length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">
                {Object.keys(remoteCursors).length} editing
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onChange={(val) => {
            if (typeof onChange === "function") onChange(val || "");
            else if (onChange?.onCodeChange) onChange.onCodeChange(val || "");
          }}
          onMount={handleMount}
          options={{
            readOnly,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            lineHeight: 1.8,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: "gutter",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            wordWrap: "on",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            suggest: { showKeywords: true },
            quickSuggestions: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
    </div>
  );
}
