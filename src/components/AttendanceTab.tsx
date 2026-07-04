/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Clock, Calendar, Search, ArrowRight, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { UserRole, AttendanceStatus } from "../types.js";

interface AttendanceTabProps {
  token: string;
  userRole: UserRole;
  employeeId: string;
}

export function AttendanceTab({ token, userRole, employeeId }: AttendanceTabProps) {
  const [activeTab, setActiveTab] = useState<"self" | "team">(
    userRole === UserRole.Employee ? "self" : "team"
  );
  
  // Employee personal calendar state
  const [month, setMonth] = useState("2026-07");
  const [selfLogs, setSelfLogs] = useState<any[]>([]);
  const [loadingSelf, setLoadingSelf] = useState(false);

  // Admin/HR master team state
  const [selectedDate, setSelectedDate] = useState("2026-07-04");
  const [teamLogs, setTeamLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(false);

  const fetchSelfLogs = async () => {
    setLoadingSelf(true);
    try {
      const response = await fetch(`/api/attendance?employeeId=${employeeId}&month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSelfLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSelf(false);
    }
  };

  const fetchTeamLogs = async () => {
    setLoadingTeam(true);
    try {
      const response = await fetch(`/api/attendance?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setTeamLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (userRole === UserRole.Employee || activeTab === "self") {
      fetchSelfLogs();
    }
  }, [month, activeTab]);

  useEffect(() => {
    if (userRole !== UserRole.Employee && activeTab === "team") {
      fetchTeamLogs();
    }
  }, [selectedDate, activeTab]);

  // Self logs stats calculations
  const totalWorkingDays = selfLogs.length;
  const presentCount = selfLogs.filter((l) => l.status === AttendanceStatus.Present || l.status === AttendanceStatus.HalfDay).length;
  const leavesCount = selfLogs.filter((l) => l.status === AttendanceStatus.Leave).length;
  const absentCount = selfLogs.filter((l) => l.status === AttendanceStatus.Absent).length;
  const totalHours = selfLogs.reduce((acc, curr) => acc + (curr.workHours || 0), 0);
  const extraHours = selfLogs.reduce((acc, curr) => acc + (curr.extraHours || 0), 0);

  const filteredTeamLogs = teamLogs.filter((log) => {
    const term = searchQuery.toLowerCase();
    return (
      log.employeeName?.toLowerCase().includes(term) ||
      log.department?.toLowerCase().includes(term) ||
      log.jobPosition?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Tab Selectors (Admin / HR only) */}
      {userRole !== UserRole.Employee && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("team")}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "team"
                ? "border-[#2F5CE0] text-[#2F5CE0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Team Attendance Daily View
          </button>
          <button
            onClick={() => setActiveTab("self")}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "self"
                ? "border-[#2F5CE0] text-[#2F5CE0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            My Monthly Log
          </button>
        </div>
      )}

      {/* 1. SELF MONTHLY ATTENDANCE */}
      {activeTab === "self" && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-100 card-shadow">
            <div>
              <h2 className="text-lg font-bold text-[#0B1B42]">Personal Monthly Log</h2>
              <p className="text-xs text-slate-500">Track and review your check-in timings and accrued hours.</p>
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold text-slate-500 uppercase">Select Month:</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
              />
              <button onClick={fetchSelfLogs} className="p-2 text-slate-400 hover:text-[#2F5CE0]">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Overview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-100 card-shadow">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Work Days</span>
              <p className="text-2xl font-bold text-[#0B1B42] mt-1 tabular">{totalWorkingDays}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 card-shadow">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Days Present</span>
              <p className="text-2xl font-bold text-[#22C55E] mt-1 tabular">{presentCount}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 card-shadow">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Leaves / Approved Time-Off</span>
              <p className="text-2xl font-bold text-[#60A5FA] mt-1 tabular">{leavesCount}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 card-shadow">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Work Hours / Overtime</span>
              <p className="text-lg font-bold text-[#0B1B42] mt-1 tabular">
                {totalHours.toFixed(1)} hrs <span className="text-xs font-medium text-purple-600">({extraHours.toFixed(1)} OT)</span>
              </p>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white rounded-xl border border-slate-100 card-shadow overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Check In</th>
                  <th className="py-3.5 px-6">Check Out</th>
                  <th className="py-3.5 px-6">Work Hours</th>
                  <th className="py-3.5 px-6">Overtime (OT)</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingSelf ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : selfLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No logs submitted for {month} yet.
                    </td>
                  </tr>
                ) : (
                  selfLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-semibold text-slate-700 tabular">{log.date}</td>
                      <td className="py-3.5 px-6 text-slate-600 tabular">{log.checkIn || "—"}</td>
                      <td className="py-3.5 px-6 text-slate-600 tabular">{log.checkOut || "—"}</td>
                      <td className="py-3.5 px-6 text-slate-700 font-medium tabular">{log.workHours ? `${log.workHours} hrs` : "—"}</td>
                      <td className="py-3.5 px-6 text-purple-600 font-medium tabular">{log.extraHours ? `+${log.extraHours} hrs` : "—"}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            log.status === AttendanceStatus.Present
                              ? "bg-green-50 text-green-700 border border-green-100"
                              : log.status === AttendanceStatus.Leave
                              ? "bg-[#E7EDFF] text-[#2F5CE0] border border-blue-100"
                              : log.status === AttendanceStatus.HalfDay
                              ? "bg-orange-50 text-orange-700 border border-orange-100"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. TEAM DAILY WORKSPACE (ADMIN/HR) */}
      {activeTab === "team" && userRole !== UserRole.Employee && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl border border-slate-100 card-shadow">
            <div>
              <h2 className="text-lg font-bold text-[#0B1B42]">Master Team Register</h2>
              <p className="text-xs text-slate-500">View real-time workspace entries, checked-out durations, and statuses.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-48 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#2F5CE0]"
                />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
              />
              <button onClick={fetchTeamLogs} className="p-2 text-slate-400 hover:text-[#2F5CE0]">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-xl border border-slate-100 card-shadow overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Department</th>
                  <th className="py-3.5 px-6">Check In</th>
                  <th className="py-3.5 px-6">Check Out</th>
                  <th className="py-3.5 px-6">Work Hours</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingTeam ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Loading entries...
                    </td>
                  </tr>
                ) : filteredTeamLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No logs logged on {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  filteredTeamLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6">
                        <div>
                          <div className="font-semibold text-slate-700">{log.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{log.jobPosition}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 font-medium">{log.department}</td>
                      <td className="py-3.5 px-6 text-slate-600 tabular">{log.checkIn || "—"}</td>
                      <td className="py-3.5 px-6 text-slate-600 tabular">{log.checkOut || "—"}</td>
                      <td className="py-3.5 px-6 text-slate-700 font-semibold tabular">{log.workHours ? `${log.workHours} hrs` : "—"}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            log.status === AttendanceStatus.Present
                              ? "bg-green-50 text-green-700 border border-green-100"
                              : log.status === AttendanceStatus.Leave
                              ? "bg-[#E7EDFF] text-[#2F5CE0] border border-blue-100"
                              : log.status === AttendanceStatus.HalfDay
                              ? "bg-orange-50 text-orange-700 border border-orange-100"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
