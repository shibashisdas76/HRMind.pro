/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Calendar, Plus, Check, X, FileText, AlertCircle, RefreshCw, Upload } from "lucide-react";
import { UserRole, TimeOffRequestStatus } from "../types.js";

interface TimeOffTabProps {
  token: string;
  userRole: UserRole;
  employeeId: string;
  draftLeaveRequest: any; // Passed from App when Gemini schedules a draft leave
  onClearDraft: () => void;
}

export function TimeOffTab({ token, userRole, employeeId, draftLeaveRequest, onClearDraft }: TimeOffTabProps) {
  const [activeTab, setActiveTab] = useState<"self" | "admin">(
    userRole === UserRole.Employee ? "self" : "admin"
  );

  // Balances & personal requests
  const [balances, setBalances] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Admin approvals list
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [timeOffTypeId, setTimeOffTypeId] = useState("type-paid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Admin actions
  const [actionComments, setActionComments] = useState<{ [reqId: string]: string }>({});

  const fetchBalances = async () => {
    setLoadingBalances(true);
    try {
      const response = await fetch(`/api/timeoff/balances/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setBalances(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBalances(false);
    }
  };

  const fetchMyRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch("/api/timeoff/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setMyRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchAdminRequests = async () => {
    setLoadingAdmin(true);
    try {
      const response = await fetch("/api/timeoff/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setAdminRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    fetchMyRequests();
    if (userRole !== UserRole.Employee) {
      fetchAdminRequests();
    }
  }, [employeeId]);

  // Handle auto-prefilling draft leave request from Gemini Assistant
  useEffect(() => {
    if (draftLeaveRequest) {
      setTimeOffTypeId(draftLeaveRequest.timeOffTypeId || "type-sick");
      setStartDate(draftLeaveRequest.startDate || "");
      setEndDate(draftLeaveRequest.endDate || "");
      setRemarks(draftLeaveRequest.remarks || "Drafted via Mind Assistant");
      setModalOpen(true);
      onClearDraft(); // Consume draft
    }
  }, [draftLeaveRequest]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setSubmitError("Please select both start and end dates.");
      return;
    }

    setSubmitError("");
    setSubmitSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/timeoff/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timeOffTypeId,
          startDate,
          endDate,
          remarks,
          attachmentUrl: timeOffTypeId === "type-sick" && !attachmentUrl ? "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200" : attachmentUrl, // Provide mock medical cert by default
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitSuccess("Time-off request successfully submitted!");
      fetchMyRequests();
      fetchBalances();
      if (userRole !== UserRole.Employee) {
        fetchAdminRequests();
      }

      setTimeout(() => {
        setModalOpen(false);
        setStartDate("");
        setEndDate("");
        setRemarks("");
        setAttachmentUrl("");
        setSubmitSuccess("");
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewRequest = async (id: string, status: "approve" | "reject") => {
    const comments = actionComments[id] || "";
    try {
      const response = await fetch(`/api/timeoff/requests/${id}/${status}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comments }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Action failed");
        return;
      }

      fetchAdminRequests();
      fetchBalances();
      fetchMyRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(days) ? 0 : days;
  };

  return (
    <div className="space-y-6">
      {/* Tab Selectors for Admin / HR */}
      {userRole !== UserRole.Employee && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("admin")}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "admin"
                ? "border-[#2F5CE0] text-[#2F5CE0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Review Applications ({adminRequests.filter((r) => r.status === TimeOffRequestStatus.Pending).length} pending)
          </button>
          <button
            onClick={() => setActiveTab("self")}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "self"
                ? "border-[#2F5CE0] text-[#2F5CE0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            My Time Off Balances & Requests
          </button>
        </div>
      )}

      {/* 1. EMPLOYEE TIME-OFF PANEL */}
      {activeTab === "self" && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-100 card-shadow">
            <div>
              <h2 className="text-lg font-bold text-[#0B1B42]">Time Off Desk</h2>
              <p className="text-xs text-slate-500">View balances, apply for leaves, or verify approval states.</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-[#2F5CE0] hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg flex items-center space-x-2 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loadingBalances ? (
              <div className="col-span-3 text-center text-slate-400 py-4">Loading balances...</div>
            ) : balances.length === 0 ? (
              <div className="col-span-3 text-center text-slate-400 py-4">No balances loaded.</div>
            ) : (
              balances.map((b) => (
                <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-100 card-shadow flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{b.typeName}</span>
                    <p className="text-3xl font-extrabold text-[#0B1B42] mt-1 tabular">{b.daysAvailable} days</p>
                    <span className="text-[10px] text-slate-400 font-medium">Year: {b.year}</span>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    b.timeOffTypeId === "type-sick" ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-[#2F5CE0]"
                  }`}>
                    {b.timeOffTypeId === "type-sick" ? "🏥" : "🌴"}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Leave Requests Table */}
          <div className="bg-white rounded-xl border border-slate-100 card-shadow overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-[#0B1B42] text-sm">My Leave Requests History</h3>
              <button onClick={() => { fetchMyRequests(); fetchBalances(); }} className="text-slate-400 hover:text-[#2F5CE0]">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Leave Type</th>
                  <th className="py-3 px-6">Dates</th>
                  <th className="py-3 px-6">Days Requested</th>
                  <th className="py-3 px-6">Remarks</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Reviewed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">Loading requests...</td>
                  </tr>
                ) : myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">No leave requests applied yet.</td>
                  </tr>
                ) : (
                  myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-semibold text-slate-700">{req.typeName}</td>
                      <td className="py-3.5 px-6 text-slate-600 tabular">
                        {req.startDate} to {req.endDate}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-700 tabular">{req.allocationDays} days</td>
                      <td className="py-3.5 px-6 text-slate-500 max-w-[150px] truncate" title={req.remarks}>
                        {req.remarks || "—"}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            req.status === TimeOffRequestStatus.Approved
                              ? "bg-green-50 text-green-700 border border-green-100"
                              : req.status === TimeOffRequestStatus.Pending
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {req.reviewedBy ? (
                          <div>
                            <div className="font-semibold">{req.reviewedBy}</div>
                            {req.comments && <div className="text-[10px] italic text-slate-400">"{req.comments}"</div>}
                          </div>
                        ) : "Pending"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. ADMIN TIME-OFF APPLICATIONS REGISTER */}
      {activeTab === "admin" && userRole !== UserRole.Employee && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-100 card-shadow flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#0B1B42]">Leave Approvals Workspace</h2>
              <p className="text-xs text-slate-500">Approve, reject, or comment on teammate leave requests live.</p>
            </div>
            <button onClick={fetchAdminRequests} className="p-2 text-slate-400 hover:text-[#2F5CE0]">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 card-shadow overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Teammate</th>
                  <th className="py-3 px-6">Leave Type</th>
                  <th className="py-3 px-6">Duration</th>
                  <th className="py-3 px-6">Attachment / Remarks</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Review / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingAdmin ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">Loading requests...</td>
                  </tr>
                ) : adminRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">No applications on file.</td>
                  </tr>
                ) : (
                  adminRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6">
                        <div>
                          <div className="font-semibold text-slate-700">{req.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{req.department}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-700">{req.typeName}</td>
                      <td className="py-3.5 px-6 text-slate-600 tabular">
                        <div>{req.startDate} to {req.endDate}</div>
                        <div className="text-[10px] text-indigo-600 font-bold mt-0.5">{req.allocationDays} working days</div>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="space-y-1">
                          <div className="text-slate-600 italic">"{req.remarks || "No comments"}"</div>
                          {req.attachmentUrl && (
                            <a
                              href={req.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-xs text-[#2F5CE0] font-semibold hover:underline"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Medical Doc</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            req.status === TimeOffRequestStatus.Approved
                              ? "bg-green-50 text-green-700 border border-green-100"
                              : req.status === TimeOffRequestStatus.Pending
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        {req.status === TimeOffRequestStatus.Pending ? (
                          <div className="flex flex-col space-y-2">
                            <input
                              type="text"
                              placeholder="Review comment..."
                              value={actionComments[req.id] || ""}
                              onChange={(e) =>
                                setActionComments((prev) => ({
                                  ...prev,
                                  [req.id]: e.target.value,
                                }))
                              }
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:bg-white"
                            />
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleReviewRequest(req.id, "approve")}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold text-[10px] px-2 py-1 rounded flex items-center justify-center space-x-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewRequest(req.id, "reject")}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-[10px] px-2 py-1 rounded flex items-center justify-center space-x-1 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">
                            <div>Reviewed by {req.reviewedBy}</div>
                            {req.comments && <div className="italic text-[10px]">"{req.comments}"</div>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORM MODAL APPLY FOR LEAVE */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#0B1B42]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#0B1B42] mb-1">Time-Off Type Request</h3>
            <p className="text-xs text-slate-500 mb-4">Request Paid, Sick, or Unpaid validity days directly.</p>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              {submitError && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
              {submitSuccess && (
                <div className="p-3 bg-green-50 text-green-600 text-xs rounded-lg border border-green-100">
                  {submitSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Time Off Type</label>
                <select
                  value={timeOffTypeId}
                  onChange={(e) => setTimeOffTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                >
                  <option value="type-paid">Paid Time Off (🌴)</option>
                  <option value="type-sick">Sick Time Off (🏥)</option>
                  <option value="type-unpaid">Unpaid Leave (🏠)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                    required
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 flex justify-between items-center">
                  <span className="text-xs text-slate-600 font-medium">Computed days request:</span>
                  <span className="text-sm font-extrabold text-[#2F5CE0] tabular">{calculateDays()} Days</span>
                </div>
              )}

              {timeOffTypeId === "type-sick" && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg space-y-2">
                  <div className="flex items-start space-x-2 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>A clinical certificate or medical report is required for Sick Time Off.</span>
                  </div>
                  <div className="border border-dashed border-amber-200 bg-white p-3 rounded-md flex flex-col items-center justify-center text-center cursor-pointer">
                    <Upload className="w-5 h-5 text-amber-500 mb-1" />
                    <span className="text-[10px] font-bold text-slate-600">medical_report.pdf</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">(Uploaded automatically by assistant)</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Remarks & Reason</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="State your reason for application..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#2F5CE0] hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Submitting request..." : "Submit Time Off Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
