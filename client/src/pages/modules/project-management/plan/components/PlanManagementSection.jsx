import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Award,
  ShoppingCart,
  MessageSquare,
  HeartPulse,
  ExternalLink,
  Plus,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Building2,
  Flame,
  ShieldCheck,
} from "lucide-react";

export default function PlanManagementSection({
  project,
  plan,
  summaries = {},
  onChangePlan,
  readOnly = false,
  planReturnState,
}) {
  const [subTab, setSubTab] = useState("risk"); // "risk" | "quality" | "procurement" | "comm" | "hse"

  const mgmt = plan?.management_plans || {};
  const risks = summaries.risks || [];
  const qualityPlans = summaries.qualityPlans || [];

  const handleUpdateSection = (sectionKey, field, val) => {
    onChangePlan({
      management_plans: {
        ...mgmt,
        [sectionKey]: {
          ...(mgmt[sectionKey] || {}),
          [field]: val,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Consolidated Subtab Control Bar & Authoritative Portal Link ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setSubTab("risk")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === "risk"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldAlert size={13} className="text-rose-500" />
            <span>Risk Plan ({risks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("quality")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === "quality"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Award size={13} className="text-amber-500" />
            <span>Quality Plan ({qualityPlans.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("procurement")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === "procurement"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShoppingCart size={13} className="text-sky-500" />
            <span>Procurement Plan</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("comm")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === "comm"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquare size={13} className="text-purple-500" />
            <span>Communication &amp; Stakeholder</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("hse")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === "hse"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <HeartPulse size={13} className="text-emerald-500" />
            <span>HSE &amp; Safety</span>
          </button>
        </div>

        {/* Direct Link to Authoritative Live Register */}
        <div className="shrink-0 self-end sm:self-auto px-1">
          {subTab === "risk" && (
            <Link
              to={`/project-management/risk-management?projectId=${project?.id}&from=plan`}
              state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs border border-slate-200/80 dark:border-slate-700/60"
            >
              <span>Open Risk Register</span>
              <ExternalLink size={12} className="text-slate-400" />
            </Link>
          )}
          {subTab === "quality" && (
            <Link
              to={`/project-management/quality-control?projectId=${project?.id}&from=plan`}
              state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs border border-slate-200/80 dark:border-slate-700/60"
            >
              <span>Open Quality Control</span>
              <ExternalLink size={12} className="text-slate-400" />
            </Link>
          )}
          {subTab === "procurement" && (
            <Link
              to={`/project-management/purchase-requisitions?project_id=${project?.id}&from=plan`}
              state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs border border-slate-200/80 dark:border-slate-700/60"
            >
              <span>Open Purchase Requisitions</span>
              <ExternalLink size={12} className="text-slate-400" />
            </Link>
          )}
          {subTab === "comm" && (
            <Link
              to={`/project-management/stakeholders?project_id=${project?.id}&from=plan`}
              state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs border border-slate-200/80 dark:border-slate-700/60"
            >
              <span>Open Stakeholders</span>
              <ExternalLink size={12} className="text-slate-400" />
            </Link>
          )}
          {subTab === "hse" && (
            <Link
              to={`/project-management/safety?projectId=${project?.id}&from=plan`}
              state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs border border-slate-200/80 dark:border-slate-700/60"
            >
              <span>Open Safety Management</span>
              <ExternalLink size={12} className="text-slate-400" />
            </Link>
          )}
        </div>
      </div>

      {/* ── SUBTAB 1: RISK MANAGEMENT PLAN ── */}
      {subTab === "risk" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Risk Management Approach &amp; Policy
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Overall approach for managing project uncertainty and threats..."
                value={mgmt.risk?.approach || ""}
                onChange={(e) => handleUpdateSection("risk", "approach", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Risk Identification Method
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("risk", "identificationMethod", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select Preset Method --</option>
                  <option value="Daily Site Safety Walks, HAZOP Workshops & Engineering Design Audits">Daily Walks, HAZOP & Audits</option>
                  <option value="Contractor Risk Workshops & Historical Lessons-Learned Registers">Contractor Risk Workshops</option>
                  <option value="Third-Party Quality & Environmental Audits with Incident Logging">Third-Party Audits & Logging</option>
                  <option value="Continuous Subcontractor Hazard Reports & Weekly Toolboxes">Continuous Hazard Reports</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="How risks are identified (inspections, design reviews, contractor workshops)..."
                value={mgmt.risk?.identificationMethod || ""}
                onChange={(e) => handleUpdateSection("risk", "identificationMethod", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Risk Assessment &amp; Scoring Approach
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("risk", "assessmentApproach", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select Scoring Matrix --</option>
                  <option value="5x5 Likelihood x Impact Matrix (PMI / ISO 31000 Standard)">5x5 Matrix (PMI / ISO 31000)</option>
                  <option value="3x3 High / Medium / Low Qualitative Severity Scale">3x3 High/Medium/Low Scale</option>
                  <option value="Quantitative Probability % multiplied by Expected Financial Loss">Quantitative Financial Loss</option>
                  <option value="Critical Path Delay Severity Index (Schedule Risk Analysis)">Critical Path Delay Severity</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Likelihood and impact scoring, severity matrices, and thresholds..."
                value={mgmt.risk?.assessmentApproach || ""}
                onChange={(e) => handleUpdateSection("risk", "assessmentApproach", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Response Strategy &amp; Monitoring Cadence
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("risk", "responseStrategy", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select Monitoring Cadence --</option>
                  <option value="Weekly PM Review & Risk Register Updates with Mitigation Owners">Weekly PM Review & Updates</option>
                  <option value="Bi-Weekly Stage-Gate Milestone Governance & Variance Tracking">Bi-Weekly Stage-Gate Governance</option>
                  <option value="Monthly Executive Steering Committee Review & Tolerance Check">Monthly Steering Committee</option>
                  <option value="Daily Active Site Monitoring with Immediate Escalation Protocol">Daily Active Monitoring</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Mitigation, avoidance, transfer via insurance, and reassessment frequency..."
                value={mgmt.risk?.responseStrategy || ""}
                onChange={(e) => handleUpdateSection("risk", "responseStrategy", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Live Top Active Risks summary */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Current Project Risks from Register ({risks.length})
            </span>

            {risks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {risks.slice(0, 6).map((rk) => (
                  <div
                    key={rk.id}
                    className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-500">{rk.risk_code}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded ${
                          rk.inherent_level === "CRITICAL" || rk.inherent_level === "HIGH"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        Score: {rk.inherent_score || 9}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white block line-clamp-1">
                      {rk.title}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      Owner: {rk.risk_owner || "Unassigned"} • Strategy: {rk.response_strategy || "Mitigate"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No individual risk items recorded in project risk register.</p>
            )}
          </div>
        </div>
      )}

      {/* ── SUBTAB 2: QUALITY MANAGEMENT PLAN ── */}
      {subTab === "quality" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Project Quality Objectives &amp; Targets
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Specific quality thresholds, zero non-conformance policy, and target pass rates..."
                value={mgmt.quality?.objectives || ""}
                onChange={(e) => handleUpdateSection("quality", "objectives", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Applicable Standards &amp; Codes
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("quality", "standards", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select Standard Code --</option>
                  <option value="ISO 9001:2015 Quality Management System Standard">ISO 9001:2015 QMS</option>
                  <option value="AASHTO / ASTM International Material & Civil Standards">AASHTO / ASTM Standards</option>
                  <option value="National Building Code & Eurocode Regulatory Compliance">Building Code & Eurocodes</option>
                  <option value="IEEE & IEC Electrical and Power Systems Standards">IEEE & IEC Standards</option>
                  <option value="Client Contractual Specifications & Bespoke QA Matrix">Client Bespoke Specs</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="e.g. ISO 9001:2015, British Standards, National Building Code, IEEE..."
                value={mgmt.quality?.standards || ""}
                onChange={(e) => handleUpdateSection("quality", "standards", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Quality Assurance (QA) Strategy
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("quality", "qaApproach", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select QA Strategy --</option>
                  <option value="Hold Points & Witness Points (Inspection Test Plan / ITP)">Hold & Witness Points (ITP)</option>
                  <option value="Third-Party Certified Independent Testing Laboratory">Third-Party Certified Lab</option>
                  <option value="Vendor Pre-Qualification & Material Approval Submittals (MAR)">Vendor Pre-Qual & MAR</option>
                  <option value="Comprehensive Factory Acceptance Testing (FAT) & Walkthrough">Factory Acceptance (FAT)</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Pre-qualification of vendors, material approval requests (MAR), and sample submittals..."
                value={mgmt.quality?.qaApproach || ""}
                onChange={(e) => handleUpdateSection("quality", "qaApproach", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Quality Control (QC) &amp; Testing Strategy
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("quality", "qcApproach", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select QC Approach --</option>
                  <option value="Inspection Requests (IR) & Work Inspection Notices at Stage Gates">Inspection Requests (IR)</option>
                  <option value="Non-Conformance Reporting (NCR) with 48h Corrective Action">NCR with 48h Action</option>
                  <option value="Continuous Core Compaction, Concrete Slump & Pressure Tests">Continuous Lab Material Tests</option>
                  <option value="Pre-Commissioning Walkthrough & Joint Punch List Sign-Off">Joint Punch List Sign-Off</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Inspection Requests (IR), non-conformance reporting (NCR), laboratory core tests..."
                value={mgmt.quality?.qcApproach || ""}
                onChange={(e) => handleUpdateSection("quality", "qcApproach", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 3: PROCUREMENT MANAGEMENT PLAN ── */}
      {subTab === "procurement" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Procurement &amp; Sourcing Strategy
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("procurement", "strategy", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select Sourcing Strategy --</option>
                  <option value="Selective Tender from Pre-Qualified Approved Vendor List (AVL)">Selective Tender (AVL)</option>
                  <option value="Open Public Competitive Tender & RFP Package Bidding">Open Public RFP Tender</option>
                  <option value="Single-Source Direct Framework Agreement with Volume Discounts">Single-Source Framework</option>
                  <option value="Turnkey EPC Subcontract Package with Milestone Acceptance">Turnkey EPC Subcontract</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Bulk framework contracts, competitive tenders, and trade package splits..."
                value={mgmt.procurement?.strategy || ""}
                onChange={(e) => handleUpdateSection("procurement", "strategy", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Critical Long-Lead Items
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Imported equipment, heavy structural packages, generators, custom glazing..."
                value={mgmt.procurement?.longLeadItems || ""}
                onChange={(e) => handleUpdateSection("procurement", "longLeadItems", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Major Material &amp; Service Requirements
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Aggregate volume, steel tonnage, concrete batches, scaffolding rentals..."
                value={mgmt.procurement?.majorRequirements || ""}
                onChange={(e) => handleUpdateSection("procurement", "majorRequirements", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Supplier &amp; Contractor Management Approach
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("procurement", "supplierApproach", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select Contract Model --</option>
                  <option value="Lump-Sum Fixed Price (FIDIC Red Book / Turnkey EPC)">Lump-Sum (FIDIC Red)</option>
                  <option value="Measured BOQ Unit Rate Schedule (FIDIC Pink Book)">Unit Rate (FIDIC Pink)</option>
                  <option value="Cost-Plus Incentive Fee (CPIF) with Performance Retentions">Cost-Plus Incentive</option>
                  <option value="Time & Materials (T&M) Rate Card with Not-to-Exceed Cap">Time & Materials (T&M)</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="On-site delivery inspection, payment certification terms, defect retention..."
                value={mgmt.procurement?.supplierApproach || ""}
                onChange={(e) => handleUpdateSection("procurement", "supplierApproach", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 4: COMMUNICATION & STAKEHOLDER MANAGEMENT ── */}
      {subTab === "comm" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Key Project Stakeholders
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Client representatives, steering committee, local community, municipal regulators..."
                value={mgmt.communication?.stakeholders || ""}
                onChange={(e) => handleUpdateSection("communication", "stakeholders", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Reporting Cadence &amp; Deliverables
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("communication", "frequency", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select Reporting Cadence --</option>
                  <option value="Weekly Formal Progress Report & Contractor Meeting">Weekly Formal Progress</option>
                  <option value="Daily Standup Logs & Weekly Consolidated Dashboard">Daily Standup + Weekly</option>
                  <option value="Bi-Weekly Stage-Gate Review & Variance Memos">Bi-Weekly Stage-Gate Review</option>
                  <option value="Monthly Executive Governance Review & Cost S-Curve">Monthly Executive Governance</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Daily site logbooks, weekly contractor progress meetings, monthly executive dashboards..."
                value={mgmt.communication?.frequency || ""}
                onChange={(e) => handleUpdateSection("communication", "frequency", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Communication Channels &amp; Methods
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("communication", "methods", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select Channel Method --</option>
                  <option value="OmniSuite ERP Integrated Real-Time Live Dashboard & Transmittals">OmniSuite ERP Dashboard</option>
                  <option value="Formal Document Transmittals, PDF Summaries & Variance Memos">Formal Transmittals & Memos</option>
                  <option value="On-Site Morning Standups, Toolboxes & Daily Site Diaries">Site Standups & Diaries</option>
                  <option value="Email Distribution Registers & Bi-Weekly Executive Reviews">Email Registers & Reviews</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="OmniSuite ERP portal, formal transmittals, site standups, email registers..."
                value={mgmt.communication?.methods || ""}
                onChange={(e) => handleUpdateSection("communication", "methods", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Issue Escalation Pathways
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Resolution hierarchy: Site Supervisor → Lead PM → Steering Board → Arbitration..."
                value={mgmt.communication?.escalationChannels || ""}
                onChange={(e) => handleUpdateSection("communication", "escalationChannels", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 5: HEALTH, SAFETY & ENVIRONMENTAL (HSE) ── */}
      {subTab === "hse" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Health &amp; Safety Objectives
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("hse", "objectives", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select HSE Objective --</option>
                  <option value="Zero Lost Time Injuries (LTI) & Zero Fatalities Safety Target">Zero LTI & Fatalities</option>
                  <option value="Mandatory 100% PPE Compliance & Immediate Near-Miss Reporting">100% PPE & Near-Miss Log</option>
                  <option value="ISO 45001 Occupational Health & Safety Regulatory Compliance">ISO 45001 Safety Standard</option>
                  <option value="Behavior-Based Safety (BBS) Continuous Improvement Framework">Behavior-Based Safety (BBS)</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Zero Lost Time Injuries (LTI), mandatory PPE compliance, daily briefings..."
                value={mgmt.hse?.objectives || ""}
                onChange={(e) => handleUpdateSection("hse", "objectives", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Environmental &amp; Sustainability Requirements
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Waste disposal protocols, dust control, noise limits, spill containment..."
                value={mgmt.hse?.environmentalRequirements || ""}
                onChange={(e) => handleUpdateSection("hse", "environmentalRequirements", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Emergency Preparedness &amp; Evacuation Strategy
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Assembly points, site first-aid wardens, hospital transport readiness..."
                value={mgmt.hse?.emergencyPreparedness || ""}
                onChange={(e) => handleUpdateSection("hse", "emergencyPreparedness", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Site Safety Supervision &amp; Toolbox Talks Cadence
                </label>
                <select
                  disabled={readOnly}
                  onChange={(e) => e.target.value && handleUpdateSection("hse", "siteSafetyApproach", e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">-- Select Safety Cadence --</option>
                  <option value="Mandatory Daily Morning Toolbox Briefings & Permit-to-Work (PTW) Audits">Daily Toolbox & PTW Audits</option>
                  <option value="Weekly Site Safety Walks & High-Risk Activity Pre-Inspections">Weekly Safety Walks</option>
                  <option value="Dedicated Full-Time HSE Officer On-Site Continuous Supervision">Full-Time Safety Officer</option>
                  <option value="Bi-Weekly Cross-Functional Joint Safety Committee Inspections">Joint Safety Committee</option>
                </select>
              </div>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Mandatory daily morning toolbox briefings, permit to work (PTW) for hot/height works..."
                value={mgmt.hse?.siteSafetyApproach || ""}
                onChange={(e) => handleUpdateSection("hse", "siteSafetyApproach", e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
