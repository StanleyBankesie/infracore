/**
 * @fileoverview ServiceBillForm component for Project Management module.
 * Provides functionality for preparing, reviewing, certifying, and saving Subcontractor Service Bills.
 * Uses the same pur_service_bills and pur_service_bill_details tables and endpoints as the purchase module.
 */

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import TaxPricingModal, { TaxModeRadioSelector } from "@/components/common/TaxPricingModal.jsx";
import { usePermission } from "../../../../auth/PermissionContext.jsx";
import { filterByPrefix } from "@/utils/searchUtils.js";
import { toast } from "react-toastify";
import { Printer, Download, Plus, Trash2, ArrowLeft, CheckCircle2, Briefcase } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import defaultLogo from "../../../../assets/resources/OMNISUITE_LOGO_FILL.png";

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    paid: { label: "✓ PAID", cls: "bg-green-100 text-green-700 border-green-200" },
    posted: { label: "✓ POSTED", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    overdue: { label: "⚠ OVERDUE", cls: "bg-red-100 text-red-700 border-red-200" },
    pending: { label: "⏳ PENDING", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    completed: { label: "✓ COMPLETED", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };
  const d = map[s] || map.pending;
  return <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-md border ${d.cls}`}>{d.label}</span>;
}

function PaymentBadge({ payment }) {
  const p = String(payment || "").toLowerCase();
  const map = {
    paid: { label: "Paid", cls: "bg-green-100 text-green-700 border-green-200" },
    unpaid: { label: "Unpaid", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    partial: { label: "Partial", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  };
  const d = map[p] || map.unpaid;
  return <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-md border ${d.cls}`}>{d.label}</span>;
}

export default function ServiceBillForm() {
  const { hasExceptional } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id && id !== "new");
  const { getExchangeRate } = useExchangeRate();
  const readOnly =
    String(new URLSearchParams(location.search).get("mode") || "").toLowerCase() === "view";
  const disabledClass = readOnly
    ? "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 cursor-not-allowed font-medium"
    : "";
  const successMsg = location.state?.success || "";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pdfRef = useRef(null);

  const [bill, setBill] = useState({
    bill_no: "",
    status: "",
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    service_date: "",
    supplier_id: "",
    project_id: "",
    relatedExecId: "",
    currency_id: "",
    exchange_rate: 1,
    payment_terms: 30,
    payment_status: "UNPAID",
    freight_charges: 0,
    other_charges: 0,
    payment_method: "bank",
    payment_reference: "",
    notes: "",
    cost_center_id: "",
    tax_mode: "EXCLUSIVE",
  });

  const [lines, setLines] = useState([]);
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState(null);
  const [showTaxModeAlert, setShowTaxModeAlert] = useState(false);
  const [hasPromptedTaxMode, setHasPromptedTaxMode] = useState(false);
  const [newItem, setNewItem] = useState({
    item_id: "",
    category: "",
    qty: 1,
    rate: 0,
    discount_percent: 0,
    tax_code_id: "",
    tax_mode: "EXCLUSIVE",
    tax_component_name: "",
  });

  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [confirmedServices, setConfirmedServices] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [finCurrencies, setFinCurrencies] = useState([]);
  const [taxCodes, setTaxCodes] = useState([]);
  const [taxComponentsByCode, setTaxComponentsByCode] = useState({});
  const [costCenters, setCostCenters] = useState([]);
  const [companyInfo, setCompanyInfo] = useState({
    name: "OmniSuite ERP",
    address: "Stanness Technologies HQ, Accra, Ghana",
    phone: "+233 (0) 30 200 0000",
    email: "service@omnisuite.com",
    taxId: "C0012398471",
  });

  const baseCurrencyCode = useMemo(() => {
    return finCurrencies.find((c) => Number(c.is_base) === 1 || c.is_base === true)?.code || "GHS";
  }, [finCurrencies]);

  const selectedCurrencyCode = useMemo(() => {
    return finCurrencies.find((c) => String(c.id) === String(bill.currency_id))?.code || "";
  }, [finCurrencies, bill.currency_id]);

  const update = (field, value) => setBill((prev) => ({ ...prev, [field]: value }));

  const toYmd = (v) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    } catch {}
    return typeof v === "string" ? v.slice(0, 10) : "";
  };

  const fetchTaxComponentsForCode = async (taxCodeId) => {
    const key = String(taxCodeId || "");
    if (!key) return;
    try {
      const resp = await api.get(`/finance/tax-codes/${taxCodeId}/components`);
      const items = Array.isArray(resp.data?.items) ? resp.data.items : [];
      setTaxComponentsByCode((prev) => ({ ...prev, [key]: items }));
    } catch {}
  };

  useEffect(() => {
    const uniqueTaxIds = Array.from(
      new Set([
        ...lines.map((l) => String(l.tax_code_id)).filter(Boolean),
        newItem.tax_code_id ? String(newItem.tax_code_id) : null,
      ].filter(Boolean))
    );
    uniqueTaxIds.forEach((id) => {
      if (!taxComponentsByCode[id]) {
        fetchTaxComponentsForCode(id);
      }
    });
  }, [lines, newItem.tax_code_id]);

  const calcNewItemTaxBreakdown = () => {
    const qty = Number(newItem.qty) || 0;
    const rate = Number(newItem.rate) || 0;
    const gross = qty * rate;
    const discount = gross * ((Number(newItem.discount_percent) || 0) / 100);
    const taxable = gross - discount;

    const effectiveMode = String(newItem.tax_mode || bill.tax_mode || "").toUpperCase();
    const isInclusive = effectiveMode === "INCLUSIVE";
    let taxTotal = 0;
    let netTaxable = taxable;

    const fallbackRate = bill.tax_rate !== undefined && bill.tax_rate !== null ? Number(bill.tax_rate) : 0;
    const tc = taxCodes.find((t) => String(t.id) === String(newItem.tax_code_id || bill.tax_code_id));
    const tcRate =
      newItem.tax_rate !== undefined && newItem.tax_rate !== null && Number(newItem.tax_rate) > 0
        ? Number(newItem.tax_rate)
        : tc
          ? Number(tc.rate_percent) || 0
          : fallbackRate;

    if (isInclusive && tcRate > 0) {
      netTaxable = taxable / (1 + tcRate / 100);
      taxTotal = Math.round((taxable - netTaxable) * 100) / 100;
    } else if (!isInclusive && tcRate > 0) {
      taxTotal = Math.round(((taxable * tcRate) / 100) * 100) / 100;
    }

    return { taxTotal, taxableTotal: netTaxable, grossTotal: taxable };
  };

  const handleNewItemFieldChange = (field, value) => {
    setNewItem((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "item_id") {
        const item = serviceItems.find((x) => String(x.id) === String(value));
        if (item) {
          next.rate = item.cost_price || 0;
          next.desc = item.item_name;
        }
        api
          .get(`/inventory/items/${value}/tax`)
          .then((res) => {
            const tax = res.data?.tax;
            if (tax && tax.id) {
              setNewItem((p) => (p.item_id === value ? { ...p, tax_code_id: String(tax.id) } : p));
            }
          })
          .catch(() => {});
      }
      return next;
    });
  };

  const addItemToLines = () => {
    if (!newItem.item_id || !newItem.qty) {
      toast.warn("Please select a service item and enter quantity");
      return;
    }
    const { taxTotal, taxableTotal } = calcNewItemTaxBreakdown();
    const it = serviceItems.find((x) => String(x.id) === String(newItem.item_id));

    setLines((prev) => [
      ...prev,
      {
        ...newItem,
        id: Date.now(),
        item_name: it?.item_name || newItem.desc || "",
        item_code: it?.item_code || "",
        tax_amount: taxTotal,
        line_total: taxableTotal + taxTotal,
      },
    ]);

    setNewItem({ item_id: "", category: "", qty: 1, rate: 0, discount_percent: 0, tax_code_id: "" });
    setItemQuery("");
  };

  const removeRow = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const recalcLine = (line) => {
    const qty = Number(line.qty) || 0;
    const rate = Number(line.rate) || 0;
    const discountPercent = Number(line.discount_percent) || 0;
    const gross = qty * rate;
    const discount = gross * (discountPercent / 100);
    const taxable = gross - discount;

    const effectiveMode = String(line.tax_mode || bill.tax_mode || "").toUpperCase();
    const isInclusive = effectiveMode === "INCLUSIVE";
    let taxAmount = 0;
    const fallbackRate = bill.tax_rate !== undefined && bill.tax_rate !== null ? Number(bill.tax_rate) : 0;
    const tc = taxCodes.find((t) => String(t.id) === String(line.tax_code_id || bill.tax_code_id));
    const tcRate =
      line.tax_rate !== undefined && line.tax_rate !== null && Number(line.tax_rate) > 0
        ? Number(line.tax_rate)
        : tc
          ? Number(tc.rate_percent) || 0
          : fallbackRate;

    if (isInclusive && tcRate > 0) {
      const net = taxable / (1 + tcRate / 100);
      taxAmount = Math.round((taxable - net) * 100) / 100;
      return {
        ...line,
        tax_amount: taxAmount,
        line_total: taxable,
        amount: taxable,
      };
    } else if (!isInclusive && tcRate > 0) {
      taxAmount = Math.round(((taxable * tcRate) / 100) * 100) / 100;
      return {
        ...line,
        tax_amount: taxAmount,
        line_total: taxable + taxAmount,
        amount: taxable,
      };
    }

    return {
      ...line,
      tax_amount: 0,
      line_total: taxable,
      amount: taxable,
    };
  };

  const handleLineChange = (lineId, field, value) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        let next = { ...l, [field]: value };
        return recalcLine(next);
      })
    );
  };

  const totals = useMemo(() => {
    let grossSub = 0;
    let itemDiscounts = 0;
    const compTotals = {};
    const isInclusive = String(bill.tax_mode || "").toUpperCase() === "INCLUSIVE";

    for (const r of lines) {
      const qty = Number(r.qty || 0);
      const rate = Number(r.rate || 0);
      const base = qty * rate;
      grossSub += base;
      const discPct = Number(r.discount_percent || 0);
      const discountAmt = base * (discPct / 100);
      itemDiscounts += discountAmt;

      const isLineIncl = String(r.tax_mode || bill.tax_mode || "").toUpperCase() === "INCLUSIVE";
      const amt = Number(r.tax_amount || 0);
      if (amt > 0) {
        const tc = taxCodes.find((t) => String(t.id) === String(r.tax_code_id || bill.tax_code_id));
        const name =
          r.tax_component_name ||
          bill.tax_component_name ||
          tc?.name ||
          (r.tax_rate ? `Tax (${r.tax_rate}%)` : isLineIncl ? "Tax (Inclusive)" : "Tax (Exclusive)");
        if (!compTotals[name])
          compTotals[name] = {
            amount: 0,
            rate: Number(r.tax_rate !== undefined ? r.tax_rate : bill.tax_rate || 0),
          };
        compTotals[name].amount += amt;
      }
    }

    const compArray = Object.keys(compTotals).map((k) => ({
      name: k,
      amount: Math.round(compTotals[k].amount * 100) / 100,
      rate: compTotals[k].rate,
    }));
    const taxTotal = lines.reduce((s, r) => s + Number(r.tax_amount || 0), 0);
    if (compArray.length === 0 && taxTotal > 0) {
      const tc = taxCodes.find((t) => String(t.id) === String(bill.tax_code_id));
      const rate = bill.tax_rate !== undefined ? bill.tax_rate : tc?.rate_percent || 0;
      compArray.push({
        name: bill.tax_component_name || tc?.name || (rate ? `Tax (${rate}%)` : "Tax"),
        amount: Math.round(taxTotal * 100) / 100,
        rate,
      });
    }
    const other = Number(bill.other_charges || 0);

    const subtotal = isInclusive ? Math.max(0, grossSub - taxTotal) : grossSub;
    const grand = isInclusive
      ? grossSub - itemDiscounts + other
      : subtotal - itemDiscounts + taxTotal + other;

    return {
      grossSub,
      subtotal,
      discountAmount: itemDiscounts,
      taxAmount: taxTotal,
      other,
      total: grand,
      components: compArray,
    };
  }, [
    lines,
    bill.tax_mode,
    bill.tax_code_id,
    bill.tax_rate,
    bill.tax_component_name,
    bill.other_charges,
    taxComponentsByCode,
    taxCodes,
  ]);

  // Load Lookups
  useEffect(() => {
    let mounted = true;
    async function loadLookups() {
      try {
        const [supRes, projRes, soRes, currRes, itemsRes, taxesRes, ccRes, compRes] =
          await Promise.all([
            api.get("/purchase/suppliers?contractor=Y").catch(() => ({ data: { items: [] } })),
            api.get("/projects/projects", { params: { active: "all" } }).catch(() => ({ data: { items: [] } })),
            api.get("/service-orders?status=DONE").catch(() => ({ data: { orders: [] } })),
            api.get("/finance/currencies").catch(() => ({ data: { items: [] } })),
            api.get("/inventory/items?type=service").catch(() => ({ data: { items: [] } })),
            api.get("/finance/tax-codes?form=SERVICE_BILL").catch(() => ({ data: { items: [] } })),
            api.get("/finance/cost-centers").catch(() => ({ data: { items: [] } })),
            api.get("/company/profile").catch(() => ({ data: {} })),
          ]);

        if (!mounted) return;
        const sups = supRes.data?.data?.items || supRes.data?.items || [];
        setSuppliers(sups);

        const prjs = projRes.data?.data?.items || projRes.data?.items || [];
        setProjects(prjs);

        const orders = soRes.data?.orders || soRes.data?.items || [];
        setConfirmedServices(orders);

        const currs = Array.isArray(currRes.data?.items) ? currRes.data.items : [];
        setFinCurrencies(currs);

        const items = Array.isArray(itemsRes.data?.items) ? itemsRes.data.items : [];
        setServiceItems(
          items.map((x) => ({
            id: x.id,
            item_name: x.item_name,
            item_code: x.item_code,
            cost_price: x.cost_price,
          }))
        );

        setTaxCodes(Array.isArray(taxesRes.data?.items) ? taxesRes.data.items : []);
        setCostCenters(
          Array.isArray(ccRes.data?.items)
            ? ccRes.data.items
            : Array.isArray(ccRes.data?.data?.items)
              ? ccRes.data.data.items
              : []
        );

        if (compRes.data && compRes.data.company_name) {
          setCompanyInfo({
            name: compRes.data.company_name,
            address: compRes.data.address || "Accra, Ghana",
            phone: compRes.data.phone || "",
            email: compRes.data.email || "",
            taxId: compRes.data.tax_id || "",
          });
        }
      } catch {}
    }
    loadLookups();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch Next Bill Number
  useEffect(() => {
    let mounted = true;
    if (isEdit) return;
    async function getNextBillNo() {
      try {
        const res = await api.get("/purchase/service-bills/next-no");
        const s = res.data?.nextNo;
        const n = Number(String(s || "").replace(/\D/g, "")) || 1;
        if (!mounted) return;
        setBill((p) => (p.bill_no ? p : { ...p, bill_no: `SVB-${String(n).padStart(6, "0")}` }));
      } catch {
        if (!mounted) return;
        setBill((p) => (p.bill_no ? p : { ...p, bill_no: `SVB-${String(1).padStart(6, "0")}` }));
      }
    }
    getNextBillNo();
    return () => {
      mounted = false;
    };
  }, [isEdit]);

  // Exchange Rate
  useEffect(() => {
    if (!bill.currency_id || finCurrencies.length === 0) return;
    const selected = finCurrencies.find((c) => String(c.id) === String(bill.currency_id));
    const base = finCurrencies.find((c) => Number(c.is_base) === 1 || c.is_base === true);
    if (!selected || !base) return;

    if (selected.code === base.code) {
      if (bill.exchange_rate !== 1) setBill((p) => ({ ...p, exchange_rate: 1 }));
      return;
    }

    getExchangeRate(selected.code, base.code).then((rate) => {
      if (rate && bill.exchange_rate !== rate) setBill((p) => ({ ...p, exchange_rate: rate }));
    });
  }, [bill.currency_id, finCurrencies]);

  // Pre-fill from navigation state (e.g. from Subcontractor IPC "Raise Bill")
  useEffect(() => {
    if (isEdit || !location.state) return;
    const s = location.state;
    if (s.supplier_id || s.project_id) {
      setBill((p) => ({
        ...p,
        supplier_id: s.supplier_id ? String(s.supplier_id) : p.supplier_id,
        project_id: s.project_id ? String(s.project_id) : p.project_id,
        notes: s.notes || p.notes,
        payment_reference: s.payment_reference || p.payment_reference,
      }));
    }
    if (s.net_payable && Number(s.net_payable) > 0) {
      setLines((existing) => {
        if (existing.length > 0) return existing;
        return [
          {
            id: Date.now(),
            desc: s.description || `Subcontract Works - ${s.payment_reference || "IPC"}`,
            item_name: s.description || `Subcontract Works - ${s.payment_reference || "IPC"}`,
            qty: 1,
            rate: Number(s.net_payable),
            amount: Number(s.net_payable),
            line_total: Number(s.net_payable),
            tax_amount: 0,
            discount_percent: 0,
          },
        ];
      });
    }
  }, [location.state, isEdit]);

  // Load Existing
  useEffect(() => {
    let mounted = true;
    async function loadExisting() {
      if (!id || id === "new") return;
      try {
        setLoading(true);
        const res = await api.get(`/purchase/service-bills/${id}`);
        const item = res.data?.item || {};
        const details = Array.isArray(res.data?.details) ? res.data.details : [];
        if (!mounted) return;

        setBill({
          bill_no: item.bill_no || "",
          status: item.status || "",
          bill_date: toYmd(item.bill_date),
          due_date: toYmd(item.due_date),
          service_date: toYmd(item.service_date),
          supplier_id: item.supplier_id ? String(item.supplier_id) : "",
          project_id: item.project_id ? String(item.project_id) : "",
          relatedExecId: item.order_id ? String(item.order_id) : "",
          currency_id: item.currency_id ? Number(item.currency_id) : "",
          exchange_rate: Number(item.exchange_rate) || 1,
          payment_terms: item.payment_terms || "",
          payment_status: item.payment_status || "UNPAID",
          freight_charges: Number(item.freight_charges) || 0,
          other_charges: Number(item.other_charges) || 0,
          payment_method: item.payment_method || "",
          payment_reference: item.payment_reference || "",
          notes: item.notes || "",
          cost_center_id: item.cost_center_id ? Number(item.cost_center_id) : "",
          tax_mode: item.tax_mode || "EXCLUSIVE",
        });

        setLines(
          details.map((d, idx) => ({
            id: d.id || Date.now() + idx,
            item_id: d.item_id ? String(d.item_id) : "",
            item_name: d.description || "",
            desc: d.description || "",
            category: d.category || "",
            qty: Number(d.qty) || 0,
            rate: Number(d.rate) || 0,
            amount: Number(d.amount) || 0,
            discount_percent: Number(d.discount_percent) || 0,
            tax_code_id: d.tax_code_id ? String(d.tax_code_id) : "",
            tax_amount: Number(d.tax_amount) || 0,
            line_total: Number(d.line_total) || Number(d.amount) || 0,
          }))
        );
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load service bill");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadExisting();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate("/project-management/service-bills");
    }
  };

  const saveBill = async (e) => {
    e.preventDefault();
    if (!bill.supplier_id) {
      toast.error("Please select a subcontractor or service supplier");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one service line item to this bill");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...bill,
        project_id: bill.project_id ? Number(bill.project_id) : null,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
        details: lines.map((l) => ({
          item_id: l.item_id ? Number(l.item_id) : null,
          description: l.item_name || l.desc || "",
          category: l.category || "",
          qty: l.qty,
          rate: l.rate,
          discount_percent: l.discount_percent || 0,
          tax_code_id: l.tax_code_id || null,
          tax_amount: l.tax_amount || 0,
          amount: l.line_total,
        })),
      };

      if (isEdit) {
        await api.put(`/purchase/service-bills/${id}`, payload);
        toast.success("Subcontractor service bill updated successfully");
      } else {
        await api.post("/purchase/service-bills", payload);
        toast.success("Subcontractor service bill created successfully");
      }

      navigate("/project-management/service-bills", {
        state: { success: `Subcontractor Service Bill ${bill.bill_no} saved successfully.` },
      });
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save service bill";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    const el = pdfRef.current;
    if (!el) return;
    const original = el.style.cssText;
    el.style.cssText =
      original +
      ";position:fixed;left:-10000px;top:0;display:block;z-index:-1;background:white;width:794px;padding:32px;";
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let rendered = 0;
      while (rendered < imgHeight) {
        pdf.addImage(imgData, "PNG", 0, -rendered, imgWidth, imgHeight);
        rendered += pageHeight;
        if (rendered < imgHeight) pdf.addPage();
      }
      const fname = `Subcontract_Bill_${bill.bill_no || "Draft"}.pdf`;
      pdf.save(fname);
    } catch (err) {
      toast.error("Failed to generate PDF");
    } finally {
      el.style.cssText = original;
    }
  };

  const selectedSupplierObj = suppliers.find((s) => String(s.id) === String(bill.supplier_id));
  const selectedProjectObj = projects.find((p) => String(p.id) === String(bill.project_id));

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="card print:hidden">
        <div className="card-header bg-brand text-white rounded-t-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-white">
            <div>
              <h1 className="text-2xl font-bold dark:text-brand-300 flex items-center gap-2">
                <span>🧾</span> {isEdit ? "Edit Subcontractor Bill" : "New Subcontractor Bill"}
              </h1>
              <p className="text-sm mt-1 text-slate-100">
                Prepare, review and issue vendor service bills, job order settlements and subcontractor billings
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary text-xs flex items-center gap-1.5"
                title="Print Service Bill"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="btn-secondary text-xs flex items-center gap-1.5"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="btn-success text-xs flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Main Form Body */}
      <form onSubmit={saveBill} className="print:hidden space-y-4">
        <div className="card">
          <div className="card-body space-y-6">
            {/* Top Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="label">Bill No *</label>
                <input
                  type="text"
                  className="input bg-slate-50 dark:bg-slate-900 font-mono font-semibold text-slate-800 dark:text-slate-200"
                  value={bill.bill_no}
                  readOnly
                  placeholder="Auto-generated"
                />
              </div>

              <div>
                <label className="label">Bill Date *</label>
                <input
                  type="date"
                  className={`input ${disabledClass}`}
                  value={bill.bill_date}
                  onChange={(e) => update("bill_date", e.target.value)}
                  required
                  disabled={readOnly || (isEdit && !hasExceptional("DOCUMENT.EDIT_DATE"))}
                />
              </div>

              <div>
                <label className="label">Project (Optional)</label>
                <select
                  className={`input ${disabledClass} w-full`}
                  value={bill.project_id || ""}
                  onChange={(e) => update("project_id", e.target.value)}
                  disabled={readOnly}
                >
                  <option value="">-- General Project / Unassigned --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.project_name || p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Subcontractor / Supplier *</label>
                <div className="relative">
                  <input
                    type="text"
                    className={`input ${disabledClass} w-full`}
                    placeholder="Search subcontractor..."
                    disabled={readOnly}
                    value={
                      selectedSupplierObj?.supplier_name ||
                      selectedSupplierObj?.name ||
                      supplierSearch
                    }
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      update("supplier_id", "");
                    }}
                  />
                  {!readOnly && supplierSearch && (
                    (() => {
                      const q = supplierSearch.trim();
                      const matched = q
                        ? filterByPrefix(suppliers, {
                            query: q,
                            searchFields: ["supplier_name", "name", "company", "supplier_code"],
                          }).slice(0, 10)
                        : [];
                      return matched.length > 0 ? (
                        <div className="absolute z-30 w-full bg-white dark:bg-slate-850 border border-gray-300 dark:border-slate-700 rounded-lg shadow-xl mt-1 max-h-52 overflow-y-auto">
                          {matched.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-b-0 text-xs"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                update("supplier_id", String(s.id));
                                if (s.currency_id) update("currency_id", Number(s.currency_id));
                                setSupplierSearch("");
                              }}
                            >
                              <div className="font-semibold text-slate-800 dark:text-slate-100">
                                {s.supplier_name || s.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {s.contact_person ? `Contact: ${s.contact_person}` : s.supplier_code}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* Second Row Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="label">Payment Status</label>
                <select
                  className={`input ${disabledClass}`}
                  value={bill.payment_status}
                  onChange={(e) => update("payment_status", e.target.value)}
                  disabled={readOnly}
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partially Paid</option>
                </select>
              </div>

              <div>
                <label className="label">Service / Due Date</label>
                <input
                  type="date"
                  className={`input ${disabledClass}`}
                  value={bill.due_date || bill.service_date || ""}
                  onChange={(e) => update("due_date", e.target.value)}
                  disabled={readOnly}
                />
              </div>

              <div>
                <label className="label">Currency</label>
                <select
                  className={`input ${disabledClass}`}
                  value={bill.currency_id || ""}
                  onChange={(e) => update("currency_id", Number(e.target.value) || "")}
                  disabled={readOnly}
                >
                  {finCurrencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} ({c.name || c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Payment Reference / IPC #</label>
                <input
                  type="text"
                  className={`input ${disabledClass}`}
                  placeholder="e.g. IPC-SC-PRJ01-1 / Cheque #"
                  value={bill.payment_reference || ""}
                  onChange={(e) => update("payment_reference", e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Service Items Table Section */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Services & Work Items
                </h3>
              </div>

              {/* Inline Service Adder Bar */}
              {!readOnly && (
                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Service Description / Work Item
                    </label>
                    <input
                      type="text"
                      className="input w-full text-xs"
                      placeholder="e.g. Structural Substructure Works, Earthworks, Electrical"
                      value={newItem.desc || newItem.item_name || itemQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemQuery(val);
                        setNewItem((p) => ({ ...p, desc: val, item_name: val, item_id: p.item_id || "manual" }));
                      }}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      className="input w-full text-xs text-right font-mono"
                      value={newItem.qty}
                      onChange={(e) => handleNewItemFieldChange("qty", Number(e.target.value))}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Rate / Certified Amount (GH₵)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input w-full text-xs text-right font-mono"
                      value={newItem.rate}
                      onChange={(e) => handleNewItemFieldChange("rate", Number(e.target.value))}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!newItem.desc && !newItem.item_name && !itemQuery) {
                          toast.warn("Please enter a service or work item description");
                          return;
                        }
                        const itName = newItem.desc || newItem.item_name || itemQuery;
                        const rateVal = Number(newItem.rate || 0);
                        const qtyVal = Number(newItem.qty || 1);
                        const lineTot = qtyVal * rateVal;
                        setLines((prev) => [
                          ...prev,
                          {
                            id: Date.now(),
                            item_name: itName,
                            desc: itName,
                            category: newItem.category || "Subcontract Works",
                            qty: qtyVal,
                            rate: rateVal,
                            amount: lineTot,
                            line_total: lineTot,
                            tax_amount: 0,
                            discount_percent: 0,
                          },
                        ]);
                        setNewItem({
                          item_id: "",
                          category: "",
                          qty: 1,
                          rate: 0,
                          discount_percent: 0,
                          tax_code_id: "",
                        });
                        setItemQuery("");
                      }}
                      className="btn btn-primary w-full text-xs flex items-center justify-center gap-1 py-2 font-semibold"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                </div>
              )}

              {/* Lines Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[11px] text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Service / Scope Item</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate (GH₵)</th>
                      <th className="py-2.5 px-3 text-right">Total (GH₵)</th>
                      {!readOnly && <th className="py-2.5 px-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {lines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-6 text-slate-400 dark:text-slate-500 italic"
                        >
                          No service items added yet. Use the adder bar above or raise from a certified IPC.
                        </td>
                      </tr>
                    ) : (
                      lines.map((line, idx) => (
                        <tr key={line.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              className="input w-full text-xs py-1"
                              value={line.item_name || line.desc || ""}
                              onChange={(e) => handleLineChange(line.id, "item_name", e.target.value)}
                              disabled={readOnly}
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="any"
                              className="input w-20 text-right text-xs py-1 font-mono"
                              value={line.qty}
                              onChange={(e) => handleLineChange(line.id, "qty", Number(e.target.value))}
                              disabled={readOnly}
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              className="input w-28 text-right text-xs py-1 font-mono"
                              value={line.rate}
                              onChange={(e) => handleLineChange(line.id, "rate", Number(e.target.value))}
                              disabled={readOnly}
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {Number(line.line_total || line.amount || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          {!readOnly && (
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(idx)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label className="label">Remarks / Subcontract Reference</label>
              <textarea
                className={`input ${disabledClass} w-full`}
                rows={3}
                value={bill.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Add notes, interim payment certificate references, scope specifications..."
                disabled={readOnly}
              />
            </div>

            {/* Bottom 2-Column Summary and Payment Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              {/* Left Column: Settlement & Payment Details */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Settlement & Payment Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label">Payment Terms</label>
                      <select
                        className={`input ${disabledClass}`}
                        value={bill.payment_terms}
                        onChange={(e) => update("payment_terms", Number(e.target.value))}
                        disabled={readOnly}
                      >
                        <option value="0">Immediate</option>
                        <option value="15">Net 15</option>
                        <option value="30">Net 30</option>
                        <option value="60">Net 60</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Payment Method</label>
                      <select
                        className={`input ${disabledClass}`}
                        value={bill.payment_method}
                        onChange={(e) => update("payment_method", e.target.value)}
                        disabled={readOnly}
                      >
                        <option value="bank">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="cash">Cash</option>
                        <option value="mobile">Mobile Money</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Payment Reference</label>
                      <input
                        type="text"
                        className={`input ${disabledClass}`}
                        value={bill.payment_reference || ""}
                        onChange={(e) => update("payment_reference", e.target.value)}
                        placeholder="TR-XXXX / Cheque #"
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Totals Summary Card */}
              <div className="lg:col-span-5">
                <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-2.5 text-xs shadow-sm">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-700">
                    Bill Summary
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{totals.subtotal.toFixed(2)}</span>
                  </div>

                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-amber-600 font-medium">
                      <span>Total Discount:</span>
                      <span className="font-mono">-{totals.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-300">Other Charges:</span>
                    {!readOnly ? (
                      <input
                        type="number"
                        step="0.01"
                        className="input w-28 text-right text-xs p-1 font-mono"
                        value={bill.other_charges}
                        onChange={(e) => update("other_charges", Number(e.target.value))}
                      />
                    ) : (
                      <span className="font-mono">{totals.other.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t-2 border-brand dark:border-brand-400 text-base font-bold text-brand dark:text-brand-300">
                    <span>Grand Total:</span>
                    <span className="font-mono text-lg">
                      {selectedCurrencyCode || baseCurrencyCode} {totals.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary px-5 py-2 text-xs"
                disabled={saving}
              >
                Cancel
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-success px-6 py-2 text-xs font-semibold shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {saving ? "Saving Bill..." : "Save Subcontractor Bill"}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Printable / PDF Container */}
      <div
        ref={pdfRef}
        style={{ display: "none" }}
        className="bg-white text-slate-900 p-8 text-xs font-sans"
      >
        <div className="flex justify-between items-start pb-6 border-b border-slate-300">
          <div>
            <img src={defaultLogo} alt="Logo" className="h-10 mb-2 object-contain" />
            <h2 className="text-lg font-bold">{companyInfo.name}</h2>
            <p className="text-slate-600">{companyInfo.address}</p>
            <p className="text-slate-600">
              Phone: {companyInfo.phone} | Email: {companyInfo.email}
            </p>
            {companyInfo.taxId && <p className="text-slate-600">Tax ID: {companyInfo.taxId}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase text-brand tracking-wider">
              SUBCONTRACTOR BILL
            </h1>
            <p className="font-mono font-bold text-sm mt-1">{bill.bill_no}</p>
            <p className="text-slate-600 mt-1">Date: {bill.bill_date}</p>
            {bill.due_date && <p className="text-slate-600">Due: {bill.due_date}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-300">
          <div>
            <h4 className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
              Subcontractor / Trade Vendor:
            </h4>
            <p className="font-bold text-sm">
              {selectedSupplierObj?.supplier_name || selectedSupplierObj?.name || "N/A"}
            </p>
            {selectedProjectObj && (
              <p className="text-slate-600 font-semibold mt-1">
                Project: {selectedProjectObj.project_name || selectedProjectObj.name}
              </p>
            )}
            {selectedSupplierObj?.address && (
              <p className="text-slate-600">{selectedSupplierObj.address}</p>
            )}
            {selectedSupplierObj?.phone && (
              <p className="text-slate-600">Phone: {selectedSupplierObj.phone}</p>
            )}
            {selectedSupplierObj?.email && (
              <p className="text-slate-600">Email: {selectedSupplierObj.email}</p>
            )}
          </div>
          <div className="text-right">
            <h4 className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
              Payment Status:
            </h4>
            <p className="font-bold uppercase text-sm">{bill.payment_status || "UNPAID"}</p>
            <p className="text-slate-600">Terms: {bill.payment_terms} Days</p>
            {bill.payment_method && (
              <p className="text-slate-600">Method: {bill.payment_method.toUpperCase()}</p>
            )}
            {bill.payment_reference && (
              <p className="text-slate-600 font-mono">Ref: {bill.payment_reference}</p>
            )}
          </div>
        </div>

        <table className="w-full text-left my-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800 text-[11px] uppercase font-bold">
              <th className="py-2">#</th>
              <th className="py-2">Scope / Service Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lines.map((l, i) => (
              <tr key={i} className="text-xs">
                <td className="py-2">{i + 1}</td>
                <td className="py-2 font-medium">{l.item_name || l.desc}</td>
                <td className="py-2 text-right font-mono">{l.qty}</td>
                <td className="py-2 text-right font-mono">{Number(l.rate).toFixed(2)}</td>
                <td className="py-2 text-right font-mono font-bold">
                  {Number(l.line_total || l.amount || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-4 border-t border-slate-300">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.other > 0 && (
              <div className="flex justify-between">
                <span>Other Charges:</span>
                <span className="font-mono">{totals.other.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t-2 border-slate-800 font-bold text-sm">
              <span>Grand Total:</span>
              <span className="font-mono">
                {selectedCurrencyCode || baseCurrencyCode} {totals.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {bill.notes && (
          <div className="mt-8 pt-4 border-t border-slate-200">
            <h5 className="font-bold text-[10px] uppercase text-slate-500 mb-1">
              Remarks & Certification Notes:
            </h5>
            <p className="text-slate-600 text-xs">{bill.notes}</p>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
            <p className="text-slate-500">Prepared By (Project QS / Engineer)</p>
          </div>
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
            <p className="text-slate-500">Authorized Commercial Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
