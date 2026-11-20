import os

path = r"c:\Users\stanl\OneDrive\Documents\Stanness Technologies\infracore\client\src\pages\modules\project-management\tasks\TaskAssignmentKanban.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = "                              </h4>"

replacement = """                              </h4>

                              {/* Target & Actual Schedule Badges */}
                              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1">
                                {(task.start_date || task.end_date) && (
                                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                    <Calendar size={10} className="text-sky-500 shrink-0" />
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">Target:</span>
                                    <span className="truncate">
                                      {task.start_date ? String(task.start_date).split("T")[0] : "—"} → {task.end_date ? String(task.end_date).split("T")[0] : "—"}
                                    </span>
                                  </div>
                                )}
                                {(task.actual_start_date || task.actual_end_date) ? (
                                  <div className="flex items-center gap-1 text-[10px]">
                                    <Clock size={10} className={task.actual_end_date ? "text-emerald-500 shrink-0" : "text-blue-500 shrink-0"} />
                                    <span className={`font-semibold ${task.actual_end_date ? "text-emerald-700 dark:text-emerald-400" : "text-blue-700 dark:text-blue-400"}`}>Actual:</span>
                                    <span className="truncate text-slate-600 dark:text-slate-300">
                                      {task.actual_start_date ? new Date(task.actual_start_date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }) : "—"}
                                      {" → "}
                                      {task.actual_end_date ? new Date(task.actual_end_date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }) : "In Prog"}
                                    </span>
                                  </div>
                                ) : null}
                              </div>"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
