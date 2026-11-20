/**
 * @file ProjectNotesPage.jsx
 * @description Exclusive private notes & whiteboard for the authenticated user.
 * Features:
 * - Strictly private and exclusive to the current logged-in user (isolated by User ID).
 * - Multi-note support: create, search, edit, clone, and delete multiple notes.
 * - Blank page typing with rich formatting, Markdown preview, and interactive checklists.
 * - Full interactive whiteboard with pen writing, stylus/touch support, colors, line widths, highlighter, and eraser.
 * - OCR / Handwriting-to-Text conversion: transforms pen handwriting from whiteboard directly into editable text.
 * - Background patterns: Blank paper, Ruled lines, Grid, Dot-matrix, and Dark slate board.
 * - Persistent storage with auto-save and manual save.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  PenTool,
  Columns,
  Plus,
  Trash2,
  Copy,
  Save,
  Check,
  Search,
  Sparkles,
  RotateCcw,
  Undo2,
  Redo2,
  Eraser,
  Download,
  Eye,
  Edit3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Lock,
  ArrowLeft,
  Calendar,
  Clock,
  Grid,
  FileDown,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext.jsx";
import { toast } from "react-toastify";
import { createWorker } from "tesseract.js";

// Whiteboard Palette Colors
const PEN_COLORS = [
  { name: "Carbon Black", value: "#0f172a" },
  { name: "OmniSuite Navy", value: "#0E3646" },
  { name: "Sapphire Blue", value: "#2563eb" },
  { name: "Emerald Green", value: "#059669" },
  { name: "Crimson Red", value: "#dc2626" },
  { name: "Amber Gold", value: "#d97706" },
  { name: "Amethyst Purple", value: "#9333ea" },
];

const PEN_WIDTHS = [
  { name: "Fine", value: 2 },
  { name: "Medium", value: 4 },
  { name: "Thick", value: 8 },
  { name: "Marker", value: 16 },
];

const BG_PATTERNS = [
  { id: "blank", name: "Blank White" },
  { id: "ruled", name: "Ruled Lines" },
  { id: "grid", name: "Graph Grid" },
  { id: "dots", name: "Dot Matrix" },
  { id: "dark", name: "Chalkboard" },
];

export default function ProjectNotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Distinct user identification for complete privacy and data exclusivity
  const currentUserId = String(user?.id || user?.sub || user?.username || "anonymous_user");
  const currentUserName = user?.username || user?.full_name || user?.name || "User";

  // Storage Key Helpers
  const getNotesIndexKey = useCallback((uid) => `omni_notes_index_u${uid}`, []);
  const getNoteDataKey = useCallback((uid, noteId) => `omni_note_data_u${uid}_n${noteId}`, []);

  // UI Modes: 'notes' | 'whiteboard' | 'split'
  const [viewMode, setViewMode] = useState("split");
  const [editorTab, setEditorTab] = useState("edit"); // 'edit' | 'preview'
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Notes state
  const [notesList, setNotesList] = useState([]);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState("Untitled Note");
  const [noteContent, setNoteContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Whiteboard state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState("pen"); // 'pen' | 'highlighter' | 'eraser'
  const [penColor, setPenColor] = useState("#0E3646");
  const [penWidth, setPenWidth] = useState(4);
  const [bgPattern, setBgPattern] = useState("ruled");
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isConvertingOcr, setIsConvertingOcr] = useState(false);
  const [ocrResultModal, setOcrResultModal] = useState({ open: false, text: "" });

  const textareaRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Initial Load: Load user's private notes index from localStorage
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const indexKey = getNotesIndexKey(currentUserId);
      const rawIndex = localStorage.getItem(indexKey);
      let parsedList = [];

      if (rawIndex) {
        try {
          parsedList = JSON.parse(rawIndex);
        } catch {
          parsedList = [];
        }
      }

      if (parsedList.length === 0) {
        // Create an initial starter note for this user
        const initialId = `note_${Date.now()}`;
        const initialNote = {
          id: initialId,
          title: "Welcome to My Private Notes",
          preview: "Type anything freely on this page, or switch to the whiteboard to write by hand...",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: currentUserId,
        };
        const initialContent = `# Welcome to My Private Notes 📝\n\nThis note is **strictly exclusive to your account** (${currentUserName}). Only you can view, edit, or search these notes.\n\n### What you can do:\n- **Blank Page Writing**: Type notes, meeting minutes, project scopes, or checklists.\n- **Interactive Checklists**:\n  - [x] Create project action items\n  - [ ] Write thoughts on the whiteboard\n  - [ ] Convert handwriting to text with OCR\n- **Whiteboard Feature**: Switch to Whiteboard or Split View to sketch, draw diagrams, or write with a stylus or mouse.\n- **Handwriting-to-Text (OCR)**: Click "✨ Convert to Text" on the whiteboard to transform your handwritten strokes directly into editable text!`;

        localStorage.setItem(indexKey, JSON.stringify([initialNote]));
        localStorage.setItem(
          getNoteDataKey(currentUserId, initialId),
          JSON.stringify({
            id: initialId,
            title: initialNote.title,
            content: initialContent,
            whiteboardImage: null,
            userId: currentUserId,
            createdAt: initialNote.createdAt,
            updatedAt: initialNote.updatedAt,
          })
        );

        setNotesList([initialNote]);
        setCurrentNoteId(initialId);
        setNoteTitle(initialNote.title);
        setNoteContent(initialContent);
      } else {
        setNotesList(parsedList);
        const firstNote = parsedList[0];
        setCurrentNoteId(firstNote.id);
        loadNoteContent(firstNote.id);
      }
    } catch (err) {
      console.error("Failed to load notes index:", err);
    }
  }, [currentUserId, getNotesIndexKey, getNoteDataKey, currentUserName]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Load Note Content
  // ─────────────────────────────────────────────────────────────────────────────
  const loadNoteContent = useCallback(
    (noteId) => {
      try {
        const dataKey = getNoteDataKey(currentUserId, noteId);
        const rawData = localStorage.getItem(dataKey);
        if (rawData) {
          const parsed = JSON.parse(rawData);
          setNoteTitle(parsed.title || "Untitled Note");
          setNoteContent(parsed.content || "");
          setHasUnsavedChanges(false);

          // Restore whiteboard canvas if saved
          if (parsed.whiteboardImage && canvasRef.current) {
            const img = new Image();
            img.onload = () => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext("2d");
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              drawBackgroundGrid(ctx, canvas.width, canvas.height, bgPattern);
              ctx.drawImage(img, 0, 0);
              saveCanvasSnapshot();
            };
            img.src = parsed.whiteboardImage;
          } else if (canvasRef.current) {
            clearCanvas();
          }
        }
      } catch (err) {
        console.error("Failed to load note data:", err);
      }
    },
    [currentUserId, getNoteDataKey, bgPattern]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Switch Active Note
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSelectNote = (noteId) => {
    if (noteId === currentNoteId) return;
    if (hasUnsavedChanges) {
      handleSaveNote(false);
    }
    setCurrentNoteId(noteId);
    loadNoteContent(noteId);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Create New Blank Note
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCreateNewNote = () => {
    const newId = `note_${Date.now()}`;
    const newNoteMeta = {
      id: newId,
      title: "Untitled Note",
      preview: "Empty note...",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUserId,
    };

    const newNoteData = {
      id: newId,
      title: "Untitled Note",
      content: "",
      whiteboardImage: null,
      userId: currentUserId,
      createdAt: newNoteMeta.createdAt,
      updatedAt: newNoteMeta.updatedAt,
    };

    const updatedList = [newNoteMeta, ...notesList];
    setNotesList(updatedList);
    localStorage.setItem(getNotesIndexKey(currentUserId), JSON.stringify(updatedList));
    localStorage.setItem(getNoteDataKey(currentUserId, newId), JSON.stringify(newNoteData));

    setCurrentNoteId(newId);
    setNoteTitle(newNoteMeta.title);
    setNoteContent("");
    setHasUnsavedChanges(false);
    clearCanvas();
    toast.success("New blank note created");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Delete Note
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDeleteNote = (noteIdToDelete, e) => {
    if (e) e.stopPropagation();
    if (notesList.length <= 1) {
      toast.warning("You must keep at least one note.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      return;
    }

    const updatedList = notesList.filter((n) => n.id !== noteIdToDelete);
    setNotesList(updatedList);
    localStorage.setItem(getNotesIndexKey(currentUserId), JSON.stringify(updatedList));
    localStorage.removeItem(getNoteDataKey(currentUserId, noteIdToDelete));

    if (currentNoteId === noteIdToDelete) {
      const nextNote = updatedList[0];
      setCurrentNoteId(nextNote.id);
      loadNoteContent(nextNote.id);
    }
    toast.info("Note deleted");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Duplicate / Clone Note
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDuplicateNote = (noteToClone, e) => {
    if (e) e.stopPropagation();
    const newId = `note_${Date.now()}`;
    const clonedMeta = {
      id: newId,
      title: `${noteToClone.title} (Copy)`,
      preview: noteToClone.preview,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUserId,
    };

    // Fetch existing note data
    const existingRaw = localStorage.getItem(getNoteDataKey(currentUserId, noteToClone.id));
    let clonedData = {
      id: newId,
      title: clonedMeta.title,
      content: noteContent,
      whiteboardImage: null,
      userId: currentUserId,
      createdAt: clonedMeta.createdAt,
      updatedAt: clonedMeta.updatedAt,
    };
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        clonedData.content = parsed.content;
        clonedData.whiteboardImage = parsed.whiteboardImage;
      } catch {}
    }

    const updatedList = [clonedMeta, ...notesList];
    setNotesList(updatedList);
    localStorage.setItem(getNotesIndexKey(currentUserId), JSON.stringify(updatedList));
    localStorage.setItem(getNoteDataKey(currentUserId, newId), JSON.stringify(clonedData));

    setCurrentNoteId(newId);
    setNoteTitle(clonedMeta.title);
    setNoteContent(clonedData.content);
    setHasUnsavedChanges(false);
    toast.success("Note duplicated");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Save Current Note & Whiteboard
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSaveNote = useCallback(
    (showToast = true) => {
      if (!currentNoteId) return;
      setIsSaving(true);

      try {
        const cleanTitle = noteTitle.trim() || "Untitled Note";
        const preview = noteContent.replace(/[#*`~>-]/g, "").trim().slice(0, 100) || "Empty note...";
        const now = new Date().toISOString();

        // Whiteboard snapshot data URL
        let wbDataUrl = null;
        if (canvasRef.current) {
          wbDataUrl = canvasRef.current.toDataURL("image/png");
        }

        const notePayload = {
          id: currentNoteId,
          title: cleanTitle,
          content: noteContent,
          whiteboardImage: wbDataUrl,
          userId: currentUserId,
          createdAt: now,
          updatedAt: now,
        };

        // 1. Save note body
        localStorage.setItem(getNoteDataKey(currentUserId, currentNoteId), JSON.stringify(notePayload));

        // 2. Update index item
        const updatedList = notesList.map((n) =>
          n.id === currentNoteId
            ? { ...n, title: cleanTitle, preview, updatedAt: now }
            : n
        );
        setNotesList(updatedList);
        localStorage.setItem(getNotesIndexKey(currentUserId), JSON.stringify(updatedList));

        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        if (showToast) {
          toast.success("Note & Whiteboard saved successfully");
        }
      } catch (err) {
        console.error("Save error:", err);
        if (showToast) toast.error("Failed to save note");
      } finally {
        setIsSaving(false);
      }
    },
    [currentNoteId, noteTitle, noteContent, currentUserId, notesList, getNoteDataKey, getNotesIndexKey]
  );

  // Auto-save debounce on content or title change
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        handleSaveNote(false);
      }, 2500);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [hasUnsavedChanges, handleSaveNote]);

  // Keyboard shortcut Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveNote(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveNote]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Text Formatting Toolbar Helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const insertFormatting = (prefix, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = noteContent.substring(start, end);
    const replacement = `${prefix}${selectedText || "text"}${suffix}`;

    const newContent =
      noteContent.substring(0, start) + replacement + noteContent.substring(end);
    setNoteContent(newContent);
    setHasUnsavedChanges(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText ? selectedText.length : 4)
      );
    }, 50);
  };

  const insertLinePrefix = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeCursor = noteContent.substring(0, start);
    const lastNewline = beforeCursor.lastIndexOf("\n");
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const newContent =
      noteContent.substring(0, lineStart) +
      prefix +
      noteContent.substring(lineStart);

    setNoteContent(newContent);
    setHasUnsavedChanges(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 50);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Whiteboard Canvas Drawing Logic
  // ─────────────────────────────────────────────────────────────────────────────
  const drawBackgroundGrid = (ctx, width, height, pattern) => {
    ctx.save();
    if (pattern === "dark") {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);
      // subtle grid for chalkboard
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      if (pattern === "ruled") {
        ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
        ctx.lineWidth = 1;
        for (let y = 36; y < height; y += 28) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        // Red margin line on the left like legal/composition paper
        ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(48, 0);
        ctx.lineTo(48, height);
        ctx.stroke();
      } else if (pattern === "grid") {
        ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 24) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else if (pattern === "dots") {
        ctx.fillStyle = "rgba(100, 116, 139, 0.3)";
        for (let x = 16; x < width; x += 24) {
          for (let y = 16; y < height; y += 24) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  };

  // Initialize or resize canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const w = Math.max(rect.width, 400);
    const h = Math.max(rect.height, 500);

    // Save existing image if any
    let existingData = null;
    if (canvas.width > 0 && canvas.height > 0) {
      existingData = canvas.toDataURL();
    }

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    drawBackgroundGrid(ctx, w, h, bgPattern);

    if (existingData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = existingData;
    }
  }, [bgPattern]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [setupCanvas, viewMode]);

  const saveCanvasSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setCanvasHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, dataUrl].slice(-30); // keep last 30 snapshots
    });
    setHistoryIndex((prev) => prev + 1);
    setHasUnsavedChanges(true);
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (activeTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = penWidth * 4;
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (activeTool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 22;
      ctx.strokeStyle = penColor + "40"; // ~25% alpha for marker effect
      ctx.lineCap = "square";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = penWidth;
      ctx.strokeStyle = penColor;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCanvasCoords(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCanvasSnapshot();
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(newIdx);
      setHasUnsavedChanges(true);
    };
    img.src = canvasHistory[newIdx];
  };

  const handleRedo = () => {
    if (historyIndex >= canvasHistory.length - 1) return;
    const newIdx = historyIndex + 1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(newIdx);
      setHasUnsavedChanges(true);
    };
    img.src = canvasHistory[newIdx];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundGrid(ctx, canvas.width, canvas.height, bgPattern);
    saveCanvasSnapshot();
  };

  const handleDownloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}-whiteboard.png`;
    a.click();
    toast.success("Whiteboard downloaded as PNG image");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. OCR: Convert Whiteboard Pen Handwriting to Text
  // ─────────────────────────────────────────────────────────────────────────────
  const handleConvertToText = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsConvertingOcr(true);
    const toastId = toast.loading("🔍 Reading handwritten strokes and converting to text...");

    try {
      // 1. Create worker for OCR
      const worker = await createWorker("eng");
      const ret = await worker.recognize(canvas);
      const recognized = (ret.data.text || "").trim();
      await worker.terminate();

      toast.dismiss(toastId);

      if (!recognized) {
        toast.info("No legible handwritten text was recognized on the whiteboard. Try writing clearly with a darker pen.");
      } else {
        setOcrResultModal({ open: true, text: recognized });
        toast.success("Handwriting recognized!");
      }
    } catch (err) {
      console.error("OCR recognition error:", err);
      toast.dismiss(toastId);
      toast.error("Could not convert handwriting to text. Please ensure pen writing is legible.");
    } finally {
      setIsConvertingOcr(false);
    }
  };

  const appendOcrTextToNote = (textToAppend) => {
    const cleanText = textToAppend.trim();
    if (!cleanText) return;

    setNoteContent((prev) => (prev ? `${prev}\n\n${cleanText}` : cleanText));
    setHasUnsavedChanges(true);
    setOcrResultModal({ open: false, text: "" });
    toast.success("Recognized text appended to your note!");
  };

  const replaceNoteWithOcrText = (newText) => {
    setNoteContent(newText.trim());
    setHasUnsavedChanges(true);
    setOcrResultModal({ open: false, text: "" });
    toast.success("Note content updated with recognized handwriting!");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. Export Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const exportAsTxt = () => {
    const blob = new Blob([`# ${noteTitle}\n\n${noteContent}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Note exported as text file");
  };

  const exportAsMarkdown = () => {
    const blob = new Blob([`# ${noteTitle}\n\n${noteContent}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Note exported as Markdown file");
  };

  // Word & Character count
  const wordCount = useMemo(() => {
    return noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0;
  }, [noteContent]);

  const charCount = noteContent.length;

  // Filter notes in sidebar
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notesList;
    const q = searchQuery.toLowerCase();
    return notesList.filter(
      (n) => n.title.toLowerCase().includes(q) || (n.preview && n.preview.toLowerCase().includes(q))
    );
  }, [notesList, searchQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* ── Top Application Header ────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/project-management"
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
            title="Back to Project Management"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Project Mgmt</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">📝</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  My Private Notes & Whiteboard
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                  <Lock className="w-2.5 h-2.5" /> Only You
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
                Exclusive to {currentUserName} • Blank page typing & handwriting whiteboard
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher (Notes, Whiteboard, Split) */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("notes")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "notes"
                ? "bg-white dark:bg-slate-700 text-brand-900 dark:text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Text Document View"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "split"
                ? "bg-white dark:bg-slate-700 text-brand-900 dark:text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Side-by-side Notes & Whiteboard"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("whiteboard")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "whiteboard"
                ? "bg-white dark:bg-slate-700 text-brand-900 dark:text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Full Whiteboard View"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Whiteboard</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCreateNewNote}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
            title="Create a new note"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Note</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveNote(true)}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-apple-xs ${
              hasUnsavedChanges
                ? "bg-[#FBBE23] hover:bg-amber-500 text-brand-950 animate-pulse"
                : "bg-brand-900 hover:bg-brand-950 dark:bg-brand-800"
            }`}
            title="Save Note (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : hasUnsavedChanges ? "Save*" : "Saved"}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Export Note"
            >
              <FileDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1.5 hidden group-hover:block z-30 animate-in fade-in">
              <button
                type="button"
                onClick={exportAsMarkdown}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Export as Markdown (.md)
              </button>
              <button
                type="button"
                onClick={exportAsTxt}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Export as Plain Text (.txt)
              </button>
              <button
                type="button"
                onClick={handleDownloadCanvas}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Download Whiteboard (.png)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Workspace ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Left Sidebar: Notes Navigator ───────────────────────────────────── */}
        <aside
          className={`${
            sidebarOpen ? "w-64 sm:w-72" : "w-0"
          } transition-all duration-300 ease-in-out shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden`}
        >
          {/* Notes Search & Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                My Notes ({notesList.length})
              </span>
              <button
                type="button"
                onClick={handleCreateNewNote}
                className="p-1 rounded-lg text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-slate-800 transition-colors"
                title="Create Note"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center p-6 text-xs text-slate-400 dark:text-slate-500">
                No notes found
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isActive = note.id === currentNoteId;
                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note.id)}
                    className={`group relative rounded-xl p-2.5 cursor-pointer transition-all border text-left ${
                      isActive
                        ? "bg-brand-50 dark:bg-slate-800 border-brand-300 dark:border-brand-600 shadow-2xs"
                        : "bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3
                        className={`text-xs font-bold truncate flex-1 ${
                          isActive
                            ? "text-brand-900 dark:text-white"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {note.title || "Untitled Note"}
                      </h3>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDuplicateNote(note, e)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Duplicate Note"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-red-500"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
                      {note.preview || "Empty note..."}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                      <span>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ""}</span>
                      <span className="font-mono text-[9px] bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                        🔒 Private
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Sidebar Toggle Tab */}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="self-center -ml-2.5 z-10 w-5 h-10 rounded-r-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          title={sidebarOpen ? "Hide Notes List" : "Show Notes List"}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              sidebarOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* ── Main Canvas Area (Document Editor & Whiteboard) ──────────────────── */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          {/* ───────────────────────────────────────────────────────────────────
              Left/Center Document Editor Canvas
          ───────────────────────────────────────────────────────────────────── */}
          {(viewMode === "notes" || viewMode === "split") && (
            <div
              className={`flex-1 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden ${
                viewMode === "split" ? "w-1/2" : "w-full"
              }`}
            >
              {/* Document Formatting Toolbar */}
              <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertFormatting("**", "**")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("*", "*")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Italic (*text*)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("~~", "~~")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Strikethrough (~~text~~)"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

                  <button
                    type="button"
                    onClick={() => insertLinePrefix("# ")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                    title="Heading 1"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLinePrefix("## ")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLinePrefix("### ")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                    title="Heading 3"
                  >
                    H3
                  </button>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

                  <button
                    type="button"
                    onClick={() => insertLinePrefix("- ")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Bullet list"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLinePrefix("1. ")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Numbered list"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLinePrefix("- [ ] ")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Checklist item"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLinePrefix("> ")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Quote"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("```\n", "\n```")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Code block"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLinePrefix("\n---\n")}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Divider line"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditorTab("edit")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      editorTab === "edit"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Edit3 className="w-3 h-3 inline mr-1" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      editorTab === "preview"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" /> Preview
                  </button>
                </div>
              </div>

              {/* Document Editable Body */}
              <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => {
                    setNoteTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Untitled Note"
                  className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-brand-500 focus:outline-none mb-4 pb-1 transition-colors"
                />

                {editorTab === "edit" ? (
                  <textarea
                    ref={textareaRef}
                    value={noteContent}
                    onChange={(e) => {
                      setNoteContent(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Type anything here... notes, ideas, meeting actions, specs, or convert whiteboard handwriting into this page directly."
                    className="flex-1 w-full resize-none bg-transparent text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none font-sans"
                    style={{ minHeight: "350px" }}
                  />
                ) : (
                  <div className="flex-1 prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed">
                    {noteContent ? (
                      <div className="space-y-2 whitespace-pre-wrap">
                        {noteContent.split("\n").map((line, idx) => {
                          if (line.startsWith("# ")) {
                            return <h1 key={idx} className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2">{line.slice(2)}</h1>;
                          }
                          if (line.startsWith("## ")) {
                            return <h2 key={idx} className="text-lg font-bold text-slate-900 dark:text-white mt-3 mb-1">{line.slice(3)}</h2>;
                          }
                          if (line.startsWith("### ")) {
                            return <h3 key={idx} className="text-base font-bold text-slate-900 dark:text-white mt-2 mb-1">{line.slice(4)}</h3>;
                          }
                          if (line.startsWith("- [ ] ")) {
                            return (
                              <label key={idx} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                                <input type="checkbox" className="checkbox checkbox-xs" readOnly />
                                <span>{line.slice(6)}</span>
                              </label>
                            );
                          }
                          if (line.startsWith("- [x] ")) {
                            return (
                              <label key={idx} className="flex items-center gap-2 cursor-pointer text-slate-400 line-through">
                                <input type="checkbox" className="checkbox checkbox-xs" checked readOnly />
                                <span>{line.slice(6)}</span>
                              </label>
                            );
                          }
                          if (line.startsWith("- ")) {
                            return (
                              <li key={idx} className="ml-4 list-disc text-slate-700 dark:text-slate-300">
                                {line.slice(2)}
                              </li>
                            );
                          }
                          if (line.startsWith("> ")) {
                            return (
                              <blockquote key={idx} className="border-l-4 border-brand-500 pl-3 italic text-slate-600 dark:text-slate-400 my-2">
                                {line.slice(2)}
                              </blockquote>
                            );
                          }
                          return <p key={idx} className="my-1 text-slate-800 dark:text-slate-200">{line || <br />}</p>;
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">This note is currently empty. Switch back to Edit tab to type notes.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Document Status Bar */}
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{charCount} characters</span>
                </div>
                <div>
                  {hasUnsavedChanges ? (
                    <span className="text-amber-500 font-medium">Unsaved changes...</span>
                  ) : lastSavedAt ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓ Saved at {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  ) : (
                    <span>Saved</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────
              Right/Center Whiteboard Canvas with Pen, Stylus & OCR
          ───────────────────────────────────────────────────────────────────── */}
          {(viewMode === "whiteboard" || viewMode === "split") && (
            <div
              className={`flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden relative ${
                viewMode === "split" ? "w-1/2" : "w-full"
              }`}
            >
              {/* Whiteboard Toolbar */}
              <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto bg-white dark:bg-slate-900 shrink-0 z-10">
                {/* Pen & Eraser tools */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTool("pen")}
                    className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors ${
                      activeTool === "pen"
                        ? "bg-brand-900 text-white shadow-2xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    title="Pen Tool (Handwriting & Sketching)"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Pen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool("highlighter")}
                    className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors ${
                      activeTool === "highlighter"
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    title="Highlighter Tool"
                  >
                    <span className="w-3.5 h-3.5 inline-block rounded bg-amber-400" />
                    <span className="hidden lg:inline">Highlight</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool("eraser")}
                    className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors ${
                      activeTool === "eraser"
                        ? "bg-slate-700 text-white shadow-2xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    title="Eraser Tool"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Eraser</span>
                  </button>

                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                  {/* Pen Colors */}
                  <div className="flex items-center gap-1">
                    {PEN_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setPenColor(c.value);
                          if (activeTool === "eraser") setActiveTool("pen");
                        }}
                        style={{ backgroundColor: c.value }}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          penColor === c.value && activeTool !== "eraser"
                            ? "scale-125 ring-2 ring-offset-2 ring-brand-500 shadow-sm"
                            : "hover:scale-110 opacity-90"
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>

                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                  {/* Pen Widths */}
                  <div className="flex items-center gap-1">
                    {PEN_WIDTHS.map((pw) => (
                      <button
                        key={pw.value}
                        type="button"
                        onClick={() => setPenWidth(pw.value)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          penWidth === pw.value
                            ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                            : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                        title={`${pw.name} (${pw.value}px)`}
                      >
                        {pw.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Undo, Redo, Background Pattern & OCR Convert */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300"
                    title="Undo Stroke"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyIndex >= canvasHistory.length - 1}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300"
                    title="Redo Stroke"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>

                  <select
                    value={bgPattern}
                    onChange={(e) => setBgPattern(e.target.value)}
                    className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
                    title="Whiteboard Canvas Style"
                  >
                    {BG_PATTERNS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Clear Whiteboard"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* OCR Handwriting to Text Button */}
                  <button
                    type="button"
                    onClick={handleConvertToText}
                    disabled={isConvertingOcr}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-apple-xs transition-all animate-in fade-in"
                    title="Convert pen handwriting to text via OCR"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isConvertingOcr ? "Reading..." : "Convert to Text"}</span>
                  </button>
                </div>
              </div>

              {/* Canvas Interactive Surface */}
              <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 select-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 cursor-crosshair touch-none"
                  style={{
                    backgroundColor: bgPattern === "dark" ? "#0f172a" : "#ffffff",
                  }}
                />

                {/* Floating Stylus / Pen Tip Indicator */}
                <div className="absolute left-4 bottom-4 px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 shadow-sm pointer-events-none flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activeTool === "eraser" ? "#64748b" : penColor }}
                  />
                  <span>
                    {activeTool === "eraser"
                      ? "Eraser Mode"
                      : activeTool === "highlighter"
                      ? "Highlighter (22px)"
                      : `Pen (${penWidth}px)`}
                  </span>
                  <span>• Stylus & Touch Ready</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: OCR Handwriting Recognition Results ──────────────────────── */}
      {ocrResultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Handwriting Converted to Text
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Transcribed from your whiteboard pen strokes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOcrResultModal({ open: false, text: "" })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                Recognized Text Content
              </label>
              <textarea
                value={ocrResultModal.text}
                onChange={(e) => setOcrResultModal((prev) => ({ ...prev, text: e.target.value }))}
                className="w-full h-32 text-sm bg-transparent border-none text-slate-900 dark:text-white focus:outline-none resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(ocrResultModal.text);
                  toast.success("Text copied to clipboard!");
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                type="button"
                onClick={() => replaceNoteWithOcrText(ocrResultModal.text)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Replace Note
              </button>
              <button
                type="button"
                onClick={() => appendOcrTextToNote(ocrResultModal.text)}
                className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-950 dark:bg-brand-800 text-white text-xs font-bold shadow-apple-xs transition-colors"
              >
                Append to Current Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
