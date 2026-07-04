/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  LogOut,
  Bell,
  Clock,
  User as UserIcon,
  X,
  AlertCircle,
  Briefcase,
  MapPin,
  CheckCircle,
  Filter,
  DollarSign
} from "lucide-react";

import { UserRole, AttendanceStatus } from "./types.js";
import { AuthScreen } from "./components/AuthScreen.js";
import { CopilotWidget } from "./components/CopilotWidget.js";
import { AttendanceTab } from "./components/AttendanceTab.js";
import { TimeOffTab } from "./components/TimeOffTab.js";
import { ProfileTab } from "./components/ProfileTab.js";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("hrmind_token"));
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loadingMe, setLoadingMe] = useState(false);

  // Navigation & Active States
  const [activeTab, setActiveTab] = useState<"directory" | "attendance" | "timeoff" | "profile">("directory");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Directory Directory state
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [loadingDir, setLoadingDir] = useState(false);

  // Check In / Out state
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  // Add Employee Form State (Admin / HR)
  const [formOpen, setFormOpen] = useState(false);
  const [formFirst, setFormFirst] = useState("");
  const [formLast, setFormLast] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPersonalEmail, setFormPersonalEmail] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGender, setFormGender] = useState("Male");
  const [formMarital, setFormMarital] = useState("Single");
  const [formDept, setFormDept] = useState("Engineering");
  const [formPos, setFormPos] = useState("Associate Engineer");
  const [formLoc, setFormLoc] = useState("Bengaluru");
  const [formDoj, setFormDoj] = useState("2026-07-01");
  const [formRole, setFormRole] = useState(UserRole.Employee);
  const [formWage, setFormWage] = useState("45000");
  const [formError, setFormError] = useState("");
  const [formResult, setFormResult] = useState<any>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Selected Profile state
  const [profileOpen, setProfileOpen] = useState(false);

  // Auto-leave scheduler state (pushed from Gemini)
  const [draftLeaveRequest, setDraftLeaveRequest] = useState<any>(null);

  const fetchMe = async (authToken: string) => {
    setLoadingMe(true);
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setEmployee(data.employee);
        setCompany(data.company);
        
        // Fetch today's check-in status
        fetchTodayAttendance(authToken, data.employee.id);
      } else {
        // Stale token
        handleLogout();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMe(false);
    }
  };

  const fetchTodayAttendance = async (authToken: string, empId: string) => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const response = await fetch(`/api/attendance?employeeId=${empId}&date=${todayStr}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data) && data.length > 0) {
        setTodayAttendance(data[0]);
      } else {
        setTodayAttendance(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDirectory = async () => {
    if (!token) return;
    setLoadingDir(true);
    try {
      const response = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDir(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMe(token);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchDirectory();
    }
  }, [token, activeTab]);

  const handleLoginSuccess = (newToken: string, loggedUser: any, loggedEmployee: any) => {
    localStorage.setItem("hrmind_token", newToken);
    setToken(newToken);
    setUser(loggedUser);
    setEmployee(loggedEmployee);
    fetchTodayAttendance(newToken, loggedEmployee.id);
  };

  const handleLogout = () => {
    localStorage.removeItem("hrmind_token");
    setToken(null);
    setUser(null);
    setEmployee(null);
    setCompany(null);
    setSelectedEmployeeId(null);
    setActiveTab("directory");
  };

  const handleCheckInOrOut = async () => {
    if (!token) return;
    const isCheckingIn = !todayAttendance || !todayAttendance.checkIn;
    const endpoint = isCheckingIn ? "/api/attendance/check-in" : "/api/attendance/check-out";
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        fetchTodayAttendance(token, employee.id);
        fetchDirectory(); // Update directories
      } else {
        alert(data.error || "Attendance action failed");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirst || !formLast || !formEmail) {
      setFormError("First name, Last name, and Business Email are required.");
      return;
    }

    setFormError("");
    setFormResult(null);
    setFormSubmitting(true);

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: formFirst,
          lastName: formLast,
          email: formEmail,
          personalEmail: formPersonalEmail,
          dob: formDob,
          phone: formPhone,
          gender: formGender,
          maritalStatus: formMarital,
          department: formDept,
          jobPosition: formPos,
          location: formLoc,
          dateOfJoining: formDoj,
          userRole: formRole,
          monthWage: formWage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create employee");
      }

      setFormResult(data);
      fetchDirectory(); // refresh directory list

      // Reset fields
      setFormFirst("");
      setFormLast("");
      setFormEmail("");
      setFormPersonalEmail("");
      setFormDob("");
      setFormPhone("");
    } catch (err: any) {
      setFormError(err.message || "An error occurred.");
    } finally {
      setFormSubmitting(false);
    }
  };

  if (!token || !user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Filter employee cards
  const filteredEmployees = employees.filter((emp) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term) ||
      emp.loginId.toLowerCase().includes(term) ||
      emp.jobPosition.toLowerCase().includes(term) ||
      emp.department.toLowerCase().includes(term);

    const matchesDept = deptFilter === "All" || emp.department === deptFilter;

    return matchesSearch && matchesDept;
  });

  const departments = ["All", "Administration", "Human Resources", "Engineering", "Operations"];

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#1E293B] font-sans flex flex-col overflow-hidden">
      
      {/* 1. TOP NAV BAR */}
      <nav className="h-16 bg-[#0B1B42] flex items-center justify-between px-6 shrink-0 relative z-30">
        <div className="flex items-center space-x-10">
          <div className="flex items-center space-x-2">
            {/* Custom SVG recreation of Navy "H" + Blue "R" + 3-dot thinking silhouette logo */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 8V24M8 16H16M16 8V24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M20 24V14C20 11.5 22 10 24 10C26 10 28 11.5 28 14V24" stroke="#2F5CE0" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="6" r="1.5" fill="#60A5FA" />
              <circle cx="27" cy="6" r="1.5" fill="#60A5FA" />
              <circle cx="25.5" cy="4" r="1.5" fill="#60A5FA" />
            </svg>
            <span className="text-white font-display text-xl tracking-tight font-bold">HR Mind</span>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => {
                setActiveTab("directory");
                setSelectedEmployeeId(null);
              }}
              className={`py-5 cursor-pointer transition-all ${
                activeTab === "directory" ? "text-white border-b-2 border-[#2F5CE0] font-bold" : "hover:text-white"
              }`}
            >
              Employees
            </button>
            <button
              onClick={() => {
                setActiveTab("attendance");
                setSelectedEmployeeId(null);
              }}
              className={`py-5 cursor-pointer transition-all ${
                activeTab === "attendance" ? "text-white border-b-2 border-[#2F5CE0] font-bold" : "hover:text-white"
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => {
                setActiveTab("timeoff");
                setSelectedEmployeeId(null);
              }}
              className={`py-5 cursor-pointer transition-all ${
                activeTab === "timeoff" ? "text-white border-b-2 border-[#2F5CE0] font-bold" : "hover:text-white"
              }`}
            >
              Time Off
            </button>
            {employee && (
              <button
                onClick={() => {
                  setActiveTab("profile");
                  setSelectedEmployeeId(employee.id);
                }}
                className={`py-5 cursor-pointer transition-all ${
                  activeTab === "profile" && selectedEmployeeId === employee.id
                    ? "text-white border-b-2 border-[#2F5CE0] font-bold"
                    : "hover:text-white"
                }`}
              >
                My Profile
              </button>
            )}
          </div>
        </div>

        {/* Right side items */}
        <div className="flex items-center space-x-4">
          
          {/* Check-In Check-Out widget */}
          {employee && (
            <div className="bg-[#16265C] rounded-lg px-3 py-1.5 flex items-center space-x-3 border border-slate-700/50">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold tabular">
                {todayAttendance && todayAttendance.checkIn ? `Since ${todayAttendance.checkIn}` : "Checked Out"}
              </span>
              <button
                onClick={handleCheckInOrOut}
                className="bg-[#2F5CE0] hover:bg-blue-600 text-white text-xs px-3 py-1 rounded font-semibold active:scale-95 transition-all cursor-pointer shadow-md"
              >
                {todayAttendance && todayAttendance.checkIn ? "Check Out →" : "Check In →"}
              </button>
            </div>
          )}

          <div className="w-px h-6 bg-slate-700 hidden sm:block"></div>

          {/* User profile actions dropdown */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setActiveTab("profile");
                setSelectedEmployeeId(employee.id);
              }}
              className="w-8 h-8 rounded-full bg-[#2F5CE0] hover:bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md relative cursor-pointer border border-white/20"
              title="My Profile"
            >
              {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : "ME"}
            </button>
            <button
              onClick={handleLogout}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* 2. SUB-HEADER AREA */}
      <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B42]">
            {activeTab === "directory" && "Employee Directory"}
            {activeTab === "attendance" && "Attendance Registry"}
            {activeTab === "timeoff" && "Time Off Desk"}
            {activeTab === "profile" && "Employee Workspace"}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {activeTab === "directory" && "Manage and search your teammate profiles and live directory statuses."}
            {activeTab === "attendance" && "Configure logs, overtime computations, and daily records."}
            {activeTab === "timeoff" && "Check available days, file requests, and view manager reports."}
            {activeTab === "profile" && "Consult personal files, credentials, and financial structure."}
          </p>
        </div>

        {/* Action button panel inside directory tab */}
        {activeTab === "directory" && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, position, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#2F5CE0] focus:border-transparent card-shadow"
              />
            </div>

            <div className="flex items-center space-x-2 bg-white px-3 py-2 border border-slate-200 rounded-lg card-shadow">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-600 focus:outline-none font-medium cursor-pointer"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {(user.role === UserRole.Admin || user.role === UserRole.HROfficer) && (
              <button
                onClick={() => {
                  setFormResult(null);
                  setFormError("");
                  setFormOpen(true);
                }}
                className="bg-[#2F5CE0] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Employee</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. MAIN TAB CONTENT VIEWPORT */}
      <div className="flex-1 px-8 pb-8 overflow-y-auto">
        
        {/* DIRECTORY GRID */}
        {activeTab === "directory" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loadingDir ? (
              <div className="col-span-full text-center py-12 text-slate-400">Loading company directory...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400">No employees match your search criteria.</div>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white rounded-xl card-shadow border border-slate-100 p-5 relative flex flex-col items-center hover:border-slate-200 transition-all group"
                >
                  {/* Status Indicator top-right */}
                  <div className="absolute top-4 right-4 flex items-center">
                    {emp.liveStatus === "Leave" ? (
                      <span className="text-xs" title="On Approved Leave">✈️</span>
                    ) : (
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          emp.liveStatus === "Present"
                            ? "bg-[#22C55E] status-pulse"
                            : "bg-[#F5B400]"
                        }`}
                        title={emp.liveStatus}
                      />
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-18 h-18 rounded-full mb-3 overflow-hidden border-2 border-slate-100 shadow-sm">
                    <img src={emp.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>

                  <h3 className="font-bold text-[#0B1B42] text-sm group-hover:text-[#2F5CE0] transition-colors">
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold mb-3">{emp.jobPosition}</p>

                  <div className="bg-slate-50/70 px-3 py-1.5 rounded-lg w-full mb-4 border border-slate-100">
                    <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">
                      <span>Login ID</span>
                      <span className="text-[#0B1B42] tabular font-bold">{emp.loginId}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedEmployeeId(emp.id);
                      setActiveTab("profile");
                    }}
                    className="w-full text-[10px] py-1.5 border border-slate-200 rounded-md font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    View File
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ATTENDANCE WORKSPACE */}
        {activeTab === "attendance" && (
          <AttendanceTab token={token} userRole={user.role} employeeId={employee.id} />
        )}

        {/* TIME OFF WORKSPACE */}
        {activeTab === "timeoff" && (
          <TimeOffTab
            token={token}
            userRole={user.role}
            employeeId={employee.id}
            draftLeaveRequest={draftLeaveRequest}
            onClearDraft={() => setDraftLeaveRequest(null)}
          />
        )}

        {/* DETAILED PROFILE */}
        {activeTab === "profile" && selectedEmployeeId && (
          <ProfileTab
            token={token}
            userRole={user.role}
            currentUserId={employee.id}
            targetId={selectedEmployeeId}
          />
        )}

      </div>

      {/* 4. FLOATING AI COPILOT */}
      <CopilotWidget
        token={token}
        userRole={user.role}
        userName={employee ? `${employee.firstName} ${employee.lastName}` : "User"}
        onDraftAction={(action) => {
          setDraftLeaveRequest(action);
          setActiveTab("timeoff");
        }}
      />

      {/* CREATE EMPLOYEE MODAL (ADMIN / HR ONLY) */}
      {formOpen && (
        <div className="fixed inset-0 bg-[#0B1B42]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setFormOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#0B1B42] mb-1">Create New Employee</h3>
            <p className="text-xs text-slate-500 mb-6">Create credentials and salary settings. Login ID generates automatically.</p>

            {formResult ? (
              <div className="space-y-4 p-5 bg-green-50 border border-green-100 rounded-xl">
                <h4 className="font-bold text-green-800 text-sm flex items-center space-x-1.5">
                  <CheckCircle className="w-5 h-5" />
                  <span>Employee successfully created!</span>
                </h4>
                <p className="text-xs text-green-700">
                  Please share these first-time connection credentials with the teammate.
                </p>
                <div className="bg-white p-4 rounded-lg border border-green-200/50 space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Login ID</span>
                    <span className="text-[#0B1B42] font-mono font-bold text-sm select-all">{formResult.loginId}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">First-Time Password</span>
                    <span className="text-[#0B1B42] font-mono font-bold text-sm select-all">{formResult.tempPassword}</span>
                  </div>
                </div>
                <button
                  onClick={() => setFormOpen(false)}
                  className="w-full bg-[#2F5CE0] hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-xs"
                >
                  Close & Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formFirst}
                      onChange={(e) => setFormFirst(e.target.value)}
                      placeholder="e.g. Rahul"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formLast}
                      onChange={(e) => setFormLast(e.target.value)}
                      placeholder="e.g. Sen"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                      required
                    />
                  </div>

                  {/* Emails */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Business Email (Login)</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. rahul@hrmind.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Personal Email</label>
                    <input
                      type="email"
                      value={formPersonalEmail}
                      onChange={(e) => setFormPersonalEmail(e.target.value)}
                      placeholder="e.g. rahul.sen.personal@gmail.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                    />
                  </div>

                  {/* Phone & DoB */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mobile No.</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 97777 88888"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                    />
                  </div>

                  {/* Gender & Marital */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Gender</label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Marital Status</label>
                    <select
                      value={formMarital}
                      onChange={(e) => setFormMarital(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                    </select>
                  </div>

                  {/* Dept & Job */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Department</label>
                    <select
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Administration">Administration</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Job Position</label>
                    <input
                      type="text"
                      value={formPos}
                      onChange={(e) => setFormPos(e.target.value)}
                      placeholder="e.g. Senior Frontend Engineer"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                    />
                  </div>

                  {/* Location & Joining */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Office Location</label>
                    <input
                      type="text"
                      value={formLoc}
                      onChange={(e) => setFormLoc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={formDoj}
                      onChange={(e) => setFormDoj(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      required
                    />
                  </div>

                  {/* Role & Starting Wage */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">System Security Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                    >
                      <option value={UserRole.Employee}>Employee (Self-Service)</option>
                      <option value={UserRole.HROfficer}>HR Officer (Operations)</option>
                      <option value={UserRole.Admin}>Admin (Full Control)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Starting Monthly Wage (₹)</label>
                    <input
                      type="number"
                      value={formWage}
                      onChange={(e) => setFormWage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2 bg-[#2F5CE0] hover:bg-blue-700 text-white font-bold rounded-lg active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {formSubmitting ? "Creating..." : "Create Employee Profile"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
