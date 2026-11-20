/**
 * @fileoverview ChatModal component and related sub-components for the chat system.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { api } from "../../api/client";
import useSocket from "../../hooks/useSocket";
import { useAuth } from "../../auth/AuthContext";
import { toast } from "react-toastify";
// Default OmniSuite Chat Background Wallpaper
import defaultChatBg from "../../assets/resources/CHAT_BACKGROUND.png";
import {
  Paperclip,
  Image as ImageIcon,
  FileText,
  Music,
  MapPin,
  User as UserIcon,
  Send,
  X,
  Search,
  Check,
  CheckCheck,
  Download,
  ExternalLink,
  ChevronLeft,
  Loader2,
  RotateCcw,
  Users,
  UserPlus,
  FolderKanban,
  Info,
  LogOut,
  Shield,
  ShieldCheck,
} from "lucide-react";

// Self-contained Plus icon component (safe from bundler/HMR import issues)
const Plus = ({ size = 14, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

function getSenderColor(id) {
  const colors = [
    "text-emerald-600 dark:text-emerald-400",
    "text-sky-600 dark:text-sky-400",
    "text-violet-600 dark:text-violet-400",
    "text-amber-600 dark:text-amber-400",
    "text-rose-600 dark:text-rose-400",
    "text-teal-600 dark:text-teal-400",
    "text-indigo-600 dark:text-indigo-400",
    "text-pink-600 dark:text-pink-400",
  ];
  const num = Number(id) || 0;
  return colors[num % colors.length];
}

/**
 * Renders the list of conversations and available users to chat with.
 * Supports Project Groups and Direct Chats tabs.
 * @param {Object} props
 * @returns {JSX.Element}
 */
function ConversationList({
  items,
  activeId,
  onOpen,
  users,
  onStart,
  unreadByUser,
  onCloseSidebar,
  onOpenCreateGroup,
  activeTab = "direct",
  setActiveTab,
}) {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const list = (items || []).filter((c) => Boolean(c.is_group));
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (g) =>
        g.title?.toLowerCase().includes(q) ||
        g.project_name?.toLowerCase().includes(q) ||
        g.project_code?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const totalGroupUnread = useMemo(() => {
    return (items || [])
      .filter((c) => Boolean(c.is_group))
      .reduce((sum, g) => sum + Number(g.unread_count || 0), 0);
  }, [items]);

  const totalDirectUnread = useMemo(() => {
    return Object.values(unreadByUser || {}).reduce(
      (sum, val) => sum + Number(val || 0),
      0,
    );
  }, [unreadByUser]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users || [];
    const q = search.toLowerCase();
    return (users || []).filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div className="w-[30%] md:w-[290px] border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 h-full flex flex-col text-slate-800 dark:text-slate-100 shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
          Messages
        </span>
        <button
          type="button"
          onClick={onCloseSidebar}
          className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          aria-label="Close contacts panel"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs: Project Groups vs Direct Chats */}
      <div className="p-2 border-b border-slate-200/60 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-850">
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("groups");
              setSearch("");
            }}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "groups"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <FolderKanban size={13} />
            <span>Groups</span>
            {totalGroupUnread > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold leading-tight">
                {totalGroupUnread}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("direct");
              setSearch("");
            }}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "direct"
                ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Users size={13} />
            <span>Direct</span>
            {totalDirectUnread > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-brand-600 text-white text-[9px] font-extrabold leading-tight">
                {totalDirectUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search Filter & Action Header */}
      <div className="p-2.5 border-b border-slate-200/60 dark:border-slate-800 space-y-2">
        {activeTab === "groups" && (
          <button
            type="button"
            onClick={onOpenCreateGroup}
            className="w-full btn btn-primary py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-none"
          >
            <Plus size={13} />
            <span>New Project Group</span>
          </button>
        )}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === "groups" ? "Search project groups..." : "Search users..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* List Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
        {activeTab === "groups" ? (
          groups.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-2">
              <FolderKanban size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No project groups found</p>
              <p className="text-[11px] leading-relaxed">
                Groups are private to their members. Create a project group to collaborate!
              </p>
              <button
                type="button"
                onClick={onOpenCreateGroup}
                className="mt-2 text-xs px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
              >
                <Plus size={12} />
                <span>Create Group</span>
              </button>
            </div>
          ) : (
            groups.map((g) => {
              const isSelected = activeId && Number(activeId) === Number(g.id);
              const unread = Number(g.unread_count || 0);
              return (
                <button
                  key={g.id}
                  onClick={() => onOpen(g)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-l-3 border-emerald-600"
                      : "hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shadow-xs">
                      <FolderKanban size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold ring-2 ring-white dark:ring-slate-900">
                      G
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {g.title}
                      </span>
                      {unread > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {g.project_code && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shrink-0">
                          {g.project_code}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        {g.last_message || (g.project_name ? g.project_name : "Team group chat")}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                      <Users size={10} />
                      <span>{g.member_count || 1} participants</span>
                    </div>
                  </div>
                </button>
              );
            })
          )
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 italic">
            No contacts found
          </div>
        ) : (
          filteredUsers.map((u) => {
            const unread = Number(unreadByUser?.[u.id] || 0);
            const isSelected = activeId && (Number(activeId) === Number(u.id) || Number(activeId) === Number(u.conversation_id));
            return (
              <button
                key={u.id}
                onClick={() => onStart(u)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-brand-50/90 dark:bg-brand-950/40 border-l-3 border-brand-600"
                    : "hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={u.profile_picture_url || "/default-avatar.png"}
                    alt={u.username}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                  {u.is_online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {u.full_name || u.username}
                    </span>
                    {unread > 0 && (
                      <span className="min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {unread}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {u.is_online ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">• online</span>
                    ) : (
                      `@${u.username}`
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Renders a location card message with Google Maps link.
 * @param {Object} props
 * @returns {JSX.Element}
 */
function LocationCard({ content }) {
  let data = null;
  try {
    data = typeof content === "string" ? JSON.parse(content) : content;
  } catch {}
  if (!data?.lat || !data?.lng) {
    return <div className="text-xs text-slate-500 italic">Location data unavailable</div>;
  }
  const mapUrl = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
  return (
    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs min-w-[200px]">
      <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
        <MapPin size={16} className="text-emerald-500 shrink-0" />
        <span>{data.label || "Shared Location"}</span>
      </div>
      <div className="text-[11px] text-slate-500 font-mono">
        {Number(data.lat).toFixed(5)}, {Number(data.lng).toFixed(5)}
      </div>
      <a
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline pt-0.5"
      >
        <ExternalLink size={12} /> Open in Google Maps
      </a>
    </div>
  );
}

/**
 * Renders a contact card message.
 * @param {Object} props
 * @returns {JSX.Element}
 */
function ContactCard({ content }) {
  let data = null;
  try {
    data = typeof content === "string" ? JSON.parse(content) : content;
  } catch {}
  if (!data) return <div className="text-xs italic text-slate-400">Contact card</div>;
  return (
    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs min-w-[190px]">
      <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 font-bold text-xs">
        {(data.name || data.username || "U").slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
          {data.name || data.username}
        </div>
        {data.phone && <div className="text-[11px] text-slate-500 truncate">{data.phone}</div>}
        {data.email && <div className="text-[11px] text-slate-400 truncate">{data.email}</div>}
      </div>
    </div>
  );
}

/**
 * Renders the list of messages in the active conversation.
 * @param {Object} props
 * @returns {JSX.Element}
 */
function MessageList({ items, myId, bgUrl, isGroup }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [items]);

  const dayLabel = (d) => {
    const dt = new Date(d);
    const today = new Date();
    const yday = new Date();
    yday.setDate(today.getDate() - 1);
    const sameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (sameDay(dt, today)) return "Today";
    if (sameDay(dt, yday)) return "Yesterday";
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      ref={ref}
      className="flex-1 overflow-auto p-4 space-y-2 chat-bg"
      style={{
        backgroundImage: `url('${bgUrl || defaultChatBg}')`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {items.map((m, idx) => {
        const outgoing = Number(m.sender_id) === Number(myId);
        const type = String(m.message_type || "text").toLowerCase();
        const currDate = new Date(m.sent_at || m.created_at || Date.now());
        const prev = items[idx - 1];
        const prevDate = prev
          ? new Date(prev.sent_at || prev.created_at || Date.now())
          : null;
        const showSeparator =
          !prev ||
          currDate.getFullYear() !== prevDate.getFullYear() ||
          currDate.getMonth() !== prevDate.getMonth() ||
          currDate.getDate() !== prevDate.getDate();

        if (type === "system") {
          return (
            <React.Fragment key={m.id}>
              {showSeparator && (
                <div className="flex justify-center my-3">
                  <div className="text-[11px] px-3 py-1 rounded-full bg-slate-200/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs font-medium">
                    {dayLabel(currDate)}
                  </div>
                </div>
              )}
              <div className="flex justify-center my-2">
                <div className="text-[11px] px-3.5 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium italic border border-slate-200/60 dark:border-slate-700/60 shadow-2xs text-center max-w-sm">
                  {m.content}
                </div>
              </div>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={m.id}>
            {showSeparator && (
              <div className="flex justify-center my-3">
                <div className="text-[11px] px-3 py-1 rounded-full bg-slate-200/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs font-medium">
                  {dayLabel(currDate)}
                </div>
              </div>
            )}
            <div
              className={
                "flex gap-1.5 " +
                (outgoing ? "justify-end" : "justify-start items-end")
              }
            >
              {!outgoing && isGroup && (
                <img
                  src={m.sender_avatar || "/default-avatar.png"}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover shrink-0 mb-1 border border-slate-200 dark:border-slate-700 shadow-2xs"
                  title={m.sender_name || m.sender_username}
                />
              )}
              <div
                className={
                  "max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm shadow-xs " +
                  (outgoing
                    ? "bg-[#d9fdd3] dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/40 text-slate-900 dark:text-slate-100 rounded-br-xs"
                    : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-700")
                }
              >
                {!outgoing && isGroup && (
                  <div
                    className={
                      "text-[11px] font-extrabold mb-1 truncate " +
                      getSenderColor(m.sender_id)
                    }
                  >
                    {m.sender_name || m.sender_username || "Colleague"}
                  </div>
                )}
                {type === "text" && (
                  <span className="leading-relaxed whitespace-pre-wrap break-words">
                    {m.content}
                  </span>
                )}

                {type === "image" && (
                  <div className="space-y-1.5">
                    <a
                      href={m.content}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl group relative"
                    >
                      <img
                        src={m.content}
                        alt={m.file_name || "attachment"}
                        className="max-h-72 max-w-full rounded-xl object-cover hover:scale-[1.01] transition-transform duration-200"
                        loading="lazy"
                      />
                    </a>
                    {m.file_name && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2 pt-0.5">
                        <span className="truncate max-w-[200px]">{m.file_name}</span>
                        <a
                          href={m.content}
                          target="_blank"
                          rel="noreferrer"
                          download={m.file_name || true}
                          className="text-brand-600 hover:text-brand-700 flex items-center gap-0.5 text-[10px] font-semibold"
                        >
                          <Download size={12} /> Save
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {type === "video" && (
                  <div className="space-y-1.5">
                    <video
                      src={m.content}
                      className="max-h-72 max-w-full rounded-xl shadow-xs"
                      controls
                      preload="metadata"
                    />
                    {m.file_name && (
                      <div className="text-[11px] text-slate-500 truncate">{m.file_name}</div>
                    )}
                  </div>
                )}

                {type === "audio" && (
                  <div className="space-y-1">
                    <audio src={m.content} controls className="max-w-[250px] h-9" />
                    {m.file_name && (
                      <div className="text-[10px] text-slate-500 truncate">{m.file_name}</div>
                    )}
                  </div>
                )}

                {type === "document" && (
                  <a
                    href={m.content}
                    target="_blank"
                    rel="noreferrer"
                    download={m.file_name || true}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors group text-slate-800 dark:text-slate-100 no-underline min-w-[200px]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-xs font-semibold truncate group-hover:text-brand-600 transition-colors">
                        {m.file_name || "Document"}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        {m.file_size != null && <span>{(Number(m.file_size) / 1024).toFixed(0)} KB ·</span>}
                        <span className="uppercase font-mono">{m.file_name?.split(".").pop() || "FILE"}</span>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                      <Download size={13} />
                    </div>
                  </a>
                )}

                {type === "contact" && <ContactCard content={m.content} />}
                {type === "location" && <LocationCard content={m.content} />}

                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-right flex items-center justify-end gap-1 select-none">
                  <span>
                    {new Date(
                      m.sent_at || m.created_at || Date.now(),
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {outgoing && (
                    <span>
                      {m.status === "read" ? (
                        <CheckCheck size={14} className="text-sky-500" />
                      ) : m.status === "delivered" ? (
                        <CheckCheck size={14} className="text-slate-400" />
                      ) : (
                        <Check size={14} className="text-slate-400" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Modal to create a new project group chat with invited members.
 */
function CreateGroupModal({
  open,
  onClose,
  projects,
  users,
  onCreated,
}) {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userFilter, setUserFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setProjectId("");
      setTitle("");
      setDescription("");
      setSelectedUserIds([]);
      setUserFilter("");
    }
  }, [open]);

  if (!open) return null;

  const handleProjectSelect = (pid) => {
    setProjectId(pid);
    if (pid && pid !== "none") {
      const p = projects.find((x) => String(x.id) === String(pid));
      if (p && !title) {
        setTitle(`${p.name} Team`);
      }
    }
  };

  const toggleUser = (uid) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const selectAll = () => {
    setSelectedUserIds((users || []).map((u) => u.id));
  };

  const deselectAll = () => {
    setSelectedUserIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        project_id: projectId && projectId !== "none" ? Number(projectId) : null,
        member_ids: selectedUserIds,
      };
      const res = await api.post("/chat/groups", payload);
      toast.success("Project group created successfully!");
      if (onCreated) onCreated(res.data?.group);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = (users || []).filter((u) => {
    if (!userFilter.trim()) return true;
    const q = userFilter.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FolderKanban size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                New Project Group Chat
              </h3>
              <p className="text-[11px] text-slate-400">
                WhatsApp-style team chat exclusive to invited members
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* Project Link */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Project (Optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="">-- Link to a Project --</option>
              <option value="none">Standalone Group (No Project)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code || "PRJ"}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Group Name */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Group Subject / Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Residential Tower - Execution Team"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-slate-100 font-semibold"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Group Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Provide a topic, guidelines, or notice..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Add Participants ({selectedUserIds.length} selected)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] text-brand-600 hover:underline font-semibold cursor-pointer"
                >
                  Select all
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[11px] text-slate-400 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Member Search filter */}
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search colleagues to add..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Colleagues checklist */}
            <div className="border border-slate-200/80 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 p-1">
              {filtered.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs italic">
                  No colleagues match search
                </div>
              ) : (
                filtered.map((u) => {
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-2.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUser(u.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <img
                        src={u.profile_picture_url || "/default-avatar.png"}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {u.full_name || u.username}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          @{u.username}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <FolderKanban size={13} />}
              <span>Create Group</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal to view group info, member list, and add/remove participants.
 */
function GroupInfoModal({
  open,
  onClose,
  group,
  myId,
  allUsers,
  onMembersUpdated,
  onLeaveGroup,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [selectedNewUsers, setSelectedNewUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadMembers = useCallback(async () => {
    if (!group?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/chat/groups/${group.id}/members`);
      setMembers(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [group?.id]);

  useEffect(() => {
    if (open && group?.id) {
      loadMembers();
      setSelectedNewUsers([]);
      setAddingUser(false);
    }
  }, [open, group?.id, loadMembers]);

  if (!open || !group) return null;

  const myMember = members.find((m) => Number(m.id) === Number(myId));
  const isOwnerOrAdmin = myMember?.role === "owner" || myMember?.role === "admin";

  const nonMembers = (allUsers || []).filter(
    (u) => !members.some((m) => Number(m.id) === Number(u.id)),
  );

  const handleAddMembers = async () => {
    if (selectedNewUsers.length === 0) return;
    try {
      await api.post(`/chat/groups/${group.id}/members`, {
        user_ids: selectedNewUsers,
      });
      toast.success("Participants added!");
      setSelectedNewUsers([]);
      setAddingUser(false);
      await loadMembers();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add members");
    }
  };

  const handleRemoveMember = async (targetUserId, targetName) => {
    if (!window.confirm(`Remove ${targetName || "user"} from this group?`)) return;
    try {
      await api.delete(`/chat/groups/${group.id}/members/${targetUserId}`);
      toast.success("Participant removed");
      await loadMembers();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this project group?")) return;
    try {
      await api.delete(`/chat/groups/${group.id}/members/${myId}`);
      toast.info("You left the group");
      onClose();
      if (onLeaveGroup) onLeaveGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave group");
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      m.username?.toLowerCase().includes(q) ||
      m.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FolderKanban size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {group.title}
              </h3>
              <p className="text-[11px] text-slate-400">
                {group.project_code ? `Project: ${group.project_code} • ` : ""}
                {members.length} participants
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Description */}
          {group.description && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300">
              <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">
                Description
              </span>
              <p className="leading-relaxed">{group.description}</p>
            </div>
          )}

          {/* Project Details if any */}
          {group.project_name && (
            <div className="p-2.5 bg-sky-50/80 dark:bg-sky-950/30 rounded-xl border border-sky-200/80 dark:border-sky-800/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                  Linked Project
                </span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  [{group.project_code || "PRJ"}] {group.project_name}
                </div>
              </div>
              <FolderKanban size={18} className="text-sky-500 shrink-0" />
            </div>
          )}

          {/* Add Members section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Participants ({members.length})
              </span>
              <button
                type="button"
                onClick={() => setAddingUser((v) => !v)}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <UserPlus size={12} />
                <span>{addingUser ? "Cancel" : "Add Participants"}</span>
              </button>
            </div>

            {addingUser && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 mb-3 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Select Colleagues to Invite
                </span>
                {nonMembers.length === 0 ? (
                  <div className="text-slate-400 text-center py-2">
                    All colleagues are already in this group.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-900">
                    {nonMembers.map((u) => {
                      const isSel = selectedNewUsers.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() =>
                              setSelectedNewUsers((prev) =>
                                isSel
                                  ? prev.filter((id) => id !== u.id)
                                  : [...prev, u.id],
                              )
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="text-xs text-slate-800 dark:text-slate-200 truncate">
                            {u.full_name || u.username} (@{u.username})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {nonMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={selectedNewUsers.length === 0}
                    className="w-full btn btn-primary py-1.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                  >
                    <Plus size={12} />
                    <span>Add Selected ({selectedNewUsers.length})</span>
                  </button>
                )}
              </div>
            )}

            {/* Search members */}
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Members List */}
            {loading ? (
              <div className="p-4 text-center text-slate-400">
                <Loader2 size={16} className="animate-spin mx-auto mb-1" />
                Loading participants...
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white dark:bg-slate-900">
                {filteredMembers.map((m) => {
                  const isMe = Number(m.id) === Number(myId);
                  return (
                    <div
                      key={m.id}
                      className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={m.profile_picture_url || "/default-avatar.png"}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          {m.is_online && (
                            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                            <span>{m.full_name || m.username}</span>
                            {isMe && (
                              <span className="text-[10px] text-slate-400 italic">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            @{m.username}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                            m.role === "owner"
                              ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                              : m.role === "admin"
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {m.role || "member"}
                        </span>
                        {isOwnerOrAdmin && !isMe && m.role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id, m.full_name || m.username)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Remove participant"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leave Group Action */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleLeave}
              className="w-full text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200/60 dark:border-rose-900/40"
            >
              <LogOut size={13} />
              <span>Leave Group</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main ChatModal component containing the chat UI.
 * @param {Object} props
 * @param {Function} props.onClose - Callback to close the modal.
 * @returns {JSX.Element}
 */
export default function ChatModal({ onClose }) {
  const socket = useSocket();
  const { user } = useAuth();
  const myId = Number(user?.sub || user?.id);
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("direct");
  const [projects, setProjects] = useState([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [unreadByUser, setUnreadByUser] = useState({});
  const [chatBg, setChatBg] = useState(defaultChatBg);
  const attachRootRef = useRef(null);
  const fileMediaRef = useRef(null);
  const fileDocRef = useRef(null);
  const fileAudioRef = useRef(null);
  const bgFileRef = useRef(null);

  /**
   * Fetches the user's active conversations.
   */
  async function loadConvos() {
    try {
      const res = await api.get("/chat/conversations");
      setConvos(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch {
      setConvos([]);
    }
  }

  /**
   * Fetches unread message counts grouped by user.
   */
  async function loadUnreadByUser() {
    try {
      const res = await api.get("/chat/unread-by-user");
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const map = {};
      for (const r of items) {
        map[Number(r.user_id)] = Number(r.unread || 0);
      }
      setUnreadByUser(map);
    } catch {
      setUnreadByUser({});
    }
  }

  /**
   * Opens a specific conversation and loads its messages.
   * @param {Object} c - The conversation object.
   */
  async function openConversation(c) {
    setActive(c);
    try {
      if (socket) {
        try {
          socket.emit("join_conversation", c.id);
        } catch {}
      }
      const res = await api.get(`/chat/conversations/${c.id}/messages`);
      setMessages(Array.isArray(res.data?.items) ? res.data.items : []);
      try {
        await api.post(`/chat/conversations/${c.id}/read`);
      } catch {}
      setConvos((prev) =>
        Array.isArray(prev)
          ? prev.map((x) =>
              Number(x.id) === Number(c.id) ? { ...x, unread_count: 0 } : x,
            )
          : prev,
      );
      try {
        window.dispatchEvent(new Event("omni.chat.unread.refresh"));
      } catch {}
      try {
        await loadUnreadByUser();
      } catch {}
      try {
        localStorage.setItem("omni.chat.lastConversationId", String(c.id));
      } catch {}
    } catch {
      setMessages([]);
    }
  }

  useEffect(() => {
    (async () => {
      await loadConvos();
      try {
        const resUnread = await api.get("/chat/unread-by-user");
        const rows = Array.isArray(resUnread.data?.items)
          ? resUnread.data.items
          : [];
        const map = {};
        rows.forEach((r) => {
          map[Number(r.user_id)] = Number(r.unread || 0);
        });
        setUnreadByUser(map);
      } catch {
        setUnreadByUser({});
      }
      try {
        const res = await api.get("/chat/users");
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setAllUsers(items);
      } catch {
        setAllUsers([]);
      }
      try {
        const resProj = await api.get("/chat/projects");
        setProjects(Array.isArray(resProj.data?.items) ? resProj.data.items : []);
      } catch {
        setProjects([]);
      }
      try {
        const raw = localStorage.getItem("omni.chat.lastConversationId");
        const lastId = raw ? Number(raw) : null;
        if (lastId) {
          const res2 = await api.get("/chat/conversations");
          const list = Array.isArray(res2.data?.items) ? res2.data.items : [];
          setConvos(list);
          const found = list.find((c) => Number(c.id) === Number(lastId));
          if (found) openConversation(found);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load per-user background wallpaper (exclusive to this user)
  useEffect(() => {
    if (!myId) return;
    try {
      const userBg = localStorage.getItem(`omni.chat.bg_${myId}`);
      if (userBg) {
        setChatBg(userBg);
      } else {
        setChatBg(defaultChatBg);
      }
    } catch {
      setChatBg(defaultChatBg);
    }

    // Sync from server settings exclusive to this user in Neon PostgreSQL
    (async () => {
      try {
        const res = await api.get("/chat/settings");
        const serverBg = res.data?.background_url;
        if (serverBg) {
          setChatBg(serverBg);
          try {
            localStorage.setItem(`omni.chat.bg_${myId}`, serverBg);
          } catch {}
        } else {
          setChatBg(defaultChatBg);
          try {
            localStorage.removeItem(`omni.chat.bg_${myId}`);
          } catch {}
        }
      } catch {}
    })();
  }, [myId]);

  useEffect(() => {
    if (!socket) return;
    const onRecv = (m) => {
      if (active && Number(m.conversation_id) === Number(active.id)) {
        setMessages((prev) => {
          if (prev.some((msg) => Number(msg.id) === Number(m.id))) return prev;
          if (Number(m.sender_id) === Number(myId)) {
            const tmpIdx = prev.findIndex(
              (msg) =>
                String(msg.id).startsWith("tmp-") &&
                msg.content === m.content &&
                msg.message_type === m.message_type,
            );
            if (tmpIdx >= 0) {
              const next = [...prev];
              next[tmpIdx] = m;
              return next;
            }
          }
          return prev.concat(m);
        });
      }
      const senderId = Number(m?.sender_id || 0);
      if (Number.isFinite(senderId) && senderId === myId) {
        return;
      }
      loadConvos();
      (async () => {
        try {
          const resUnread = await api.get("/chat/unread-by-user");
          const rows = Array.isArray(resUnread.data?.items)
            ? resUnread.data.items
            : [];
          const map = {};
          rows.forEach((r) => {
            map[Number(r.user_id)] = Number(r.unread || 0);
          });
          setUnreadByUser(map);
        } catch {}
      })();
    };
    const onRead = ({ conversation_id, last_read_id, user_id }) => {
      if (!active || Number(conversation_id) !== Number(active.id)) return;
      if (Number(user_id) === Number(myId)) return;
      setMessages((prev) =>
        prev.map((msg) => {
          const mid = Number(msg.id);
          if (
            Number(msg.sender_id) === Number(myId) &&
            Number.isFinite(mid) &&
            mid <= Number(last_read_id || 0)
          ) {
            return { ...msg, status: "read" };
          }
          return msg;
        }),
      );
    };
    const onDelivered = ({ message_id }) => {
      setMessages((prev) =>
        prev.map((m) =>
          Number(m.id) === Number(message_id) &&
          Number(m.sender_id) === Number(myId) &&
          String(m.status) !== "read"
            ? { ...m, status: "delivered" }
            : m,
        ),
      );
    };
    const onTypingStart = ({ conversation_id, user_id }) => {
      if (!active || Number(conversation_id) !== Number(active.id)) return;
      if (Number(user_id) === myId) return;
      setTypingUsers((prev) => new Set(prev).add(user_id));
    };
    const onTypingStop = ({ conversation_id, user_id }) => {
      if (!active || Number(conversation_id) !== Number(active.id)) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(user_id);
        return next;
      });
    };
    const onGroupRefresh = () => {
      loadConvos();
    };
    socket.on("receive_message", onRecv);
    socket.on("typing_start", onTypingStart);
    socket.on("message_read", onRead);
    socket.on("message_delivered", onDelivered);
    socket.on("typing_stop", onTypingStop);
    socket.on("group_created", onGroupRefresh);
    socket.on("group_members_updated", onGroupRefresh);
    socket.on("group_left", onGroupRefresh);
    return () => {
      socket.off("receive_message", onRecv);
      socket.off("typing_start", onTypingStart);
      socket.off("message_read", onRead);
      socket.off("message_delivered", onDelivered);
      socket.off("typing_stop", onTypingStop);
      socket.off("group_created", onGroupRefresh);
      socket.off("group_members_updated", onGroupRefresh);
      socket.off("group_left", onGroupRefresh);
    };
  }, [socket, active, myId]);

  /**
   * Sends a text message to the active conversation.
   */
  async function sendText() {
    if (!active || !text.trim()) return;
    const content = text.trim();
    const optimistic = {
      id: `tmp-${Date.now()}`,
      conversation_id: active.id,
      sender_id: myId,
      message_type: "text",
      content,
      status: "sent",
      sent_at: new Date().toISOString(),
    };
    setMessages((prev) => prev.concat(optimistic));
    setText("");
    try {
      try {
        window.dispatchEvent(
          new CustomEvent("omni.chat.sent", {
            detail: { conversation_id: active.id, type: "text" },
          }),
        );
      } catch {}
      await api.post("/chat/messages", {
        conversation_id: active.id,
        content,
      });
    } catch {}
  }

  /**
   * Emits a typing event to the server.
   */
  function onTyping() {
    if (!socket || !active) return;
    socket.emit("typing_start", { conversation_id: active.id });
    const t = setTimeout(() => {
      socket.emit("typing_stop", { conversation_id: active.id });
    }, 1200);
    return () => clearTimeout(t);
  }

  /**
   * Handles selecting and uploading a new chat background image.
   * Saved per-user in Neon PostgreSQL and user-keyed localStorage so it is exclusive to this user only.
   * @param {Event} e - The file input change event.
   */
  async function chooseBackground(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/chat/upload", fd);
      const url = String(res.data?.url || res.data?.path || "");
      if (url) {
        setChatBg(url);
        try {
          if (myId) {
            localStorage.setItem(`omni.chat.bg_${myId}`, url);
          }
        } catch {}
        // Persist to user's exclusive settings in Neon PostgreSQL
        try {
          await api.post("/chat/settings", { background_url: url });
        } catch (saveErr) {
          console.warn("[Chat] Could not save background setting to server:", saveErr.message);
        }
      }
    } catch (err) {
      console.error("[Chat] Background upload failed:", err);
      alert(err.response?.data?.message || err.message || "Failed to upload wallpaper");
    }
    e.target.value = "";
  }

  /**
   * Restores chat wallpaper to default and clears custom user setting.
   */
  async function restoreDefaultBackground() {
    setChatBg(defaultChatBg);
    try {
      if (myId) {
        localStorage.removeItem(`omni.chat.bg_${myId}`);
      }
      localStorage.removeItem("omni.chat.bg");
    } catch {}
    try {
      await api.delete("/chat/settings/background");
    } catch (err) {
      console.warn("[Chat] Could not reset background on server:", err.message);
    }
  }

  const typing = useMemo(() => typingUsers.size > 0, [typingUsers]);

  /**
   * Searches for users to start a new chat with.
   */
  async function loadUsers() {
    try {
      const res = await api.get(
        `/chat/users?q=${encodeURIComponent(userSearch || "")}`,
      );
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setUserOptions(items);
    } catch {
      setUserOptions([]);
    }
  }

  useEffect(() => {
    if (pickerOpen) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen, userSearch]);

  useEffect(() => {
    if (!attachOpen) return;
    function onDocClick(e) {
      try {
        if (
          attachRootRef.current &&
          !attachRootRef.current.contains(e.target)
        ) {
          setAttachOpen(false);
        }
      } catch {}
    }
    function onEsc(e) {
      if (e.key === "Escape") setAttachOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [attachOpen]);

  const activePartner = useMemo(() => {
    if (!active) return null;
    if (active.otherUser) return active.otherUser;
    if (active.user_id) {
      const u = allUsers.find((x) => Number(x.id) === Number(active.user_id));
      if (u) return u;
    }
    if (active.title) {
      const u = allUsers.find(
        (x) =>
          x.username?.toLowerCase() === active.title?.toLowerCase() ||
          x.full_name?.toLowerCase() === active.title?.toLowerCase(),
      );
      if (u) return u;
    }
    return {
      username: active.title || `Chat #${active.id}`,
      full_name: active.title || `Chat #${active.id}`,
      profile_picture_url: null,
      is_online: false,
    };
  }, [active, allUsers]);

  /**
   * Shares current GPS coordinates as a location message.
   */
  async function handleShareLocation() {
    setAttachOpen(false);
    if (!active) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const payload = {
          lat: Number(pos.coords.latitude),
          lng: Number(pos.coords.longitude),
          label: "Shared location",
        };
        const content = JSON.stringify(payload);
        setMessages((prev) =>
          prev.concat({
            id: `tmp-${Date.now()}`,
            conversation_id: active.id,
            sender_id: myId,
            message_type: "location",
            content,
            status: "sent",
            sent_at: new Date().toISOString(),
          }),
        );
        try {
          await api.post("/chat/messages", {
            conversation_id: active.id,
            content,
            message_type: "location",
          });
          await loadConvos();
        } catch {}
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      },
    );
  }

  /**
   * Shares the current user's profile information as a contact message.
   */
  async function handleShareContact() {
    setAttachOpen(false);
    if (!active) return;
    const me = {
      name: user?.full_name || user?.username,
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
    };
    const content = JSON.stringify(me);
    setMessages((prev) =>
      prev.concat({
        id: `tmp-${Date.now()}`,
        conversation_id: active.id,
        sender_id: myId,
        message_type: "contact",
        content,
        status: "sent",
        sent_at: new Date().toISOString(),
      }),
    );
    try {
      await api.post("/chat/messages", {
        conversation_id: active.id,
        content,
        message_type: "contact",
      });
      await loadConvos();
    } catch {}
  }

  /**
   * Starts a direct chat with the specified user.
   * @param {Object} u - The target user object.
   */
  async function startDirectChat(u) {
    try {
      const res = await api.post("/chat/conversations/direct", {
        user_id: u.id,
      });
      const id = Number(res.data?.id || 0) || null;
      if (id) {
        setPickerOpen(false);
        await loadConvos();
        const c = {
          id,
          title: u.full_name || u.username,
          username: u.username,
          profile_picture_url: u.profile_picture_url,
          is_online: u.is_online,
          otherUser: u,
        };
        await openConversation(c);
      }
    } catch {}
  }

  /**
   * Uploads and sends a media file (image, video, audio, or document).
   * @param {File} file - The file to upload.
   */
  async function sendMedia(file) {
    if (!file || !active) return;
    const mime = (file.type || "").toLowerCase();
    const type = mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
        ? "video"
        : mime.startsWith("audio/")
          ? "audio"
          : "document";
    setUploading(true);
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      // Note: Do not set Content-Type header manually; Axios will compute it with the correct multipart boundary
      const res = await api.post("/chat/upload", form, {
        onUploadProgress: (e) => {
          if (!e || !e.total) return;
          const pct = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(pct);
        },
      });
      const url = res.data?.url || res.data?.path;
      if (!url) {
        throw new Error(res.data?.message || "Upload did not return a valid URL");
      }
      const file_name = res.data?.file_name || file.name;
      const file_size = res.data?.file_size || file.size;
      // optimistic bubble
      setMessages((prev) =>
        prev.concat({
          id: `tmp-${Date.now()}`,
          conversation_id: active.id,
          sender_id: myId,
          message_type: type,
          content: url,
          file_name,
          file_size,
          status: "sent",
          sent_at: new Date().toISOString(),
        }),
      );
      try {
        window.dispatchEvent(
          new CustomEvent("omni.chat.sent", {
            detail: { conversation_id: active.id, type },
          }),
        );
      } catch {}
      await api.post("/chat/messages", {
        conversation_id: active.id,
        content: url,
        message_type: type,
        file_name,
        file_size,
      });
      await loadConvos();
    } catch (err) {
      console.error("[Chat] Upload or send failed:", err);
      alert(err.response?.data?.message || err.message || "Failed to send attachment");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div data-floating-ignore="true" className="fixed right-4 bottom-20 md:right-6 md:bottom-20 z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-[920px] max-w-[96vw] h-[580px] max-h-[90vh] rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden flex text-slate-800 dark:text-slate-100">
        <div className={(sidebarOpen ? "" : "hidden ") + "md:block h-full"}>
          <ConversationList
            items={convos}
            activeId={active?.id}
            onOpen={openConversation}
            users={allUsers}
            onStart={startDirectChat}
            unreadByUser={unreadByUser}
            onCloseSidebar={() => setSidebarOpen(false)}
            onOpenCreateGroup={() => setCreateGroupOpen(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
          {/* Header */}
          <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between z-10 shadow-2xs shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {!sidebarOpen && (
                <button
                  type="button"
                  className="md:hidden p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  onClick={() => setSidebarOpen(true)}
                  title="Open contacts"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {active?.is_group ? (
                <div
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setGroupInfoOpen(true)}
                  title="Click to view Group Info & Members"
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shadow-xs">
                      <FolderKanban size={17} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] ring-2 ring-white dark:ring-slate-900 font-bold">
                      G
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[220px]">
                        {active.title}
                      </span>
                      {active.project_code && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shrink-0">
                          {active.project_code}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                      <span>{active.member_count || 1} participants</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Group Info</span>
                    </div>
                  </div>
                </div>
              ) : activePartner ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={activePartner.profile_picture_url || "/default-avatar.png"}
                      alt={activePartner.username || "User"}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    {activePartner.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[240px]">
                      {activePartner.full_name || activePartner.username || active.title || `Chat #${active.id}`}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      {typing ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                          typing...
                        </span>
                      ) : activePartner.is_online ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Active now
                        </span>
                      ) : (
                        <span>Offline</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {active ? active.title || `Conversation #${active.id}` : "Messages"}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {active?.is_group && (
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Group Info & Participants"
                  onClick={() => setGroupInfoOpen(true)}
                >
                  <Info size={18} />
                </button>
              )}
              <button
                type="button"
                className="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Change Wallpaper (Image covers chat window)"
                onClick={() => bgFileRef.current?.click()}
              >
                <ImageIcon size={18} />
              </button>
              {chatBg && chatBg !== defaultChatBg && (
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
                  title="Remove Custom Wallpaper (Restore Default)"
                  onClick={restoreDefaultBackground}
                >
                  <RotateCcw size={17} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          {!active ? (
            <div
              className="flex-1 chat-bg flex flex-col items-center justify-center p-6 text-center"
              style={{
                backgroundImage: `url('${chatBg || defaultChatBg}')`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3 shadow-sm">
                <Send size={24} />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1">
                OmniSuite Live Chat
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                Select a colleague from the list or start a new direct conversation.
              </p>
              <button
                type="button"
                className="btn btn-primary text-xs px-4 py-2 font-bold inline-flex items-center gap-1.5 shadow-sm rounded-xl cursor-pointer"
                onClick={() => setPickerOpen(true)}
              >
                <Plus size={14} /> New Conversation
              </button>
            </div>
          ) : (
            <MessageList items={messages} myId={myId} bgUrl={chatBg || defaultChatBg} isGroup={Boolean(active?.is_group)} />
          )}

          {/* Input Bar */}
          <div className="p-2.5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/90 dark:border-slate-800 flex items-center gap-2 relative shrink-0">
            {active ? (
              <>
                <div className="relative" ref={attachRootRef}>
                  <button
                    type="button"
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      attachOpen
                        ? "bg-brand-600 text-white shadow-md rotate-45"
                        : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-2xs"
                    }`}
                    title="Attach File"
                    onClick={() => setAttachOpen((v) => !v)}
                  >
                    <Paperclip size={18} />
                  </button>

                  {/* Modern WhatsApp-Style Attachment Popover */}
                  {attachOpen && (
                    <div
                      className="absolute bottom-full left-0 mb-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 py-1 mb-1">
                        Share Attachment
                      </div>

                      {/* Option 1: Photos & Videos */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
                        onClick={() => {
                          setAttachOpen(false);
                          fileMediaRef.current?.click();
                        }}
                      >
                        <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                          <ImageIcon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                            Photos & Videos
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Images, clips</div>
                        </div>
                      </button>

                      {/* Option 2: Document */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
                        onClick={() => {
                          setAttachOpen(false);
                          fileDocRef.current?.click();
                        }}
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                            Document
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">PDF, Word, Excel, Zip</div>
                        </div>
                      </button>

                      {/* Option 3: Audio */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
                        onClick={() => {
                          setAttachOpen(false);
                          fileAudioRef.current?.click();
                        }}
                      >
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                          <Music size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                            Audio
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Audio recordings</div>
                        </div>
                      </button>

                      {/* Option 4: Location */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
                        onClick={handleShareLocation}
                      >
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                          <MapPin size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                            Location
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Share GPS location</div>
                        </div>
                      </button>

                      {/* Option 5: Contact */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
                        onClick={handleShareContact}
                      >
                        <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                          <UserIcon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                            Contact
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Share your contact</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <input
                  ref={fileMediaRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) sendMedia(f);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={bgFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={chooseBackground}
                />
                <input
                  ref={fileAudioRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) sendMedia(f);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={fileDocRef}
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) sendMedia(f);
                    e.target.value = "";
                  }}
                />

                {uploading && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 rounded-full text-xs font-semibold animate-pulse shrink-0">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Uploading {uploadProgress}%</span>
                  </div>
                )}

                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendText();
                    else onTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-2xs transition-all"
                />

                <button
                  type="button"
                  disabled={!text.trim()}
                  className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-sm shrink-0 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  onClick={sendText}
                  title="Send message"
                >
                  <Send size={16} className="-mr-0.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary text-xs w-full py-2 cursor-pointer"
                onClick={() => setPickerOpen(true)}
              >
                Start New Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recipient Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 w-[480px] max-w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Select Recipient</span>
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                onClick={() => setPickerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  placeholder="Search users by name or username..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
              {userOptions.map((u) => (
                <button
                  key={u.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                  onClick={() => startDirectChat(u)}
                >
                  <div className="relative shrink-0">
                    <img
                      src={u.profile_picture_url || "/default-avatar.png"}
                      alt={u.username}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    {u.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {u.full_name || u.username}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      @{u.username} {u.is_online ? "• Online" : ""}
                    </div>
                  </div>
                </button>
              ))}
              {!userOptions.length && (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No users found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Create Project Group Modal */}
      <CreateGroupModal
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        projects={projects}
        users={allUsers.filter((u) => Number(u.id) !== Number(myId))}
        onCreated={(newGroup) => {
          loadConvos();
          if (newGroup) openConversation(newGroup);
        }}
      />

      {/* WhatsApp-Style Group Info & Members Drawer/Modal */}
      <GroupInfoModal
        open={groupInfoOpen}
        onClose={() => setGroupInfoOpen(false)}
        group={active?.is_group ? active : null}
        myId={myId}
        allUsers={allUsers.filter((u) => Number(u.id) !== Number(myId))}
        onMembersUpdated={() => {
          loadConvos();
        }}
        onLeaveGroup={() => {
          setActive(null);
          loadConvos();
        }}
      />
    </div>
  );
}
