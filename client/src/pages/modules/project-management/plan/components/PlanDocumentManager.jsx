/**
 * @file PlanDocumentManager.jsx
 * @description Master Project Plan Supporting Documents Register & Version Control System.
 * 
 * Features:
 * 1. Immediate document persistence to pm_documents and pm_document_revisions upon upload.
 * 2. Automatic initial version establishment (v1.0).
 * 3. Upload New Version workflow (v1.1, v2.0, or custom) with revision notes and changelog.
 * 4. Version History timeline drawer/modal displaying all historical versions with download links.
 * 5. Rollback / "Restore as Current" capability for historical versions.
 * 6. Cloudinary integration, file type badges, search filter, and category categorization.
 */

import React, { useState, useRef, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Upload,
  ExternalLink,
  History,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Paperclip,
  GitBranch,
  Calendar,
  User,
  Search,
  Filter,
  Plus,
  Eye,
  X,
  FileCode,
  FileSpreadsheet,
  FileCheck,
  ShieldCheck,
  Check,
  ArrowRight,
  FolderKanban,
  Download,
} from "lucide-react";
import { api } from "../../../../../api/client.js";
import { toast } from "react-toastify";

const CATEGORIES = [
  "Project Charter",
  "Contract & Agreements",
  "Engineering Drawings",
  "Technical Specifications",
  "Baseline Report",
  "Procurement / BOQ",
  "Quality & Safety",
  "Change Order / Variation",
  "General",
];

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getFileIcon(filename = "", fileUrl = "") {
  const combined = (filename + " " + fileUrl).toLowerCase();
  if (combined.includes(".pdf")) {
    return <FileText className="text-rose-500" size={18} />;
  }
  if (combined.includes(".dwg") || combined.includes(".dxf") || combined.includes(".cad")) {
    return <FileCode className="text-blue-500" size={18} />;
  }
  if (combined.includes(".xls") || combined.includes(".xlsx") || combined.includes(".csv")) {
    return <FileSpreadsheet className="text-emerald-500" size={18} />;
  }
  if (combined.includes(".doc") || combined.includes(".docx")) {
    return <FileCheck className="text-indigo-500" size={18} />;
  }
  return <Paperclip className="text-slate-400" size={18} />;
}

export default function PlanDocumentManager({
  project,
  documents: initialDocuments = [],
  onRefresh,
  planReturnState,
  readOnly = false,
}) {
  const projectId = project?.id;
  const [documents, setDocuments] = useState(initialDocuments || []);

  // Update local state when parent documents list changes
  useEffect(() => {
    setDocuments(initialDocuments || []);
  }, [initialDocuments]);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Project Charter");
  const [initialVersion, setInitialVersion] = useState("v1.0");
  const [changeNotes, setChangeNotes] = useState("Initial document upload");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  // Version Control Modals
  const [versionModalDoc, setVersionModalDoc] = useState(null); // Document selected for new version upload
  const [historyModalDoc, setHistoryModalDoc] = useState(null); // Document selected for version history drawer
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState(null);

  // New Version Form State
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [newVersionNo, setNewVersionNo] = useState("");
  const [newVersionNotes, setNewVersionNotes] = useState("");
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const newVersionInputRef = useRef(null);

  // Handle file select for new document
  const handleFilePicked = (file) => {
    if (!file) return;
    setUploadFile(file);
    if (!title) {
      // Auto-populate title from file name (strip extension)
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setTitle(cleanName);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFilePicked(e.dataTransfer.files[0]);
    }
  };

  // Submit initial document upload
  const handleSubmitNewDocument = async (e) => {
    if (e) e.preventDefault();
    if (!uploadFile) {
      toast.warning("Please choose or drop a file to upload.");
      return;
    }
    if (!projectId) {
      toast.error("Project ID is missing.");
      return;
    }

    setIsUploading(true);
    setUploadProgressText("Uploading document to Cloudinary...");

    try {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("folder", `omnisuite/projects/${projectId}/plan`);

      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploadData = uploadRes.data || {};
      const fileUrl = uploadData.url || uploadData.path;
      if (!fileUrl) throw new Error("File upload failed: No URL returned from storage service.");

      setUploadProgressText("Registering document in Project Master...");

      // 2. Persist to MySQL pm_documents & pm_document_revisions
      const docPayload = {
        title: title.trim() || uploadFile.name,
        category,
        file_url: fileUrl,
        original_filename: uploadFile.name,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
        public_id: uploadData.public_id || null,
        revision_no: initialVersion || "v1.0",
        change_description: changeNotes || "Initial document upload",
      };

      const saveRes = await api.post(`/projects/projects/${projectId}/plan/documents`, docPayload);
      const createdDoc = saveRes.data?.document;

      // 3. Immediately reflect in UI
      if (createdDoc) {
        setDocuments((prev) => [createdDoc, ...prev]);
      }
      if (onRefresh) onRefresh();

      toast.success(
        `Document "${docPayload.title}" registered successfully with version ${docPayload.revision_no}!`
      );

      // Reset form
      setUploadFile(null);
      setTitle("");
      setChangeNotes("Initial document upload");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Document upload failed:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
    }
  };

  // Open "Upload New Version" Modal
  const handleOpenVersionModal = (doc) => {
    setVersionModalDoc(doc);
    setNewVersionFile(null);
    setNewVersionNotes("");

    // Calculate intelligent default next version
    const cur = doc.current_revision || "v1.0";
    const match = cur.match(/^v?(\d+)\.(\d+)$/i);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      setNewVersionNo(`v${major}.${minor + 1}`);
    } else {
      setNewVersionNo("v1.1");
    }
  };

  // Submit New Revision
  const handleSubmitNewRevision = async () => {
    if (!newVersionFile) {
      toast.warning("Please select a revised file to upload.");
      return;
    }
    if (!newVersionNo.trim()) {
      toast.warning("Please specify a revision number (e.g., v1.1).");
      return;
    }

    setIsUploadingVersion(true);
    try {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", newVersionFile);
      formData.append("folder", `omnisuite/projects/${projectId}/plan/revisions`);

      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploadData = uploadRes.data || {};
      const fileUrl = uploadData.url || uploadData.path;
      if (!fileUrl) throw new Error("Revision upload failed: No URL returned from storage service.");

      // 2. Persist new revision in backend
      const revPayload = {
        revision_no: newVersionNo.trim(),
        change_description: newVersionNotes.trim() || "Revision upgrade",
        file_url: fileUrl,
        original_filename: newVersionFile.name,
        file_size: newVersionFile.size,
        file_type: newVersionFile.type,
        public_id: uploadData.public_id || null,
      };

      const res = await api.post(
        `/projects/projects/${projectId}/plan/documents/${versionModalDoc.id}/revisions`,
        revPayload
      );

      // 3. Update local documents state
      setDocuments((prev) =>
        prev.map((d) => {
          if (String(d.id) === String(versionModalDoc.id)) {
            return {
              ...d,
              current_revision: res.data?.current_revision || newVersionNo.trim(),
              file_url: fileUrl,
              revisions: res.data?.revisions || [
                {
                  revision_no: newVersionNo.trim(),
                  file_url: fileUrl,
                  change_description: revPayload.change_description,
                  revision_date: new Date().toISOString().split("T")[0],
                },
                ...(d.revisions || []),
              ],
            };
          }
          return d;
        })
      );

      if (onRefresh) onRefresh();
      toast.success(`Document upgraded to version ${newVersionNo.trim()} successfully!`);
      setVersionModalDoc(null);
    } catch (err) {
      console.error("Revision upload failed:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to upload revision");
    } finally {
      setIsUploadingVersion(false);
    }
  };

  // Restore Historical Revision
  const handleRestoreRevision = async (doc, rev) => {
    if (!window.confirm(`Are you sure you want to restore revision ${rev.revision_no} as the active current version?`)) {
      return;
    }

    try {
      const res = await api.post(
        `/projects/projects/${projectId}/plan/documents/${doc.id}/revisions/${rev.id}/restore`
      );

      setDocuments((prev) =>
        prev.map((d) => {
          if (String(d.id) === String(doc.id)) {
            return {
              ...d,
              current_revision: res.data?.current_revision || rev.revision_no,
              file_url: rev.file_url,
              revisions: res.data?.revisions || d.revisions,
            };
          }
          return d;
        })
      );

      if (historyModalDoc && String(historyModalDoc.id) === String(doc.id)) {
        setHistoryModalDoc((prev) => ({
          ...prev,
          current_revision: rev.revision_no,
          file_url: rev.file_url,
          revisions: res.data?.revisions || prev.revisions,
        }));
      }

      if (onRefresh) onRefresh();
      toast.success(`Revision ${rev.revision_no} restored as current version!`);
    } catch (err) {
      console.error("Restore failed:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to restore revision");
    }
  };

  // Delete Document
  const handleDeleteDocument = async () => {
    if (!deleteConfirmDoc) return;
    try {
      await api.delete(`/projects/projects/${projectId}/plan/documents/${deleteConfirmDoc.id}`);
      setDocuments((prev) => prev.filter((d) => String(d.id) !== String(deleteConfirmDoc.id)));
      if (onRefresh) onRefresh();
      toast.info(`Document "${deleteConfirmDoc.title}" deleted.`);
      setDeleteConfirmDoc(null);
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to delete document");
    }
  };

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return (documents || []).filter((doc) => {
      const matchSearch =
        !searchQuery ||
        (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.doc_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.document_number || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat =
        selectedCategoryFilter === "ALL" ||
        (doc.doc_category || doc.category || "General").toLowerCase() ===
          selectedCategoryFilter.toLowerCase();

      return matchSearch && matchCat;
    });
  }, [documents, searchQuery, selectedCategoryFilter]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Paperclip size={18} className="text-brand-600" />
            <span>Project Plan Supporting Documents &amp; Revision Control</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Integrated with OmniSuite Central Document Management. Upload signed charters, contract drawings,
            specifications, and baseline reports with full versioning (v1.0, v1.1, v2.0).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Link
            to={`/project-management/documents?project_id=${projectId}&from=plan`}
            state={planReturnState}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <span>Open Central Register</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* ── Upload New Document Area ── */}
      {!readOnly && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Upload size={14} className="text-brand-600" />
              <span>Upload New Project Document</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Establishes initial baseline version (v1.0)
            </span>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              dragActive
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/20"
                : uploadFile
                ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20"
                : "border-slate-200 dark:border-slate-700 hover:border-brand-400 bg-white dark:bg-slate-900"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFilePicked(e.target.files[0]);
                }
              }}
            />

            {uploadFile ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  {getFileIcon(uploadFile.name)}
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {uploadFile.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatBytes(uploadFile.size)} • Click to change file
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400 flex items-center justify-center">
                  <Upload size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Click to browse or drag and drop document here
                  </span>
                  <span className="text-[11px] text-slate-400">
                    PDF, DWG, DXF, DOCX, XLSX, PNG (Max 50MB)
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Document Metadata Inputs */}
          {uploadFile && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Structural Drawing Rev 1"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-brand-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Document Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-brand-600 font-medium"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Initial Version Tag
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={initialVersion}
                    onChange={(e) => setInitialVersion(e.target.value)}
                    className="w-24 text-xs font-mono font-bold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-brand-600 text-brand-700 dark:text-brand-300"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleSubmitNewDocument}
                    className="flex-1 text-xs font-bold px-4 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Check size={13} />
                        <span>Save &amp; Register</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isUploading && uploadProgressText && (
            <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-2 pt-1">
              <Loader2 size={13} className="animate-spin" />
              <span>{uploadProgressText}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Registered Documents List ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Documents in Project Register ({documents.length})
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {documents.filter((d) => (d.revisions || []).length > 1).length} with version revisions
            </span>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-brand-600 w-44"
              />
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredDocuments.map((doc) => {
              const currentRev = doc.current_revision || "v1.0";
              const revCount = (doc.revisions || []).length || 1;
              const meta = doc.meta || {};
              const fileSizeFormatted = meta.file_size ? formatBytes(meta.file_size) : null;

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between gap-3 shadow-2xs group"
                >
                  {/* Top Bar: Icon, Title, and Category */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {getFileIcon(doc.title, doc.file_url)}
                        </div>
                        <div className="min-w-0">
                          <span
                            className="text-xs font-bold text-slate-900 dark:text-white block truncate"
                            title={doc.title}
                          >
                            {doc.title || "Untitled Project Document"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">
                            {doc.doc_number || doc.document_number || `DOC-${doc.id}`}
                          </span>
                        </div>
                      </div>

                      {/* Version Pill */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 shrink-0">
                        {currentRev}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {doc.doc_category || doc.category || "General"}
                      </span>
                      {fileSizeFormatted && (
                        <span className="text-[10px] text-slate-400">{fileSizeFormatted}</span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(doc.created_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      {/* View / Download */}
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition flex items-center gap-1"
                          title="Open active document"
                        >
                          <Download size={11} />
                          <span>View</span>
                        </a>
                      )}

                      {/* Upload New Version */}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleOpenVersionModal(doc)}
                          className="px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Upload new revision of this document"
                        >
                          <Plus size={11} />
                          <span>New Rev</span>
                        </button>
                      )}

                      {/* Version History */}
                      <button
                        type="button"
                        onClick={() => setHistoryModalDoc(doc)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="View revision history"
                      >
                        <History size={11} />
                        <span>Revs ({revCount})</span>
                      </button>
                    </div>

                    {/* Delete */}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmDoc(doc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Delete document"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Paperclip size={18} />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No documents registered in this project plan yet.
            </p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Upload project specifications, engineering drawings, baseline estimates, or signed charters
              above to maintain version-controlled records.
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL: Upload New Version ── */}
      {versionModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                  <GitBranch size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Upload New Document Revision
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Target: <span className="font-semibold text-slate-700 dark:text-slate-300">{versionModalDoc.title}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVersionModalDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Version Suggester Buttons */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Revision Number
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newVersionNo}
                    onChange={(e) => setNewVersionNo(e.target.value)}
                    placeholder="e.g. v1.1 or v2.0"
                    className="w-32 text-xs font-mono font-bold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-brand-600 text-brand-700 dark:text-brand-300"
                  />
                  {/* Quick Suggester Pills */}
                  <button
                    type="button"
                    onClick={() => {
                      const cur = versionModalDoc.current_revision || "v1.0";
                      const m = cur.match(/^v?(\d+)\.(\d+)$/i);
                      if (m) setNewVersionNo(`v${m[1]}.${parseInt(m[2], 10) + 1}`);
                      else setNewVersionNo("v1.1");
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    + Minor (e.g. v1.1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = versionModalDoc.current_revision || "v1.0";
                      const m = cur.match(/^v?(\d+)/i);
                      if (m) setNewVersionNo(`v${parseInt(m[1], 10) + 1}.0`);
                      else setNewVersionNo("v2.0");
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    + Major (e.g. v2.0)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Revision Changelog / Notes
                </label>
                <textarea
                  rows={2}
                  value={newVersionNotes}
                  onChange={(e) => setNewVersionNotes(e.target.value)}
                  placeholder="Detail the adjustments made (e.g., Updated column foundation details per site inspection report)"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-brand-600"
                />
              </div>

              {/* Revision File Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Upload Revised File
                </label>
                <div
                  onClick={() => newVersionInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                    newVersionFile
                      ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-brand-400"
                  }`}
                >
                  <input
                    ref={newVersionInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewVersionFile(e.target.files[0]);
                      }
                    }}
                  />
                  {newVersionFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {getFileIcon(newVersionFile.name)}
                      <span>{newVersionFile.name}</span>
                      <span className="text-slate-400">({formatBytes(newVersionFile.size)})</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      Click to choose revised document file (PDF, DWG, XLSX, DOCX)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setVersionModalDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploadingVersion || !newVersionFile}
                onClick={handleSubmitNewRevision}
                className="px-4 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isUploadingVersion ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Uploading Revision...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Commit Revision {newVersionNo}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Version History Drawer ── */}
      {historyModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0E3646] text-white flex items-center justify-center shadow-md">
                  <History size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Document Revision History
                  </h4>
                  <p className="text-xs text-slate-500">
                    {historyModalDoc.title} • Current Active:{" "}
                    <span className="font-mono font-bold text-emerald-600">
                      {historyModalDoc.current_revision || "v1.0"}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Revision Timeline List */}
            <div className="p-5 overflow-y-auto space-y-4">
              {(historyModalDoc.revisions || []).length > 0 ? (
                <div className="space-y-3">
                  {historyModalDoc.revisions.map((rev, idx) => {
                    const isCurrent =
                      rev.revision_no === (historyModalDoc.current_revision || "v1.0");

                    return (
                      <div
                        key={rev.id || idx}
                        className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrent
                            ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                            : "bg-slate-50/60 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                              {rev.revision_no}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                                CURRENT ACTIVE
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {rev.revision_date || new Date(rev.created_at || Date.now()).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {rev.change_description || "Revision update"}
                          </p>

                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>Uploaded by: {rev.uploaded_by || "Authorized User"}</span>
                          </div>
                        </div>

                        {/* Actions for this revision */}
                        <div className="flex items-center gap-2 shrink-0">
                          {rev.file_url && (
                            <a
                              href={rev.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-brand-700 dark:text-brand-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                            >
                              <ExternalLink size={12} />
                              <span>View File</span>
                            </a>
                          )}

                          {!readOnly && !isCurrent && rev.id && (
                            <button
                              type="button"
                              onClick={() => handleRestoreRevision(historyModalDoc, rev)}
                              className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Set this historical revision as active current version"
                            >
                              <RotateCcw size={12} />
                              <span>Restore as Active</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No historical revisions recorded for this document yet.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirm Delete ── */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Delete Project Document
                </h4>
                <p className="text-[11px] text-slate-400">Irreversible action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <span className="font-bold">"{deleteConfirmDoc.title}"</span> and all its revision history?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDocument}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
