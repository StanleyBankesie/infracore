/**
 * @file HomeProjectNotesCard.jsx
 * @description Dedicated Project Notes card for the homepage.
 * Features:
 * - Direct database persistence via /api/user-notes.
 * - Clean, blank notepad surface on the homepage card (with all marked redundant controls removed).
 * - Clicking the notepad opens the comprehensive Project Notes Modal.
 * - Modal supports multi-note switching, creating new notes, text editing, and whiteboard pen sketching.
 * - Strict database storage quota enforcement capped by the system administrator.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../api/client.js";
import { toast } from "react-toastify";
import { useAuth } from "../../auth/AuthContext.jsx";
import {
  FileText,
  PenTool,
  Trash2,
  Save,
  Check,
  ExternalLink,
  RotateCcw,
  Plus,
  Lock,
  Maximize2,
  AlertTriangle,
  X,
  Loader2,
  Edit3,
} from "lucide-react";

function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function HomeProjectNotesCard({ className = "" }) {
  const { user } = useAuth();

  // Notes state from database
  const [notesList, setNotesList] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [usage, setUsage] = useState({
    used_bytes: 0,
    max_bytes: 1048576,
    percent: 0,
    remaining_bytes: 1048576,
    notes_count: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("text"); // 'text' | 'whiteboard'
  const [noteTitle, setNoteTitle] = useState("My Project Note");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Whiteboard canvas state (inside modal)
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState("#0E3646");
  const [penWidth, setPenWidth] = useState(3);
  const autoSaveTimerRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Load Notes from Database
  // ─────────────────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/user-notes");
      if (res.data && res.data.ok) {
        const list = res.data.notes || [];
        setNotesList(list);
        if (res.data.usage) {
          setUsage(res.data.usage);
        }
        if (list.length > 0) {
          // Keep current note if selected, else pick latest
          setActiveNote((prev) => {
            if (prev) {
              const matched = list.find((n) => n.id === prev.id);
              if (matched) return matched;
            }
            return list[0];
          });
        } else {
          setActiveNote(null);
        }
      }
    } catch (err) {
      console.warn("Could not fetch user notes from database:", err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Sync active note state to modal inputs
  useEffect(() => {
    if (activeNote) {
      setNoteTitle(activeNote.title || "Untitled Note");
      setNoteContent(activeNote.content || "");
      if (activeNote.canvas_data && canvasRef.current) {
        loadCanvasImage(activeNote.canvas_data);
      }
    } else {
      setNoteTitle("My Project Note");
      setNoteContent("");
    }
  }, [activeNote]);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Whiteboard Canvas Drawing Logic
  // ─────────────────────────────────────────────────────────────────────────
  const loadCanvasImage = (dataUrl) => {
    const canvas = canvasRef.current;
    if (!canvas || !dataUrl) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Save Note to Database with Quota Enforcement
  // ─────────────────────────────────────────────────────────────────────────
  const saveNoteToDb = async (titleToSave, contentToSave, notify = true) => {
    const title = (titleToSave !== undefined ? titleToSave : noteTitle) || "Untitled Note";
    const content = contentToSave !== undefined ? contentToSave : noteContent;
    let canvasData = null;

    if (canvasRef.current) {
      canvasData = canvasRef.current.toDataURL("image/png");
    } else if (activeNote?.canvas_data) {
      canvasData = activeNote.canvas_data;
    }

    try {
      setSaving(true);
      let response;

      if (activeNote && activeNote.id) {
        // Update existing note
        response = await api.put(`/user-notes/${activeNote.id}`, {
          title,
          content,
          canvas_data: canvasData,
        });
      } else {
        // Create new note
        response = await api.post("/user-notes", {
          title,
          content,
          canvas_data: canvasData,
        });
      }

      if (response.data && response.data.ok) {
        const savedNote = response.data.note;
        if (response.data.usage) {
          setUsage(response.data.usage);
        }
        setActiveNote(savedNote);
        setNotesList((prev) => {
          const idx = prev.findIndex((n) => n.id === savedNote.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = savedNote;
            return next;
          }
          return [savedNote, ...prev];
        });
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastSavedTime(now);
        if (notify) {
          toast.success("Note saved to database");
        }
      }
    } catch (err) {
      if (err?.response?.data?.quota_exceeded) {
        const errorMsg =
          err.response.data.error ||
          "Storage quota exceeded! You have reached your storage limit. Cannot save more notes.";
        toast.error(errorMsg, { autoClose: 6000 });
      } else {
        toast.error(err?.response?.data?.error || "Failed to save note to database");
      }
    } finally {
      setSaving(false);
    }
  };

  // Create brand new note
  const handleCreateNewNote = async () => {
    try {
      setSaving(true);
      const initialTitle = `Project Note ${notesList.length + 1}`;
      const res = await api.post("/user-notes", {
        title: initialTitle,
        content: "",
        canvas_data: null,
      });

      if (res.data && res.data.ok) {
        const newNote = res.data.note;
        if (res.data.usage) {
          setUsage(res.data.usage);
        }
        setNotesList((prev) => [newNote, ...prev]);
        setActiveNote(newNote);
        setNoteTitle(newNote.title);
        setNoteContent("");
        clearCanvas();
        toast.success("New note created");
      }
    } catch (err) {
      if (err?.response?.data?.quota_exceeded) {
        toast.error(
          err.response.data.error ||
            "Storage quota reached! Cannot create a new note until you delete or reduce existing notes."
        );
      } else {
        toast.error("Failed to create new note");
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete note
  const handleDeleteCurrentNote = async () => {
    if (!activeNote || !activeNote.id) return;
    if (!window.confirm(`Delete "${activeNote.title || "this note"}"? This will free up storage space.`)) {
      return;
    }
    try {
      setSaving(true);
      const res = await api.delete(`/user-notes/${activeNote.id}`);
      if (res.data && res.data.ok) {
        if (res.data.usage) {
          setUsage(res.data.usage);
        }
        const updatedList = notesList.filter((n) => n.id !== activeNote.id);
        setNotesList(updatedList);
        setActiveNote(updatedList[0] || null);
        toast.success("Note deleted and storage freed");
      }
    } catch (err) {
      toast.error("Failed to delete note");
    } finally {
      setSaving(false);
    }
  };

  // Switch active note from dropdown
  const handleSelectNote = (noteId) => {
    const target = notesList.find((n) => String(n.id) === String(noteId));
    if (target) {
      setActiveNote(target);
      setNoteTitle(target.title || "Untitled Note");
      setNoteContent(target.content || "");
      if (target.canvas_data && canvasRef.current) {
        loadCanvasImage(target.canvas_data);
      } else if (canvasRef.current) {
        clearCanvas();
      }
    }
  };

  // Open modal handler
  const handleOpenModal = () => {
    setIsModalOpen(true);
    // Draw canvas if whiteboard has content
    setTimeout(() => {
      if (activeNote?.canvas_data && canvasRef.current) {
        loadCanvasImage(activeNote.canvas_data);
      }
    }, 150);
  };

  const isNearLimit = usage.percent >= 80;
  const isAtLimit = usage.percent >= 100;

  return (
    <>
      {/* ── Homepage Card (Clean & Blank Notepad) ── */}
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-smoky p-5 sm:p-6 space-y-3 min-w-0 flex flex-col justify-between ${className}`}
      >
        {/* Header: Title, Private Badge & Storage Space Pill */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
              <FileText size={16} />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                Project Notes
              </h2>
              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200/60 dark:border-amber-800 flex items-center gap-0.5">
                <Lock size={9} /> Private
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenModal}
              className="p-1 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Open full notes modal"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* ── Blank Notes Pad Surface (Clicking opens the modal, no hover highlight, no template) ── */}
        <div
          onClick={handleOpenModal}
          className="flex-1 min-h-[170px] rounded-xl border border-dashed border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 p-4 cursor-pointer flex flex-col justify-center items-center relative select-none"
          title="Click to open notes pad and edit or write notes"
        >
          {/* Always clean blank notepad pad surface (no template) */}
          <div className="flex flex-col items-center justify-center text-center space-y-2 py-4 pointer-events-none">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 flex items-center justify-center shadow-2xs">
              <Edit3 size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Blank Notes Pad
              </div>
              <p className="text-[11px] text-slate-400">
                Click anywhere on this pad to write notes or sketch
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Comprehensive Project Notes Modal (Matching HR Module Standard Modal Format & Orientation) ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn"
          onClick={() => {
            if (!saving) setIsModalOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl lg:max-w-3xl shadow-2xl overflow-hidden my-auto sm:my-8 transition-all flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold flex-shrink-0 border border-amber-200/50 dark:border-amber-800/50">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      Project Notes Workspace
                    </h3>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800">
                      Private
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Personal notepad, meeting minutes, and whiteboard sketching
                  </p>
                </div>
              </div>

              {/* Mode switch & Close */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setModalMode("text")}
                    className={`px-3 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                      modalMode === "text"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode("whiteboard");
                      setTimeout(() => {
                        if (activeNote?.canvas_data && canvasRef.current) {
                          loadCanvasImage(activeNote.canvas_data);
                        }
                      }, 100);
                    }}
                    className={`px-3 py-1 rounded-md font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                      modalMode === "whiteboard"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <PenTool size={12} />
                    <span>Whiteboard</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Note Selector, New Note, & Quota Meter Strip */}
            <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <select
                  value={activeNote?.id || ""}
                  onChange={(e) => handleSelectNote(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 text-xs focus:outline-none flex-1 max-w-[260px] truncate"
                >
                  {notesList.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title || "Untitled Note"}
                    </option>
                  ))}
                  {notesList.length === 0 && <option value="">No notes created</option>}
                </select>

                <button
                  type="button"
                  onClick={handleCreateNewNote}
                  disabled={saving || isAtLimit}
                  className="btn btn-primary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1"
                  title="Create new note"
                >
                  <Plus size={13} />
                  <span>New Note</span>
                </button>

                {activeNote && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentNote}
                    disabled={saving}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 cursor-pointer"
                    title="Delete this note to free space"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Quota Exceeded Warning Banner */}
            {isAtLimit && (
              <div className="px-6 py-2 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0">
                <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                <span>
                  <strong>Storage Limit Reached:</strong> You have consumed all {formatBytes(usage.max_bytes)} allocated by your administrator. Please delete older notes or contact system admin to increase your storage cap.
                </span>
              </div>
            )}

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">
              {/* Note Name / Title Input (Editable by user) */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Note Name / Title
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNoteTitle(val);
                    if (activeNote) {
                      setNotesList((prev) =>
                        prev.map((n) => (n.id === activeNote.id ? { ...n, title: val } : n))
                      );
                    }
                  }}
                  placeholder="Enter note name..."
                  className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Mode 1: Text Note Editor */}
              {modalMode === "text" && (
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Notes & Action Items Content
                  </label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Type your notes, ideas, meeting minutes, deliverables or project scratchpad here..."
                    rows={12}
                    className="w-full text-xs sm:text-sm font-mono leading-relaxed p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                  />
                </div>
              )}

              {/* Mode 2: Whiteboard Pen Scratchpad */}
              {modalMode === "whiteboard" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1 text-xs pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">Color:</span>
                      {["#0E3646", "#2563eb", "#059669", "#dc2626"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setPenColor(color)}
                          style={{ backgroundColor: color }}
                          className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                            penColor === color ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : ""
                          }`}
                          title={color}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-2.5 py-1 rounded text-xs text-slate-500 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                      title="Clear canvas"
                    >
                      <RotateCcw size={12} />
                      <span>Clear Canvas</span>
                    </button>
                  </div>

                  {/* Canvas Container */}
                  <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/60 touch-none">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={280}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[280px] cursor-crosshair"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    Draw with mouse or touchscreen. Whiteboard sketch is compressed and stored into database.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer (Standard ERP / HR format) */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
              <div>
                {saving && (
                  <span className="text-brand-600 animate-pulse text-xs font-medium">Saving to database...</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="btn btn-secondary px-4 py-2 text-sm font-medium"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => saveNoteToDb()}
                  disabled={saving || (isAtLimit && !activeNote)}
                  className="btn btn-primary px-5 py-2 text-sm font-medium inline-flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save to Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
