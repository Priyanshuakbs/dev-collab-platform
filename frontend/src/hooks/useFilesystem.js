// frontend/src/hooks/useFilesystem.js
import { useState, useCallback, useRef } from "react";
import api from "../services/api";

export function useFilesystem(workspaceId) {
  const [tree,    setTree]    = useState([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  // ── Refresh tree ─────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await api.get(`/fs/${workspaceId}`);
      setTree(res.data.tree || []);
    } catch (e) {
      console.error("fs:refresh", e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // ── Start/stop auto-polling (for terminal sync) ──────────────────
  const startPolling = useCallback((ms = 2500) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => refresh(), ms);
  }, [refresh]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // ── File CRUD ────────────────────────────────────────────────────
  const readFile = useCallback(async (filePath) => {
    const res = await api.get(`/fs/${workspaceId}/read`, { params: { path: filePath } });
    return res.data.content;
  }, [workspaceId]);

  const writeFile = useCallback(async (filePath, content) => {
    await api.post(`/fs/${workspaceId}/write`, { path: filePath, content });
  }, [workspaceId]);

  const createFile = useCallback(async (filePath, content = "") => {
    await api.post(`/fs/${workspaceId}/write`, { path: filePath, content });
    await refresh();
  }, [workspaceId, refresh]);

  const createFolder = useCallback(async (folderPath) => {
    await api.post(`/fs/${workspaceId}/mkdir`, { path: folderPath });
    await refresh();
  }, [workspaceId, refresh]);

  const renameItem = useCallback(async (oldPath, newPath) => {
    await api.post(`/fs/${workspaceId}/rename`, { oldPath, newPath });
    await refresh();
  }, [workspaceId, refresh]);

  const deleteItem = useCallback(async (itemPath) => {
    await api.delete(`/fs/${workspaceId}`, { params: { path: itemPath } });
    await refresh();
  }, [workspaceId, refresh]);

  const moveItem = useCallback(async (srcPath, destPath) => {
    await api.post(`/fs/${workspaceId}/move`, { srcPath, destPath });
    await refresh();
  }, [workspaceId, refresh]);

  return {
    tree, loading, refresh,
    readFile, writeFile, createFile, createFolder,
    renameItem, deleteItem, moveItem,
    startPolling, stopPolling,
  };
}
