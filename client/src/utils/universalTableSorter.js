/**
 * @fileoverview Universal Table Sorter Utility
 * Ensures all tables across the application have interactive sorting capability
 * and visible sort indicators, working seamlessly alongside React-managed SortableHeader components.
 */

const SKIP_COLUMN_PATTERNS = /^(actions?|options?|select|#|sr\.?\s*no\.?|icon|checkbox)$/i;

/**
 * Checks if a <th> header should be excluded from universal sorting.
 * @param {HTMLTableCellElement} th
 * @returns {boolean}
 */
function shouldSkipTh(th) {
  if (!th) return true;
  if (th.getAttribute("data-sortable-react") === "true") return true;
  if (th.classList.contains("no-sort")) return true;
  if (th.querySelector("button") || th.querySelector("input")) return true;

  const text = (th.textContent || "").trim();
  if (!text && !th.children.length) return true;
  if (SKIP_COLUMN_PATTERNS.test(text)) return true;

  return false;
}

/**
 * Extracts a comparable value from a table cell.
 * @param {HTMLTableCellElement} td
 * @returns {number|Date|string}
 */
function extractCellValue(td) {
  if (!td) return "";
  const rawText = (td.textContent || "").trim();

  // Try parsing numeric (handling currency symbols GH₵, $, €, £, commas, % etc.)
  const cleanNumText = rawText.replace(/[GH₵$€£¥,%\s]/gi, "");
  if (cleanNumText !== "" && !isNaN(cleanNumText)) {
    const num = parseFloat(cleanNumText);
    if (!isNaN(num)) return num;
  }

  // Try parsing date (e.g. 7/24/2026, 2026-11-23, 24-07-2026)
  if (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(rawText) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(rawText)
  ) {
    const parsedDate = Date.parse(rawText);
    if (!isNaN(parsedDate)) return parsedDate;
  }

  return rawText.toLowerCase();
}

/**
 * Decorates static table headers with interactive universal sorter cues.
 * @param {Document|HTMLElement} root
 */
export function scanAndEnhanceTables(root = document) {
  try {
    const tables = root.querySelectorAll("table");
    tables.forEach((table) => {
      // Find the primary thead or the first row containing th
      const thList = table.querySelectorAll("thead th, tr:first-child th");
      thList.forEach((th) => {
        if (shouldSkipTh(th)) return;

        th.setAttribute("data-sortable-universal", "true");
        if (!th.classList.contains("universal-sort-th")) {
          th.classList.add("universal-sort-th");
        }
        if (!th.hasAttribute("title")) {
          const colName = (th.textContent || "").trim();
          th.setAttribute("title", `Sort by ${colName || "column"}`);
        }

        // Add visible sort indicator icon if not present
        if (!th.querySelector(".universal-sort-indicator")) {
          const indicator = document.createElement("span");
          indicator.className = "universal-sort-indicator";
          indicator.setAttribute("aria-hidden", "true");
          indicator.textContent = "⇅";
          th.appendChild(indicator);
        }
      });
    });
  } catch (err) {
    // Non-fatal enhancement error
    console.debug("[UniversalTableSorter] Enhancement scan skipped:", err);
  }
}

/**
 * Handles sorting when a universal table header cell is clicked.
 * @param {HTMLTableCellElement} th
 */
function handleUniversalSort(th) {
  const table = th.closest("table");
  if (!table) return;

  const tbody = table.querySelector("tbody") || table;
  const rows = Array.from(tbody.querySelectorAll(":scope > tr")).filter(
    (tr) => !tr.closest("thead") && !tr.classList.contains("no-sort-row")
  );

  if (rows.length <= 1) return;

  const colIndex = Array.from(th.parentNode.children).indexOf(th);
  if (colIndex < 0) return;

  const currentDir = th.getAttribute("data-sort-dir");
  const newDir = currentDir === "asc" ? "desc" : "asc";

  // Reset sibling th elements
  const allHeaders = th.parentNode.querySelectorAll("th");
  allHeaders.forEach((otherTh) => {
    otherTh.removeAttribute("data-sort-dir");
    const indicator = otherTh.querySelector(".universal-sort-indicator");
    if (indicator) {
      indicator.textContent = "⇅";
      indicator.classList.remove("active");
    }
  });

  // Set new direction on target header
  th.setAttribute("data-sort-dir", newDir);
  const targetIndicator = th.querySelector(".universal-sort-indicator");
  if (targetIndicator) {
    targetIndicator.textContent = newDir === "asc" ? "▲" : "▼";
    targetIndicator.classList.add("active");
  }

  // Sort rows
  rows.sort((rowA, rowB) => {
    const cellA = rowA.children[colIndex];
    const cellB = rowB.children[colIndex];

    const valA = extractCellValue(cellA);
    const valB = extractCellValue(cellB);

    if (valA === valB) return 0;
    if (valA === "" || valA === null || valA === undefined) return 1;
    if (valB === "" || valB === null || valB === undefined) return -1;

    let comp = 0;
    if (typeof valA === "number" && typeof valB === "number") {
      comp = valA - valB;
    } else {
      comp = String(valA).localeCompare(String(valB), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    return newDir === "asc" ? comp : -comp;
  });

  // Re-append sorted rows to tbody
  rows.forEach((row) => tbody.appendChild(row));
}

/**
 * Initializes the universal table sorter across the entire application.
 */
let isInitialized = false;

export function initUniversalTableSorter() {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  // Delegated click handler on document
  document.addEventListener("click", (e) => {
    // If click happened inside a button or explicit React sortable header, let React manage it
    if (e.target.closest("button") || e.target.closest("[data-sortable-react]")) {
      return;
    }

    const th = e.target.closest("th");
    if (!th) return;

    if (th.getAttribute("data-sortable-universal") === "true") {
      e.preventDefault();
      handleUniversalSort(th);
    }
  });

  // Initial scan
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scanAndEnhanceTables());
  } else {
    scanAndEnhanceTables();
  }

  // Observer to decorate newly mounted tables
  let debounceTimeout = null;
  const observer = new MutationObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      scanAndEnhanceTables();
    }, 250);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
