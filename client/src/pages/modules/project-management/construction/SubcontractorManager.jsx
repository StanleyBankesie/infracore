import MobileMovingCarousel from "@/components/MobileMovingCarousel";

/**

 * @file SubcontractorManager.jsx

 * @description Subcontractor agreements and Interim Payment Certificates (IPCs).

 */



import React, { useState, useEffect, useMemo } from "react";

import { Link, useNavigate } from "react-router-dom";

import {

  Users,

  Plus,

  FileCheck,

  DollarSign,

  ArrowLeft,

  X,

  FileSpreadsheet,

  CheckCircle,

  Briefcase,

  Search,

  RefreshCw,

  Building,
  ExternalLink,
  Layers,
  Receipt,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle

} from "lucide-react";

import { api } from "../../../../api/client.js";

import { toast } from "react-toastify";

import ProjectModal from "../components/ProjectModal.jsx";



export default function SubcontractorManager() {

  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [suppliers, setSuppliers] = useState([]);

  const [subcontracts, setSubcontracts] = useState([]);

  const [valuations, setValuations] = useState([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("agreements"); // 'agreements' | 'ipcs' | 'all'



  // Modals

  const [showContractModal, setShowContractModal] = useState(false);

  const [showValuationModal, setShowValuationModal] = useState(false);

  const [selectedContract, setSelectedContract] = useState(null);

  // Quick Add Subcontractor Modal States
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [savingSub, setSavingSub] = useState(false);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [newSubForm, setNewSubForm] = useState({
    supplier_name: "",
    trade: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    expense_account_id: "",
  });

  // Project Scopes & WBS linking for Subcontracts
  const [projectScopes, setProjectScopes] = useState([]);
  const [selectedScopeId, setSelectedScopeId] = useState("");
  const [selectedWbsCode, setSelectedWbsCode] = useState("");

  // Payment Accounts & Direct Payment States
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [accountBalances, setAccountBalances] = useState({});

  // Direct Pay Existing Valuation Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedValToPay, setSelectedValToPay] = useState(null);
  const [payingValuation, setPayingValuation] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_account_id: "",
    payment_method: "",
    payment_reference: "",
    cheque_number: "",
    cheque_date: new Date().toISOString().split("T")[0],
    payment_narration: "",
  });

  const [contractForm, setContractForm] = useState({
    project_id: "",
    subcontract_number: "",
    subcontractor_id: "",
    trade: "",
    scope_of_work: "",
    contract_sum: "",
    retention_percent: "",
    advance_payment: "",
    advance_recovery_percent: "",
    start_date: "",
    completion_date: "",
  });

  const [valuationForm, setValuationForm] = useState({
    valuation_number: "",
    period_from: "",
    period_to: "",
    cumulative_work_done: "",
    previous_certified: "",
    remarks: "",
    mark_work_completed: false,
    auto_raise_bill: true,
    auto_pay: false,
    payment_account_id: "",
    payment_method: "",
    payment_reference: "",
    cheque_number: "",
    cheque_date: "",
    payment_narration: "",
  });

  const fetchSuppliers = async (preselectId = null) => {
    try {
      const sRes = await api.get("/purchase/suppliers?contractor=Y");
      let list = sRes.data?.items || sRes.data?.data?.items || [];
      if (!list || list.length === 0) {
        const fallbackRes = await api.get("/purchase/suppliers");
        list = fallbackRes.data?.items || fallbackRes.data?.data?.items || [];
      }
      setSuppliers(list);
      if (preselectId) {
        setContractForm((prev) => ({ ...prev, subcontractor_id: String(preselectId) }));
      }
      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const fetchPaymentAccounts = async () => {
    try {
      const res = await api.get("/finance/accounts");
      const accs = Array.isArray(res.data?.items)
        ? res.data.items
        : Array.isArray(res.data)
          ? res.data
          : [];
      const bankCash = accs.filter((a) => {
        const gc = String(a.group_code || "").toUpperCase();
        const gn = String(a.group_name || "").toUpperCase();
        return (
          gc === "AST_BANK" ||
          gc === "AST_CASH" ||
          gc === "1005" ||
          gc === "1006" ||
          gn.includes("BANK") ||
          gn.includes("CASH")
        );
      });
      setPaymentAccounts(bankCash);

      const expAccs = accs.filter((a) => {
        const nat = String(a.nature || "").toUpperCase();
        const gn = String(a.group_name || "").toUpperCase();
        const gc = String(a.group_code || "").toUpperCase();
        const cd = String(a.code || "");
        return (
          nat === "EXPENSE" ||
          gn.includes("EXPENSE") ||
          gn.includes("COST") ||
          gc.startsWith("5") ||
          cd.startsWith("5")
        );
      });
      setExpenseAccounts(expAccs);

      return bankCash;
    } catch (err) {
      console.error("Failed to load payment accounts", err);
      return [];
    }
  };

  const fetchAccountBalance = async (accId, force = false) => {
    if (!accId) return;
    if (!force && accountBalances[accId] !== undefined && accountBalances[accId] !== null) return;
    try {
      const res = await api.get(`/finance/accounts/${accId}/balance`);
      const bal = res.data?.balance ?? res.data?.current_balance ?? 0;
      setAccountBalances((prev) => ({ ...prev, [accId]: bal }));
    } catch (_) {
      setAccountBalances((prev) => ({ ...prev, [accId]: 0 }));
    }
  };

  const getFilteredPaymentAccounts = (method) => {
    const m = String(method || "").trim();
    if (!m) return [];
    const list = Array.isArray(paymentAccounts) ? paymentAccounts : [];

    if (m === "Cash") {
      return list.filter((a) => {
        const gc = String(a.group_code || "").toUpperCase();
        const gn = String(a.group_name || "").toUpperCase();
        const name = String(a.name || "").toUpperCase();
        const code = String(a.code || "");
        const isMomo =
          name.includes("MOMO") ||
          name.includes("MOBILE MONEY") ||
          code === "1022" ||
          gc === "1022";
        return (
          !isMomo &&
          (gc === "AST_CASH" ||
            gc === "1005" ||
            gn.includes("CASH") ||
            name.includes("CASH"))
        );
      });
    }

    if (m === "Mobile Money") {
      const momoList = list.filter((a) => {
        const name = String(a.name || "").toUpperCase();
        const gn = String(a.group_name || "").toUpperCase();
        const code = String(a.code || "");
        const gc = String(a.group_code || "").toUpperCase();
        return (
          name.includes("MOMO") ||
          name.includes("MOBILE MONEY") ||
          code === "1022" ||
          gc === "1022" ||
          gn.includes("MOBILE MONEY")
        );
      });
      if (momoList.length > 0) return momoList;
      return list.filter((a) => {
        const gc = String(a.group_code || "").toUpperCase();
        const gn = String(a.group_name || "").toUpperCase();
        const name = String(a.name || "").toUpperCase();
        return (
          gc === "AST_CASH" ||
          gc === "1005" ||
          gn.includes("CASH") ||
          name.includes("CASH")
        );
      });
    }

    if (
      m === "Cheque" ||
      m === "Bank Transfer" ||
      m === "Credit Card" ||
      m === "Electronic / EFT"
    ) {
      return list.filter((a) => {
        const gc = String(a.group_code || "").toUpperCase();
        const gn = String(a.group_name || "").toUpperCase();
        const name = String(a.name || "").toUpperCase();
        return (
          gc === "AST_BANK" ||
          gc === "1006" ||
          gn.includes("BANK") ||
          name.includes("BANK")
        );
      });
    }

    return list;
  };

  const handlePaymentMethodChange = (newMethod, isValModal = false) => {
    if (!newMethod) {
      if (isValModal) {
        setValuationForm((prev) => ({
          ...prev,
          payment_method: "",
          payment_account_id: "",
          cheque_number: "",
        }));
      } else {
        setPayForm((prev) => ({
          ...prev,
          payment_method: "",
          payment_account_id: "",
          cheque_number: "",
        }));
      }
      return;
    }

    const filtered = getFilteredPaymentAccounts(newMethod);
    const form = isValModal ? valuationForm : payForm;
    const currentAccId = form.payment_account_id;
    const isCurrentValid = filtered.some((a) => String(a.id) === String(currentAccId));
    const nextAccId = isCurrentValid
      ? currentAccId
      : filtered[0]?.id
        ? String(filtered[0].id)
        : "";

    if (isValModal) {
      setValuationForm((prev) => ({
        ...prev,
        payment_method: newMethod,
        payment_account_id: nextAccId,
        cheque_number: newMethod === "Cheque" ? prev.cheque_number : "",
      }));
    } else {
      setPayForm((prev) => ({
        ...prev,
        payment_method: newMethod,
        payment_account_id: nextAccId,
        cheque_number: newMethod === "Cheque" ? prev.cheque_number : "",
      }));
    }
    if (nextAccId) fetchAccountBalance(nextAccId, true);
  };

  useEffect(() => {
    (async () => {
      try {
        const pRes = await api.get("/projects/projects", { params: { active: "all" } });
        const prjs = pRes.data?.items || [];
        setProjects(prjs);
        setSelectedProjectId("");
        await Promise.all([fetchSuppliers(), fetchPaymentAccounts()]);
      } catch (e) {
        toast.error("Failed to load initial data");
        setLoading(false);
      }
    })();
  }, []);

  // Fetch project scopes & WBS whenever project selection in contractForm changes
  useEffect(() => {
    if (!contractForm.project_id) {
      setProjectScopes([]);
      setSelectedScopeId("");
      setSelectedWbsCode("");
      return;
    }
    let active = true;
    api
      .get(`/projects/projects/${contractForm.project_id}`)
      .catch(() => api.get(`/projects/${contractForm.project_id}`))
      .then((res) => {
        if (!active) return;
        const proj = res.data?.item || res.data?.data || res.data;
        let scopes = proj?.scopes || [];
        if ((!scopes || !scopes.length) && proj?.project_scopes) {
          try {
            scopes =
              typeof proj.project_scopes === "string"
                ? JSON.parse(proj.project_scopes)
                : proj.project_scopes;
          } catch {}
        }
        setProjectScopes(Array.isArray(scopes) ? scopes : []);
      })
      .catch(() => setProjectScopes([]));

    return () => {
      active = false;
    };
  }, [contractForm.project_id]);

  const availableWbsList = useMemo(() => {
    if (!selectedScopeId || !projectScopes.length) return [];
    const foundScope = projectScopes.find(
      (s, idx) => String(s.id ?? idx) === String(selectedScopeId)
    );
    return foundScope?.wbs_list || [];
  }, [selectedScopeId, projectScopes]);

  const handleSelectScope = (scopeId) => {
    setSelectedScopeId(scopeId);
    setSelectedWbsCode("");
    if (!scopeId) return;
    const foundScope = projectScopes.find(
      (s, idx) => String(s.id ?? idx) === String(scopeId)
    );
    if (foundScope) {
      const scopeName = foundScope.name || foundScope.title || "";
      setContractForm((prev) => ({
        ...prev,
        trade: prev.trade || scopeName,
        scope_of_work: prev.scope_of_work
          ? `${prev.scope_of_work}\n[Scope: ${scopeName}] ${foundScope.description || foundScope.remarks || ""}`.trim()
          : `[Scope: ${scopeName}] ${foundScope.description || foundScope.remarks || ""}`.trim(),
        start_date: prev.start_date || foundScope.start_date || "",
        completion_date: prev.completion_date || foundScope.end_date || foundScope.due_date || "",
      }));
    }
  };

  const handleSelectWbs = (wbsCode) => {
    setSelectedWbsCode(wbsCode);
    if (!wbsCode) return;
    const foundWbs = availableWbsList.find(
      (w, idx) => String(w.wbs ?? w.wbs_code ?? idx) === String(wbsCode)
    );
    if (foundWbs) {
      const wbsLabel = foundWbs.wbs || foundWbs.wbs_code || "WBS";
      const wbsTitle = foundWbs.name || foundWbs.title || wbsLabel;
      setContractForm((prev) => ({
        ...prev,
        trade: prev.trade || wbsTitle,
        scope_of_work: prev.scope_of_work
          ? `${prev.scope_of_work}\n[WBS ${wbsLabel}]: ${wbsTitle}`.trim()
          : `[WBS ${wbsLabel}]: ${wbsTitle}`.trim(),
        start_date: foundWbs.start_date || prev.start_date,
        completion_date: foundWbs.end_date || foundWbs.due_date || prev.completion_date,
      }));
    }
  };

  const handleQuickAddSubcontractor = async (e) => {
    e.preventDefault();
    if (!newSubForm.supplier_name.trim()) {
      return toast.error("Please enter subcontractor name");
    }
    setSavingSub(true);
    try {
      const payload = {
        supplier_name: newSubForm.supplier_name.trim(),
        contact_person: newSubForm.contact_person.trim(),
        phone: newSubForm.phone.trim(),
        email: newSubForm.email.trim(),
        address: newSubForm.address.trim(),
        trade_specialty: newSubForm.trade.trim(),
        industry: "Contractor/Subcontractor",
        service_contractor: "Y",
        is_active: 1,
        expense_account_id: newSubForm.expense_account_id ? Number(newSubForm.expense_account_id) : null,
      };
      const res = await api.post("/purchase/suppliers", payload);
      const createdId = res.data?.id || res.data?.item?.id || res.data?.data?.id || res.data?.insertId;

      toast.success("Subcontractor registered successfully!");
      setShowAddSubModal(false);

      await fetchSuppliers(createdId);

      if (createdId) {
        setContractForm((prev) => ({
          ...prev,
          subcontractor_id: String(createdId),
          trade: prev.trade || newSubForm.trade || "",
        }));
      }

      setNewSubForm({
        supplier_name: "",
        trade: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        expense_account_id: "",
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to register subcontractor"
      );
    } finally {
      setSavingSub(false);
    }
  };



  useEffect(() => {

    fetchSubcontracts();

  }, [selectedProjectId]);



  const fetchSubcontracts = async () => {

    setLoading(true);

    try {

      const res = await api.get("/construction/subcontracts", {

        params: selectedProjectId ? { project_id: selectedProjectId } : {}

      });

      setSubcontracts(res.data?.items || []);

      const valRes = await api.get("/construction/subcontract-valuations", {

        params: selectedProjectId ? { project_id: selectedProjectId } : {}

      });

      setValuations(valRes.data?.items || []);

    } catch (e) {

      toast.error(e?.response?.data?.error || "Failed to load subcontracts");

    } finally {

      setLoading(false);

    }

  };



  const handleCreateContract = async (e) => {

    e.preventDefault();

    const projId = contractForm.project_id || selectedProjectId;

    if (!projId) {

      return toast.error("Please select a project");

    }

    if (!contractForm.subcontractor_id) {

      return toast.error("Please select a subcontractor");

    }

    try {
      await api.post("/construction/subcontracts", {
        ...contractForm,
        project_id: projId,
        scope_id: selectedScopeId || undefined,
        wbs_code: selectedWbsCode || undefined,
        contract_sum: contractForm.contract_sum !== "" ? Number(contractForm.contract_sum) : 0,
        retention_percent: contractForm.retention_percent !== "" ? Number(contractForm.retention_percent) : 0,
        advance_recovery_percent: contractForm.advance_recovery_percent !== "" ? Number(contractForm.advance_recovery_percent) : 0,
      });

      toast.success("Subcontract registered & linked tasks set to In Progress");
      setShowContractModal(false);
      fetchSubcontracts();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to register subcontract");
    }
  };

  const handleToggleSubcontractStatus = async (sc, newStatus) => {
    const isCompleting = newStatus === "COMPLETED";
    const confirmMsg = isCompleting
      ? `Mark subcontract "${sc.subcontract_number || sc.contract_no}" as COMPLETED?\n\nThis will automatically update the linked Scope, WBS, and Gantt schedule tasks to 100% COMPLETED.`
      : `Reopen subcontract "${sc.subcontract_number || sc.contract_no}" to ACTIVE?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.put(`/construction/subcontracts/${sc.id}/status`, { status: newStatus });
      toast.success(
        isCompleting
          ? "Subcontract completed and linked Gantt schedule tasks updated to 100%!"
          : "Subcontract status updated to ACTIVE"
      );
      fetchSubcontracts();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update subcontract status");
    }
  };

  const openValuationModal = (sc) => {
    setSelectedContract(sc);
    const prev = valuations.filter(v => String(v.subcontract_id) === String(sc.id));
    const lastCertified = prev.reduce(
      (acc, curr) => Math.max(acc, Number(curr.cumulative_work_done ?? curr.gross_claimed ?? 0)),
      0
    );
    const subNo = sc.subcontract_number || sc.contract_no || "SC";
    const today = new Date().toISOString().split("T")[0];

    setValuationForm({
      valuation_number: `IPC-${subNo}-${prev.length + 1}`,
      period_from: "",
      period_to: today,
      cumulative_work_done: lastCertified > 0 ? lastCertified : "",
      previous_certified: lastCertified > 0 ? lastCertified : "",
      remarks: "",
      mark_work_completed: false,
      auto_raise_bill: true,
      auto_pay: false,
      payment_account_id: "",
      payment_method: "",
      payment_reference: "",
      cheque_number: "",
      cheque_date: today,
      payment_narration: `Payment - IPC Ref: IPC-${subNo}-${prev.length + 1} (${sc.subcontractor_name || "Subcontractor"})`,
    });
    setShowValuationModal(true);
  };

  const handleCreateValuation = async (e) => {
    e.preventDefault();
    if (valuationForm.auto_pay) {
      if (!valuationForm.payment_method) {
        toast.error("Please select a Payment Method");
        return;
      }
      if (!valuationForm.payment_account_id) {
        toast.error("Please select a Payment Account");
        return;
      }
      if (valuationForm.payment_method === "Cheque" && !valuationForm.cheque_number && !valuationForm.payment_reference) {
        toast.error("Please enter a Cheque Number");
        return;
      }
      if (valuationForm.payment_method === "Bank Transfer" && !valuationForm.payment_reference) {
        toast.error("Please enter a Transfer Reference / Transaction ID");
        return;
      }
      if (valuationForm.payment_method === "Mobile Money" && !valuationForm.payment_reference) {
        toast.error("Please enter a MoMo Transaction ID / Reference");
        return;
      }
    }
    try {
      const res = await api.post("/construction/subcontract-valuations", {
        ...valuationForm,
        mark_work_completed: Boolean(valuationForm.mark_work_completed),
        cumulative_work_done:
          valuationForm.cumulative_work_done !== ""
            ? Number(valuationForm.cumulative_work_done)
            : 0,
        previous_certified:
          valuationForm.previous_certified !== ""
            ? Number(valuationForm.previous_certified)
            : 0,
        subcontract_id: selectedContract.id,
        cheque_number: valuationForm.payment_method === "Cheque" ? (valuationForm.cheque_number || valuationForm.payment_reference) : null,
        payment_reference: valuationForm.payment_reference || valuationForm.cheque_number || valuationForm.valuation_number,
      });

      if (valuationForm.mark_work_completed) {
        toast.success(
          "IPC certified, Subcontract marked Completed & Gantt schedule tasks updated to 100%!"
        );
      } else if (res.data?.voucher_no && res.data?.bill_no) {
        toast.success(
          `IPC certified, Service Bill ${res.data.bill_no} raised, and Payment Voucher ${res.data.voucher_no} issued!`
        );
      } else if (res.data?.bill_no) {
        toast.success(
          `IPC certified and Service Bill ${res.data.bill_no} raised in Project Management!`
        );
      } else {
        toast.success("Interim Payment Certificate (IPC) certified");
      }

      setShowValuationModal(false);
      fetchSubcontracts();
    } catch (e) {
      toast.error(
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Failed to certify valuation"
      );
    }
  };

  const openPayValuationModal = (val) => {
    setSelectedValToPay(val);
    const ipcNo = val.valuation_number || val.valuation_no || "IPC";
    const subName = val.supplier_name || "Subcontractor";
    const today = new Date().toISOString().split("T")[0];
    setPayForm({
      payment_account_id: "",
      payment_method: "",
      payment_reference: "",
      cheque_number: "",
      cheque_date: today,
      payment_narration: `Payment - IPC Ref: ${ipcNo} (${subName})`,
    });
    setShowPayModal(true);
  };

  const handlePayValuationSubmit = async (e) => {
    e.preventDefault();
    if (!payForm.payment_method) {
      toast.error("Please select a Payment Method");
      return;
    }
    if (!payForm.payment_account_id) {
      toast.error("Please select a Payment Account");
      return;
    }
    if (payForm.payment_method === "Cheque" && !payForm.cheque_number && !payForm.payment_reference) {
      toast.error("Please enter a Cheque Number");
      return;
    }
    if (payForm.payment_method === "Bank Transfer" && !payForm.payment_reference) {
      toast.error("Please enter a Transfer Reference / Transaction ID");
      return;
    }
    if (payForm.payment_method === "Mobile Money" && !payForm.payment_reference) {
      toast.error("Please enter a MoMo Transaction ID / Reference");
      return;
    }
    try {
      setPayingValuation(true);
      const res = await api.post(
        `/construction/subcontract-valuations/${selectedValToPay.id}/pay`,
        {
          ...payForm,
          cheque_number: payForm.payment_method === "Cheque" ? (payForm.cheque_number || payForm.payment_reference) : null,
          payment_reference: payForm.payment_reference || payForm.cheque_number || selectedValToPay?.valuation_number || selectedValToPay?.valuation_no,
        }
      );
      toast.success(
        res.data?.message ||
          `Payment Voucher ${res.data?.voucherNo} issued and settled successfully!`
      );
      setShowPayModal(false);
      fetchSubcontracts();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to process direct payment"
      );
    } finally {
      setPayingValuation(false);
    }
  };

  const handleRaiseBill = (val) => {
    const sc = subcontracts.find((s) => String(s.id) === String(val.subcontract_id));
    const supplierId = val.supplier_id || sc?.supplier_id || "";
    const projectId = sc?.project_id || val.project_id || selectedProjectId || "";
    const ipcNo = val.valuation_number || val.valuation_no || "IPC";
    const subNo = sc?.subcontract_number || sc?.contract_no || "Subcontract";
    const netAmount = Number(val.net_payable ?? val.net_certified_amount ?? 0);

    navigate("/project-management/service-bills/new", {
      state: {
        from: "/project-management/subcontracts",
        project_id: projectId,
        supplier_id: supplierId,
        payment_reference: ipcNo,
        net_payable: netAmount,
        description: `Subcontract Trade Works (${sc?.trade || "Specialist Works"}) - Certified ${ipcNo}`,
        notes: `Certified Subcontractor Interim Payment Certificate (IPC Ref: ${ipcNo}). Subcontract Agreement: ${subNo}. Gross Work Done: GHS ${Number(val.current_work_done || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}, Less Retention: GHS ${Number(val.retention_deducted || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}, Less Advance Recovered: GHS ${Number(val.advance_recovered || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}. Net Certified Payable: GHS ${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
      },
    });
  };



  const currentWork = Math.max(0, Number(valuationForm.cumulative_work_done || 0) - Number(valuationForm.previous_certified || 0));

  const retentionDeducted = (currentWork * Number(selectedContract?.retention_percent ?? 5)) / 100;

  const advanceRecovered = (currentWork * Number(selectedContract?.advance_recovery_percent ?? selectedContract?.advance_percent ?? 10)) / 100;

  const netPayable = Math.max(0, currentWork - retentionDeducted - advanceRecovered);



  const filteredSubcontracts = subcontracts.filter(sc => {

    if (!searchTerm.trim()) return true;

    const q = searchTerm.toLowerCase();

    return (
      sc.subcontract_number?.toLowerCase().includes(q) ||
      sc.contract_no?.toLowerCase().includes(q) ||
      sc.supplier_name?.toLowerCase().includes(q) ||
      sc.subcontractor_name?.toLowerCase().includes(q) ||
      sc.trade?.toLowerCase().includes(q) ||
      sc.trade_category?.toLowerCase().includes(q) ||
      sc.project_name?.toLowerCase().includes(q) ||
      sc.status?.toLowerCase().includes(q)
    );
  });

  const filteredValuations = valuations.filter((v) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (v.valuation_number || v.valuation_no || "").toLowerCase().includes(q) ||
      (v.supplier_name || "").toLowerCase().includes(q) ||
      (v.project_name || "").toLowerCase().includes(q) ||
      (v.service_bill_no || "").toLowerCase().includes(q) ||
      (v.payment_voucher_no || "").toLowerCase().includes(q) ||
      (v.payment_status || "").toLowerCase().includes(q)
    );
  });



  const totalContractValue = subcontracts.reduce((a, c) => a + Number(c.contract_sum ?? c.contract_value ?? 0), 0);

  const activeCount = subcontracts.filter(c => c.status === "ACTIVE").length;

  const totalValuationsCertified = valuations.reduce((a, c) => a + Number(c.net_certified_amount ?? c.net_payable ?? 0), 0);



  return (

    <div className="space-y-6">

      {/* Canonical List Page Header */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5">

            <ArrowLeft size={16} /> Back

          </Link>

          <div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">

              <Users size={24} className="text-brand-900 dark:text-brand-400" /> Subcontractor Agreements & IPCs

            </h1>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 hidden">

              Trade agreements, certified interim valuations, retention withholding, and advance recovery

            </p>

          </div>

        </div>



        <button

          onClick={() => {

            setContractForm({

              project_id: "",

              subcontract_number: "",

              subcontractor_id: "",

              trade: "",

              scope_of_work: "",

              contract_sum: "",

              retention_percent: "",

              advance_payment: "",

              advance_recovery_percent: "",

              start_date: "",

              completion_date: "",

            });

            setShowContractModal(true);

          }}

          className="btn btn-primary inline-flex items-center gap-2"

        >

          <Plus size={16} /> New Subcontract

        </button>

      </div>



      {/* KPI Cards */}

      <MobileMovingCarousel data-page-carousel gridColsClass="md:grid-cols-4" gapClass="gap-4">

        {[

          {

            label: "Active Agreements",

            val: activeCount,

            icon: <FileCheck size={20} className="stroke-[2.5]" />,

            color: "bg-sky-600 dark:bg-sky-500",

          },

          {

            label: "Total Subcontracts",

            val: subcontracts.length,

            icon: <Users size={20} className="stroke-[2.5]" />,

            color: "bg-brand-900 dark:bg-brand-700",

          },

          {

            label: "Active Trade Packages",

            val: subcontracts.filter((s) => s.status === "ACTIVE" || s.contract_status === "ACTIVE").length,

            icon: <CheckCircle size={20} className="stroke-[2.5]" />,

            color: "bg-amber-500",

          },

          {

            label: "Completed Works",

            val: subcontracts.filter((s) => s.status === "COMPLETED" || s.contract_status === "COMPLETED").length,

            icon: <CheckCircle size={20} className="stroke-[2.5]" />,

            color: "bg-emerald-600",

          },

        ].map((stat, i) => {

          const colors = [

            "bg-sky-600 dark:bg-sky-500 text-white",

            "bg-brand-900 dark:bg-brand-700 text-white",

            "bg-amber-500 text-white",

            "bg-emerald-600 text-white",

          ];

          const colorClass = stat.color || colors[i % 4];



          return (

            <div

              key={i}

              className="card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"

            >

              <div>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">

                  {stat.label}

                </p>

                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">

                  {stat.val}

                </p>

              </div>

              <div className={`p-3 rounded-full ${colorClass} shadow-sm`}>

                {stat.icon}

              </div>

            </div>

          );

        })}

      </MobileMovingCarousel>



      {/* Filters & Search Row (Placed below the cards) */}

      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">

          <select

            className="input text-sm py-1.5 h-auto min-w-[200px]"

            value={selectedProjectId}

            onChange={e => setSelectedProjectId(e.target.value)}

          >

            <option value="">All Projects</option>

            {projects.map(p => (

              <option key={p.id} value={p.id}>

                {p.project_name || p.name || p.title || `Project #${p.id}`}

              </option>

            ))}

          </select>

          <div className="relative flex-1 max-w-md">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />

            <input

              type="text"

              placeholder="Search subcontracts..."

              className="input pl-9 pr-3 py-1.5 text-sm h-auto w-full"

              value={searchTerm}

              onChange={e => setSearchTerm(e.target.value)}

            />

          </div>

        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">

          

        </div>

      </div>



      {/* Section Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto text-sm font-semibold mb-4">
        <button
          type="button"
          onClick={() => setActiveSection("agreements")}
          className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSection === "agreements"
              ? "border-brand-600 text-brand-600 dark:text-brand-400 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Briefcase size={16} />
          <span>Subcontract Agreements</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeSection === "agreements"
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {filteredSubcontracts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("ipcs")}
          className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSection === "ipcs"
              ? "border-brand-600 text-brand-600 dark:text-brand-400 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FileCheck size={16} />
          <span>Certified Interim Payment Certificates (IPCs)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeSection === "ipcs"
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {filteredValuations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("all")}
          className={`flex items-center gap-1.5 pb-3 px-3 border-b-2 transition-all whitespace-nowrap text-xs cursor-pointer ${
            activeSection === "all"
              ? "border-brand-600 text-brand-600 dark:text-brand-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          }`}
        >
          <span>View Both</span>
        </button>
      </div>

      {/* Subcontracts Table */}
      {(activeSection === "agreements" || activeSection === "all") && (
        <div className="card overflow-hidden">
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
              Subcontract Agreements ({filteredSubcontracts.length})
            </h2>
          </div>

        <div className="overflow-x-auto">

          <table className="table">

            <thead>

              <tr>

                <th>Contract #</th>

                <th>Project</th>

                <th>Subcontractor</th>

                <th>Trade</th>

                <th className="text-right">Contract Sum (GHS)</th>

                <th className="text-center">Retention %</th>

                <th className="text-center">Advance Rec %</th>

                <th className="text-center">Status</th>

                <th className="text-center">Actions</th>

              </tr>

            </thead>

            <tbody>

              {filteredSubcontracts.length === 0 ? (

                <tr>

                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">

                    {subcontracts.length === 0

                      ? 'No subcontracts registered yet. Click "New Subcontract" to add one.'

                      : 'No subcontracts match your search criteria.'}

                  </td>

                </tr>

              ) : (

                filteredSubcontracts.map(sc => (

                  <tr key={sc.id}>

                    <td className="font-medium text-brand-900 dark:text-brand-400">

                      {sc.subcontract_number || sc.contract_no}

                    </td>

                    <td>

                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={sc.project_name}>

                        {sc.project_name || "General Project"}

                      </div>

                    </td>

                    <td className="font-semibold text-slate-900 dark:text-white">

                      {sc.supplier_name || sc.subcontractor_name || "Specialist Contractor"}

                    </td>

                    <td className="uppercase text-xs font-semibold text-slate-500 dark:text-slate-400">

                      {sc.trade || sc.trade_category}

                    </td>

                    <td className="text-right font-medium text-slate-900 dark:text-slate-100">

                      {Number(sc.contract_sum ?? sc.contract_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </td>

                    <td className="text-center font-mono">{sc.retention_percent}%</td>

                    <td className="text-center font-mono">{sc.advance_recovery_percent ?? sc.advance_percent ?? 0}%</td>

                    <td className="text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        sc.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                          : sc.status === "ACTIVE"
                          ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                          : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      }`}>
                        {sc.status === "COMPLETED" && <CheckCircle size={11} />}
                        {sc.status || "ACTIVE"}
                      </span>
                    </td>

                    <td className="text-center">
                      <div className="inline-flex items-center gap-1.5 justify-center">
                        <button
                          onClick={() => openValuationModal(sc)}
                          className="btn btn-secondary btn-xs inline-flex items-center gap-1"
                          title="Certify Interim Valuation / IPC"
                        >
                          <FileCheck size={12} className="text-brand-900 dark:text-brand-400" /> Certify Valuation
                        </button>
                        {sc.status !== "COMPLETED" ? (
                          <button
                            onClick={() => handleToggleSubcontractStatus(sc, "COMPLETED")}
                            className="btn btn-outline btn-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 inline-flex items-center gap-1 border-emerald-300 dark:border-emerald-800 cursor-pointer"
                            title="Complete Subcontract & update linked Scope, WBS, and Gantt tasks to 100% Completed"
                          >
                            <CheckCircle size={12} /> Complete
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleSubcontractStatus(sc, "ACTIVE")}
                            className="btn btn-ghost btn-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[11px] cursor-pointer"
                            title="Reopen Subcontract to Active"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>
      )}



      {/* Section 2: Interim Valuations / IPCs Table */}

      {(activeSection === "ipcs" || activeSection === "all") && (

        <div className="card overflow-hidden">

          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">

            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white">

              Certified Interim Payment Certificates (IPCs) ({filteredValuations.length})

            </h2>

          </div>

          <div className="overflow-x-auto">

            <table className="table">

              <thead>
                <tr>
                  <th>IPC Number</th>
                  <th>Subcontractor</th>
                  <th className="text-right">Current Work</th>
                  <th className="text-right">Retention</th>
                  <th className="text-right">Advance Rec</th>
                  <th className="text-right">Net Certified (GHS)</th>
                  <th className="text-center">Service Bill</th>
                  <th className="text-center">Payment Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredValuations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                      {valuations.length === 0
                        ? 'No Interim Payment Certificates (IPCs) certified yet. Certify a valuation from Subcontract Agreements.'
                        : 'No Interim Payment Certificates match your search criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredValuations.map((v) => {
                  const isPaid = v.payment_status === "PAID" || v.bill_payment === "PAID";
                  return (
                    <tr key={v.id}>
                      <td className="font-medium text-brand-900 dark:text-brand-400">
                        {v.valuation_number || v.valuation_no}
                      </td>
                      <td className="font-semibold text-slate-900 dark:text-white">
                        {v.supplier_name}
                      </td>
                      <td className="text-right font-medium">
                        {Number(v.current_work_done ?? v.current_certified ?? 0).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="text-right font-mono text-rose-500">
                        -{Number(v.retention_deducted || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="text-right font-mono text-amber-500">
                        -{Number(v.advance_recovered || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        GHS{" "}
                        {Number(v.net_payable ?? v.net_certified_amount ?? 0).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="text-center">
                        {v.service_bill_no ? (
                          <Link
                            to={`/project-management/service-bills/${v.service_bill_id}?mode=view`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                            title="View Service Bill in Project Management"
                          >
                            <Receipt size={12} /> {v.service_bill_no}
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleRaiseBill(v)}
                            className="btn btn-outline btn-xs inline-flex items-center gap-1 text-slate-600 dark:text-slate-300"
                            title="Raise Service Bill manually"
                          >
                            <Receipt size={12} /> Raise Bill
                          </button>
                        )}
                      </td>
                      <td className="text-center">
                        {isPaid ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                            title={
                              v.payment_voucher_no
                                ? `Payment Voucher: ${v.payment_voucher_no}`
                                : "Settled"
                            }
                          >
                            <CheckCircle2 size={12} /> PAID{" "}
                            {v.payment_voucher_no ? `(${v.payment_voucher_no})` : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                            UNPAID
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {!isPaid ? (
                            <button
                              onClick={() => openPayValuationModal(v)}
                              className="btn btn-primary btn-xs inline-flex items-center gap-1 shadow-2xs hover:shadow-xs"
                              title="Direct Disburse / Pay Subcontractor Now"
                            >
                              <CreditCard size={12} /> Pay Now
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 size={13} /> Settled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>

            </table>

          </div>

        </div>

      )}



      {/* Modal: New Subcontract */}

      <ProjectModal

        open={showContractModal}

        onClose={() => setShowContractModal(false)}

        title="Register Subcontract Agreement"

        subtitle="Record agreed package scope, trade specialty, contract sum, and retention terms"

        icon={Briefcase}

        onSubmit={handleCreateContract}

        submitLabel="Register Agreement"

      >

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">

              Project <span className="text-red-500">*</span>

            </label>

            <select

              required

              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"

              value={contractForm.project_id || ""}

              onChange={e => setContractForm({ ...contractForm, project_id: e.target.value })}

            >

              <option value="">Select Project...</option>

              {projects.map(p => (

                <option key={p.id} value={p.id}>{p.project_name || p.name || p.title}</option>

              ))}

            </select>

          </div>

          <div>

            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Subcontractor <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddSubModal(true)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:underline inline-flex items-center gap-1 transition-colors"
                title="Add new subcontractor to the system"
              >
                <Plus size={13} className="stroke-[2.5]" />
                <span>Add Subcontractor</span>
              </button>
            </div>

            <select

              required

              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"

              value={contractForm.subcontractor_id || ""}

              onChange={e => setContractForm({ ...contractForm, subcontractor_id: e.target.value })}

            >

              <option value="">Select Subcontractor...</option>

              {suppliers.filter(s => s.is_active === 1 || s.is_active === "1" || s.is_active === true || s.is_active === null || s.is_active === undefined).map(s => (

                <option key={s.id} value={s.id}>{s.supplier_name}</option>

              ))}

            </select>

            {suppliers.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-between">
                <span>No contractors found.</span>
                <button
                  type="button"
                  onClick={() => setShowAddSubModal(true)}
                  className="font-semibold underline ml-1 hover:text-amber-700 dark:hover:text-amber-300"
                >
                  Add Subcontractor now
                </button>
              </p>
            ) : (
              <div className="mt-1 flex items-center justify-end">
                <Link
                  to="/project-management/setup?tab=subcontractors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 inline-flex items-center gap-1"
                >
                  Manage in Setup <ExternalLink size={11} />
                </Link>
              </div>
            )}

          </div>

        </div>

        {/* Optional Scope & WBS Package Linking */}
        {projectScopes.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-brand-600 dark:text-brand-400" />
                Assign from Project Scope & WBS
              </span>
              <span className="text-[11px] text-slate-400">Optional shortcut</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                value={selectedScopeId}
                onChange={(e) => handleSelectScope(e.target.value)}
              >
                <option value="">-- Choose Project Scope --</option>
                {projectScopes.map((sc, i) => (
                  <option key={sc.id || i} value={sc.id || i}>
                    Scope {i + 1}: {sc.name || sc.title || `Scope #${i + 1}`}
                  </option>
                ))}
              </select>

              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                value={selectedWbsCode}
                onChange={(e) => handleSelectWbs(e.target.value)}
                disabled={!availableWbsList.length}
              >
                <option value="">-- Choose Work Plan / WBS --</option>
                {availableWbsList.map((w, wi) => (
                  <option key={w.id || wi} value={w.wbs || w.wbs_code || wi}>
                    WBS {w.wbs || w.wbs_code}: {w.name || w.title || w.wbs || `WBS #${wi + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 pt-1">
              <CheckCircle2 size={12} /> Assigning this subcontract automatically updates the linked Scope, WBS, and Gantt schedule tasks to "In Progress".
            </p>
          </div>
        )}



        <div>

          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">

            Trade / Specialty <span className="text-red-500">*</span>

          </label>

          <input

            type="text"

            required

            placeholder="e.g. Electrical / Formwork / Plumbing / HVAC"

            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"

            value={contractForm.trade || ""}

            onChange={e => setContractForm({ ...contractForm, trade: e.target.value })}

          />

        </div>



        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">

              Agreed Contract Sum (GHS) <span className="text-red-500">*</span>

            </label>

            <input

              type="number"

              step="0.01"

              required

              placeholder="0.00"

              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"

              value={contractForm.contract_sum ?? ""}

              onChange={e => setContractForm({ ...contractForm, contract_sum: e.target.value })}

            />

          </div>

          <div>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Retention (%)</label>

            <input

              type="number"

              step="0.1"

              placeholder="e.g. 5"

              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"

              value={contractForm.retention_percent ?? ""}

              onChange={e => setContractForm({ ...contractForm, retention_percent: e.target.value })}

            />

          </div>

          <div>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Advance Rec (%)</label>

            <input

              type="number"

              step="0.1"

              placeholder="e.g. 10"

              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"

              value={contractForm.advance_recovery_percent ?? ""}

              onChange={e => setContractForm({ ...contractForm, advance_recovery_percent: e.target.value })}

            />

          </div>

        </div>



        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Start Date</label>

            <input

              type="date"

              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"

              value={contractForm.start_date}

              onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })}

            />

          </div>

          <div>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Expected Completion</label>

            <input

              type="date"

              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"

              value={contractForm.completion_date}

              onChange={e => setContractForm({ ...contractForm, completion_date: e.target.value })}

            />

          </div>

        </div>



        <div>

          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Package Scope / Terms</label>

          <textarea

            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[70px]"

            placeholder="Detailed scope, milestone requirements, or specifications..."

            value={contractForm.scope_of_work}

            onChange={e => setContractForm({ ...contractForm, scope_of_work: e.target.value })}

          />

        </div>

      </ProjectModal>



      {/* Modal: Certify Valuation (IPC) */}
      <ProjectModal
        open={Boolean(showValuationModal && selectedContract)}
        onClose={() => setShowValuationModal(false)}
        title="Interim Payment Certificate (IPC)"
        subtitle={`${selectedContract?.subcontract_number || selectedContract?.contract_no || ""} - ${selectedContract?.supplier_name || selectedContract?.subcontractor_name || ""}`}
        icon={FileCheck}
        onSubmit={handleCreateValuation}
        submitLabel={
          valuationForm.auto_pay
            ? "Certify & Pay Now"
            : "Certify Payment & Bill"
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Valuation / IPC Ref <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              value={valuationForm.valuation_number}
              onChange={(e) =>
                setValuationForm({ ...valuationForm, valuation_number: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Valuation Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              value={valuationForm.period_to}
              onChange={(e) =>
                setValuationForm({ ...valuationForm, period_to: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Cumulative Work Done (GHS)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              value={valuationForm.cumulative_work_done ?? ""}
              onChange={(e) =>
                setValuationForm({ ...valuationForm, cumulative_work_done: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Previous Certified (GHS)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              value={valuationForm.previous_certified ?? ""}
              onChange={(e) =>
                setValuationForm({ ...valuationForm, previous_certified: e.target.value })
              }
            />
          </div>
        </div>

        {/* Deductions Breakdown */}
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl space-y-2 text-sm border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span>Current Period Gross Work:</span>
            <span className="font-medium text-slate-900 dark:text-white">
              GHS {currentWork.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
            <span>Less Retention ({selectedContract?.retention_percent ?? 5}%):</span>
            <span className="font-medium">
              -GHS {retentionDeducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {advanceRecovered > 0 && (
            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
              <span>
                Less Advance Recovery (
                {selectedContract?.advance_recovery_percent ??
                  selectedContract?.advance_percent ??
                  10}
                %):
              </span>
              <span className="font-medium">
                -GHS {advanceRecovered.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 rounded-xl flex justify-between items-center">
          <div>
            <p className="text-xs font-bold uppercase text-brand-900 dark:text-brand-300">
              Net Certified Payable
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gross Work less Retention and Advance recovered
            </p>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            GHS {netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Subcontractor Settlement Section */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CreditCard size={14} className="text-emerald-600" /> Payment Settlement
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Direct Bank / Cash Settlement
            </span>
          </div>

          <div className="space-y-3">
            {/* Pay Subcontractor Immediately */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                checked={valuationForm.auto_pay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setValuationForm((prev) => {
                    const next = {
                      ...prev,
                      auto_pay: checked,
                      auto_raise_bill: true,
                    };
                    if (checked && !prev.payment_account_id) {
                      const filtered = getFilteredPaymentAccounts(prev.payment_method || "Bank Transfer");
                      const nextAccId = filtered[0]?.id
                        ? String(filtered[0].id)
                        : paymentAccounts[0]?.id
                          ? String(paymentAccounts[0].id)
                          : "";
                      next.payment_account_id = nextAccId;
                      if (nextAccId) fetchAccountBalance(nextAccId, true);
                    }
                    return next;
                  });
                }}
              />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CreditCard size={15} className="text-emerald-600" /> Pay Subcontractor Immediately
              </span>
            </label>
          </div>

          {/* Direct Payment Fields (Inspired by Payment Voucher Direct Payment section) */}
          {valuationForm.auto_pay && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-3 bg-white dark:bg-slate-800/80 p-3.5 rounded-lg border">
              <div className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Wallet size={13} /> Direct Disbursement Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 font-medium"
                    value={valuationForm.payment_method || ""}
                    onChange={(e) => handlePaymentMethodChange(e.target.value, true)}
                  >
                    <option value="">-- Select Payment Method --</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Electronic / EFT">Electronic / EFT</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {valuationForm.payment_method === "Cash"
                      ? "Cash Account"
                      : valuationForm.payment_method === "Mobile Money"
                        ? "Mobile Money / Cash Account"
                        : "Bank Account"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    required={valuationForm.auto_pay}
                    disabled={!valuationForm.payment_method}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    value={valuationForm.payment_account_id || ""}
                    onChange={(e) => {
                      const accId = e.target.value;
                      setValuationForm({ ...valuationForm, payment_account_id: accId });
                      if (accId) fetchAccountBalance(accId, true);
                    }}
                  >
                    <option value="">
                      {valuationForm.payment_method
                        ? `-- Select ${valuationForm.payment_method === "Cash" ? "Cash" : valuationForm.payment_method === "Mobile Money" ? "Mobile Money" : "Bank"} Account --`
                        : "-- Select Payment Method First --"}
                    </option>
                    {getFilteredPaymentAccounts(valuationForm.payment_method).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                  {valuationForm.payment_account_id && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Available Balance:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        GHS{" "}
                        {Number(
                          accountBalances[valuationForm.payment_account_id] ?? 0
                        ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {valuationForm.payment_method === "Cheque"
                      ? "Cheque Number *"
                      : valuationForm.payment_method === "Bank Transfer"
                        ? "Transfer Ref / Transaction ID *"
                        : valuationForm.payment_method === "Mobile Money"
                          ? "MoMo Transaction ID / Reference *"
                          : "Receipt / Cash Voucher Ref (Optional)"}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      valuationForm.payment_method === "Cheque"
                        ? "e.g. CHQ-001234"
                        : valuationForm.payment_method === "Bank Transfer"
                          ? "e.g. TRF-982143"
                          : valuationForm.payment_method === "Mobile Money"
                            ? "e.g. MM-240123 / 0244xxxxxx"
                            : "e.g. CSH-001 / Receipt #"
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 font-mono"
                    value={
                      valuationForm.payment_method === "Cheque"
                        ? valuationForm.cheque_number
                        : valuationForm.payment_reference
                    }
                    onChange={(e) => {
                      if (valuationForm.payment_method === "Cheque") {
                        setValuationForm({
                          ...valuationForm,
                          cheque_number: e.target.value,
                          payment_reference: e.target.value,
                        });
                      } else {
                        setValuationForm({
                          ...valuationForm,
                          payment_reference: e.target.value,
                        });
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {valuationForm.payment_method === "Cheque"
                      ? "Cheque Date *"
                      : valuationForm.payment_method === "Bank Transfer"
                        ? "Transfer Date *"
                        : "Payment Date *"}
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 font-mono"
                    value={valuationForm.cheque_date || valuationForm.period_to}
                    onChange={(e) =>
                      setValuationForm({ ...valuationForm, cheque_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Narration
                </label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                  value={valuationForm.payment_narration}
                  onChange={(e) =>
                    setValuationForm({ ...valuationForm, payment_narration: e.target.value })
                  }
                  placeholder="e.g. Direct subcontractor disbursement for certified IPC"
                />
              </div>
            </div>
          )}

          {/* Subcontract Completion Automation */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary mt-0.5"
              checked={valuationForm.mark_work_completed || false}
              onChange={(e) =>
                setValuationForm({ ...valuationForm, mark_work_completed: e.target.checked })
              }
            />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Final Certificate / Subcontract Work Completed
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Marks this subcontract as Completed and automatically updates the linked Scope, WBS, and Gantt tasks to 100% Completed.
              </span>
            </div>
          </label>
        </div>
      </ProjectModal>

      {/* Modal: Direct Pay Existing Subcontractor Valuation */}
      <ProjectModal
        open={Boolean(showPayModal && selectedValToPay)}
        onClose={() => setShowPayModal(false)}
        title="Direct Subcontractor Payment"
        subtitle={`Settle IPC ${selectedValToPay?.valuation_number || selectedValToPay?.valuation_no || ""} - ${selectedValToPay?.supplier_name || ""}`}
        icon={CreditCard}
        onSubmit={handlePayValuationSubmit}
        submitLabel={
          payingValuation
            ? "Processing Payment..."
            : `Disburse GHS ${Number(selectedValToPay?.net_payable ?? selectedValToPay?.net_certified_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        }
      >
        <div className="p-3 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 rounded-xl flex justify-between items-center mb-4">
          <div>
            <p className="text-xs font-bold uppercase text-brand-900 dark:text-brand-300">
              Net Certified Payable
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              IPC Ref: {selectedValToPay?.valuation_number || selectedValToPay?.valuation_no}
            </p>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            GHS{" "}
            {Number(
              selectedValToPay?.net_payable ?? selectedValToPay?.net_certified_amount ?? 0
            ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 font-medium"
                value={payForm.payment_method || ""}
                onChange={(e) => handlePaymentMethodChange(e.target.value, false)}
              >
                <option value="">-- Select Payment Method --</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Electronic / EFT">Electronic / EFT</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {payForm.payment_method === "Cash"
                  ? "Cash Account"
                  : payForm.payment_method === "Mobile Money"
                    ? "Mobile Money / Cash Account"
                    : "Bank Account"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                required
                disabled={!payForm.payment_method}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                value={payForm.payment_account_id || ""}
                onChange={(e) => {
                  const accId = e.target.value;
                  setPayForm({ ...payForm, payment_account_id: accId });
                  if (accId) fetchAccountBalance(accId, true);
                }}
              >
                <option value="">
                  {payForm.payment_method
                    ? `-- Select ${payForm.payment_method === "Cash" ? "Cash" : payForm.payment_method === "Mobile Money" ? "Mobile Money" : "Bank"} Account --`
                    : "-- Select Payment Method First --"}
                </option>
                {getFilteredPaymentAccounts(payForm.payment_method).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
              {payForm.payment_account_id && (
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Available Balance:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    GHS{" "}
                    {Number(
                      accountBalances[payForm.payment_account_id] ?? 0
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {payForm.payment_method === "Cheque"
                  ? "Cheque Number *"
                  : payForm.payment_method === "Bank Transfer"
                    ? "Transfer Ref / Transaction ID *"
                    : payForm.payment_method === "Mobile Money"
                      ? "MoMo Transaction ID / Reference *"
                      : "Receipt / Cash Voucher Ref (Optional)"}
              </label>
              <input
                type="text"
                placeholder={
                  payForm.payment_method === "Cheque"
                    ? "e.g. CHQ-001234"
                    : payForm.payment_method === "Bank Transfer"
                      ? "e.g. TRF-982143"
                      : payForm.payment_method === "Mobile Money"
                        ? "e.g. MM-240123 / 0244xxxxxx"
                        : "e.g. CSH-001 / Receipt #"
                }
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 font-mono"
                value={
                  payForm.payment_method === "Cheque"
                    ? payForm.cheque_number
                    : payForm.payment_reference
                }
                onChange={(e) => {
                  if (payForm.payment_method === "Cheque") {
                    setPayForm({
                      ...payForm,
                      cheque_number: e.target.value,
                      payment_reference: e.target.value,
                    });
                  } else {
                    setPayForm({ ...payForm, payment_reference: e.target.value });
                  }
                }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {payForm.payment_method === "Cheque"
                  ? "Cheque Date *"
                  : payForm.payment_method === "Bank Transfer"
                    ? "Transfer Date *"
                    : "Payment Date *"}
              </label>
              <input
                type="date"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 font-mono"
                value={payForm.cheque_date}
                onChange={(e) => setPayForm({ ...payForm, cheque_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Narration
            </label>
            <input
              type="text"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
              value={payForm.payment_narration}
              onChange={(e) => setPayForm({ ...payForm, payment_narration: e.target.value })}
              placeholder="e.g. Direct subcontractor disbursement for certified IPC"
            />
          </div>
        </div>
      </ProjectModal>

      {/* Modal: Quick Add Subcontractor */}
      <ProjectModal
        open={showAddSubModal}
        onClose={() => setShowAddSubModal(false)}
        title="Register New Subcontractor"
        subtitle="Quickly add a contractor or trade specialist directly to your vendor registry"
        icon={Users}
        onSubmit={handleQuickAddSubcontractor}
        submitLabel={savingSub ? "Saving..." : "Save Subcontractor"}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Subcontractor / Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex MEP & Electrical Engineering Ltd"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              value={newSubForm.supplier_name}
              onChange={(e) =>
                setNewSubForm({ ...newSubForm, supplier_name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Trade / Specialty
              </label>
              <input
                type="text"
                placeholder="e.g. Electrical / Roofing / Glazing / HVAC"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={newSubForm.trade}
                onChange={(e) =>
                  setNewSubForm({ ...newSubForm, trade: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. John Mensah"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={newSubForm.contact_person}
                onChange={(e) =>
                  setNewSubForm({ ...newSubForm, contact_person: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. +233 24 123 4567"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                value={newSubForm.phone}
                onChange={(e) =>
                  setNewSubForm({ ...newSubForm, phone: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. contact@apexengineering.com"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={newSubForm.email}
                onChange={(e) =>
                  setNewSubForm({ ...newSubForm, email: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Address / Location
            </label>
            <input
              type="text"
              placeholder="e.g. Plot 12 Spintex Road, Accra"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={newSubForm.address}
              onChange={(e) =>
                setNewSubForm({ ...newSubForm, address: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Associated Purchase / Expense Account
            </label>
            <select
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              value={newSubForm.expense_account_id}
              onChange={(e) =>
                setNewSubForm({ ...newSubForm, expense_account_id: e.target.value })
              }
            >
              <option value="">-- Service Account (Default: Auto-Linked) --</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code ? `${a.code} - ` : ""}{a.name} ({a.group_name || "Expense"})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Defaults to "Service Account" under Direct Costs / COGS. Changeable to any expense account.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Subcontractors are automatically saved as registered service contractors</span>
            <Link
              to="/project-management/setup?tab=subcontractors"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium inline-flex items-center gap-1"
            >
              Open Full Setup <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </ProjectModal>

    </div>

  );

}

