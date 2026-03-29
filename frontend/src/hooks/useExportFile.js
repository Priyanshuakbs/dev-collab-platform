// frontend/src/hooks/useExportFile.js
// File download utility — no backend needed!

export const useExportFile = () => {

  // ── Download single file ───────────────────────────────────────────
  const downloadFile = (fileName, content, language = "plaintext") => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Download all files as ZIP ──────────────────────────────────────
  const downloadAllAsZip = async (files, workspaceName = "workspace") => {
    try {
      // Dynamically import JSZip from CDN
      const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;
      const zip   = new JSZip();
      const folder = zip.folder(workspaceName);

      files.forEach((file) => {
        folder.file(file.name, file.content || "");
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `${workspaceName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP export failed:", err);
      // Fallback — download files one by one
      files.forEach((file) => downloadFile(file.name, file.content || ""));
    }
  };

  // ── Copy to clipboard ──────────────────────────────────────────────
  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch {
      return false;
    }
  };

  return { downloadFile, downloadAllAsZip, copyToClipboard };
};
