/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, ShieldCheck, CreditCard, Award, Plus, X, Pencil, Check, RefreshCw, AlertCircle } from "lucide-react";
import { UserRole } from "../types.js";

interface ProfileTabProps {
  token: string;
  userRole: UserRole;
  currentUserId: string; // Logged in user ID
  targetId: string; // The ID of the employee we are looking at
}

export function ProfileTab({ token, userRole, currentUserId, targetId }: ProfileTabProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"resume" | "private" | "salary" | "security">("resume");

  // Edit Mode states for Resume fields
  const [editResume, setEditResume] = useState(false);
  const [about, setAbout] = useState("");
  const [jobLoveNote, setJobLoveNote] = useState("");
  const [hobbies, setHobbies] = useState("");

  // Edit states for Skills & Certs
  const [newSkill, setNewSkill] = useState("");
  const [newCertName, setNewCertName] = useState("");
  const [newCertIssuer, setNewCertIssuer] = useState("");
  const [newCertDate, setNewCertDate] = useState("");

  // Edit states for Bank details
  const [editBank, setEditBank] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [panNo, setPanNo] = useState("");
  const [uanNo, setUanNo] = useState("");

  // Edit states for Salary structure
  const [editSalary, setEditSalary] = useState(false);
  const [monthWage, setMonthWage] = useState(0);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(5);
  const [breakTimeHrs, setBreakTimeHrs] = useState(1);

  const isSelf = currentUserId === targetId;
  const isAdminOrHR = userRole === UserRole.Admin || userRole === UserRole.HROfficer;

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setProfile(data);
        // Sync states
        setAbout(data.about || "");
        setJobLoveNote(data.jobLoveNote || "");
        setHobbies(data.hobbies || "");
        if (data.bankDetails) {
          setAccountNumber(data.bankDetails.accountNumber || "");
          setBankName(data.bankDetails.bankName || "");
          setIfscCode(data.bankDetails.ifscCode || "");
          setPanNo(data.bankDetails.panNo || "");
          setUanNo(data.bankDetails.uanNo || "");
        }
        if (data.salaryStructure) {
          setMonthWage(data.salaryStructure.monthWage || 0);
          setWorkingDaysPerWeek(data.salaryStructure.workingDaysPerWeek || 5);
          setBreakTimeHrs(data.salaryStructure.breakTimeHrs || 1);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetId]);

  const handleSaveResume = async () => {
    try {
      const response = await fetch(`/api/employees/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ about, jobLoveNote, hobbies }),
      });
      if (response.ok) {
        setEditResume(false);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim() || !profile) return;
    const skillsList = [...profile.skills.map((s: any) => s.name), newSkill.trim()];
    try {
      const response = await fetch(`/api/employees/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skills: skillsList }),
      });
      if (response.ok) {
        setNewSkill("");
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSkill = async (skillName: string) => {
    if (!profile) return;
    const skillsList = profile.skills.map((s: any) => s.name).filter((s: string) => s !== skillName);
    try {
      const response = await fetch(`/api/employees/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skills: skillsList }),
      });
      if (response.ok) {
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCertName.trim() || !newCertIssuer.trim() || !profile) return;
    const certsList = [
      ...profile.certifications.map((c: any) => ({ name: c.name, issuer: c.issuer, date: c.date })),
      { name: newCertName.trim(), issuer: newCertIssuer.trim(), date: newCertDate || "2026-01-01" },
    ];
    try {
      const response = await fetch(`/api/employees/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ certifications: certsList }),
      });
      if (response.ok) {
        setNewCertName("");
        setNewCertIssuer("");
        setNewCertDate("");
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveCert = async (certId: string) => {
    if (!profile) return;
    const certsList = profile.certifications
      .filter((c: any) => c.id !== certId)
      .map((c: any) => ({ name: c.name, issuer: c.issuer, date: c.date }));
    try {
      const response = await fetch(`/api/employees/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ certifications: certsList }),
      });
      if (response.ok) {
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveBank = async () => {
    try {
      const response = await fetch(`/api/employees/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bankDetails: { accountNumber, bankName, ifscCode, panNo, uanNo },
        }),
      });
      if (response.ok) {
        setEditBank(false);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSalary = async () => {
    try {
      const response = await fetch(`/api/employees/${targetId}/salary`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ monthWage, workingDaysPerWeek, breakTimeHrs }),
      });
      if (response.ok) {
        setEditSalary(false);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading user profile...</div>;
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <span>Profile records not found in database.</span>
      </div>
    );
  }

  // Calculate salary components on-the-fly for clean UI representation
  const basicSalary = Math.round(monthWage * 0.5);
  const hra = Math.round(basicSalary * 0.5);
  const standardAllowance = 4167;
  const performanceBonus = Math.round(basicSalary * 0.0833);
  const lta = Math.round(basicSalary * 0.08333);
  const sumOther = basicSalary + hra + standardAllowance + performanceBonus + lta;
  const fixedAllowance = monthWage - sumOther;

  // PF computation
  const pfEmployee = Math.round(basicSalary * 0.12);
  const pfEmployer = Math.round(basicSalary * 0.12);

  return (
    <div className="space-y-6">
      {/* 1. PROFILE HEADER CARD */}
      <div className="bg-[#0B1B42] text-white rounded-xl card-shadow overflow-hidden p-6 relative flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden border-4 border-white/20 shadow-lg shrink-0">
          <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <div className="text-center md:text-left flex-1 space-y-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {profile.firstName} {profile.lastName}
            </h1>
            <span className="inline-flex self-center md:self-start bg-[#2F5CE0] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {profile.jobPosition}
            </span>
          </div>
          <p className="text-slate-300 text-xs font-medium uppercase tracking-wider">{profile.department}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 pt-3 border-t border-white/10 text-xs text-slate-300/90 font-medium max-w-2xl">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Login ID</span>
              <span className="tabular text-white">{profile.loginId}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Mobile No.</span>
              <span className="text-white">{profile.phone || "—"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Office Location</span>
              <span className="text-white">{profile.location || "Remote"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Manager ID</span>
              <span className="tabular text-white">{profile.managerId || "Head Office"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB TAB SELECTORS */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("resume")}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeSubTab === "resume"
              ? "border-[#2F5CE0] text-[#2F5CE0]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Resume & Biography
        </button>
        <button
          onClick={() => setActiveSubTab("private")}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeSubTab === "private"
              ? "border-[#2F5CE0] text-[#2F5CE0]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Private Details
        </button>
        {(isSelf || isAdminOrHR) && (
          <button
            onClick={() => setActiveSubTab("security")}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeSubTab === "security"
                ? "border-[#2F5CE0] text-[#2F5CE0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Bank & Securities
          </button>
        )}
        {isAdminOrHR && (
          <button
            onClick={() => setActiveSubTab("salary")}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeSubTab === "salary"
                ? "border-[#2F5CE0] text-[#2F5CE0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Salary Structure (HR)
          </button>
        )}
      </div>

      {/* 3. SUB TAB CONTENT PANELS */}

      {/* SUB TAB: RESUME */}
      {activeSubTab === "resume" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 p-6 card-shadow space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#0B1B42]">Personal Bio / Resume</h2>
              {!editResume && (isSelf || isAdminOrHR) && (
                <button
                  onClick={() => setEditResume(true)}
                  className="text-slate-400 hover:text-[#2F5CE0] transition-colors p-1"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            {editResume ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    About / Statement
                  </label>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0] focus:bg-white"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    What I love about my job
                  </label>
                  <textarea
                    value={jobLoveNote}
                    onChange={(e) => setJobLoveNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0] focus:bg-white"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    My interests & hobbies
                  </label>
                  <textarea
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0] focus:bg-white"
                  ></textarea>
                </div>
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={handleSaveResume}
                    className="px-4 py-1.5 bg-[#2F5CE0] hover:bg-blue-700 text-white font-semibold text-xs rounded-lg active:scale-95 cursor-pointer"
                  >
                    Save Biography
                  </button>
                  <button
                    onClick={() => {
                      setEditResume(false);
                      setAbout(profile.about || "");
                      setJobLoveNote(profile.jobLoveNote || "");
                      setHobbies(profile.hobbies || "");
                    }}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Biography Statement</h3>
                  <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                    {profile.about || "This employee hasn't drafted an about statement yet."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Why I Love My Work</h3>
                  <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap italic">
                    "{profile.jobLoveNote || "No notes logged."}"
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hobbies & Core Interests</h3>
                  <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                    {profile.hobbies || "No hobbies specified."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Skills & Certs panels */}
          <div className="space-y-6">
            {/* SKILLS PANEL */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 card-shadow space-y-4">
              <h3 className="font-bold text-[#0B1B42] text-sm">Professional Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No skills cataloged.</span>
                ) : (
                  profile.skills.map((s: any) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center bg-[#E7EDFF] text-[#2F5CE0] font-semibold text-[10px] px-2.5 py-1 rounded-full border border-blue-100/50"
                    >
                      <span>{s.name}</span>
                      {(isSelf || isAdminOrHR) && (
                        <button
                          onClick={() => handleRemoveSkill(s.name)}
                          className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>

              {(isSelf || isAdminOrHR) && (
                <form onSubmit={handleAddSkill} className="flex gap-2 pt-2 border-t border-slate-50">
                  <input
                    type="text"
                    placeholder="Add Skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-[#2F5CE0] hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* CERTIFICATIONS PANEL */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 card-shadow space-y-4">
              <h3 className="font-bold text-[#0B1B42] text-sm">Credentials & Certifications</h3>
              <div className="space-y-3">
                {profile.certifications.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No certifications listed.</div>
                ) : (
                  profile.certifications.map((c: any) => (
                    <div key={c.id} className="flex items-start justify-between bg-slate-50/50 border border-slate-100 p-2.5 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Award className="w-4.5 h-4.5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-700 text-xs">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{c.issuer} · {c.date}</div>
                        </div>
                      </div>
                      {(isSelf || isAdminOrHR) && (
                        <button
                          onClick={() => handleRemoveCert(c.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {(isSelf || isAdminOrHR) && (
                <form onSubmit={handleAddCert} className="pt-3 border-t border-slate-50 space-y-2">
                  <input
                    type="text"
                    placeholder="Cert Name (e.g. AWS Associate)"
                    value={newCertName}
                    onChange={(e) => setNewCertName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:bg-white"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Issuer (e.g. AWS)"
                      value={newCertIssuer}
                      onChange={(e) => setNewCertIssuer(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:bg-white"
                      required
                    />
                    <input
                      type="date"
                      value={newCertDate}
                      onChange={(e) => setNewCertDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#2F5CE0] hover:bg-blue-700 text-white text-xs font-semibold py-1.5 rounded-lg cursor-pointer"
                  >
                    Add Credential
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: PRIVATE INFO */}
      {activeSubTab === "private" && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 card-shadow space-y-6">
          <h2 className="text-base font-bold text-[#0B1B42] pb-3 border-b border-slate-100">Private Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Date of Birth</span>
              <span className="font-semibold text-slate-700 tabular">{profile.dob || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Nationality</span>
              <span className="font-semibold text-slate-700">{profile.nationality || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Personal Email</span>
              <span className="font-semibold text-slate-700">{profile.personalEmail || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Gender / Sex</span>
              <span className="font-semibold text-slate-700">{profile.gender || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Marital Status</span>
              <span className="font-semibold text-slate-700">{profile.maritalStatus || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Date of Joining</span>
              <span className="font-semibold text-slate-700 tabular">{profile.dateOfJoining || "—"}</span>
            </div>
            <div className="md:col-span-2 flex flex-col py-2.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider mb-1.5">Residing Address</span>
              <span className="font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                {profile.address || "No address logged."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: SECURITIES (BANK DETAILS) */}
      {activeSubTab === "security" && (isSelf || isAdminOrHR) && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 card-shadow space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#0B1B42]">Bank Accounts & Securities</h2>
            {!editBank && (
              <button
                onClick={() => setEditBank(true)}
                className="text-slate-400 hover:text-[#2F5CE0] transition-colors p-1"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          {editBank ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 50100012345"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    placeholder="e.g. HDFC0000104"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    PAN Card No
                  </label>
                  <input
                    type="text"
                    value={panNo}
                    onChange={(e) => setPanNo(e.target.value)}
                    placeholder="e.g. ABCPS1234A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    UAN PF No
                  </label>
                  <input
                    type="text"
                    value={uanNo}
                    onChange={(e) => setUanNo(e.target.value)}
                    placeholder="e.g. 100234567891"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleSaveBank}
                  className="px-4 py-1.5 bg-[#2F5CE0] hover:bg-blue-700 text-white font-semibold text-xs rounded-lg active:scale-95 cursor-pointer"
                >
                  Save Bank Details
                </button>
                <button
                  onClick={() => {
                    setEditBank(false);
                    if (profile.bankDetails) {
                      setAccountNumber(profile.bankDetails.accountNumber || "");
                      setBankName(profile.bankDetails.bankName || "");
                      setIfscCode(profile.bankDetails.ifscCode || "");
                      setPanNo(profile.bankDetails.panNo || "");
                      setUanNo(profile.bankDetails.uanNo || "");
                    }
                  }}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Account Number</span>
                <span className="font-semibold text-slate-700 tabular">{profile.bankDetails?.accountNumber || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Bank Name</span>
                <span className="font-semibold text-slate-700">{profile.bankDetails?.bankName || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider">IFSC Routing Code</span>
                <span className="font-semibold text-slate-700 tabular">{profile.bankDetails?.ifscCode || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider">PAN (Tax Identifier)</span>
                <span className="font-semibold text-slate-700 tabular">{profile.bankDetails?.panNo || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider">UAN (Provident Fund ID)</span>
                <span className="font-semibold text-slate-700 tabular">{profile.bankDetails?.uanNo || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Internal Employee Code</span>
                <span className="font-semibold text-slate-700 tabular">{profile.bankDetails?.empCode || "—"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB TAB: SALARY DETAILS (ADMIN/HR ONLY) */}
      {activeSubTab === "salary" && isAdminOrHR && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 card-shadow space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#0B1B42]">Wage & Salary Structure</h2>
            {!editSalary && (
              <button
                onClick={() => setEditSalary(true)}
                className="text-slate-400 hover:text-[#2F5CE0] transition-colors p-1"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          {editSalary ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Monthly Gross Wage (₹)
                  </label>
                  <input
                    type="number"
                    value={monthWage}
                    onChange={(e) => setMonthWage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Working Days / Week
                  </label>
                  <input
                    type="number"
                    value={workingDaysPerWeek}
                    onChange={(e) => setWorkingDaysPerWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Break Duration (Hours)
                  </label>
                  <input
                    type="number"
                    value={breakTimeHrs}
                    onChange={(e) => setBreakTimeHrs(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleSaveSalary}
                  className="px-4 py-1.5 bg-[#2F5CE0] hover:bg-blue-700 text-white font-semibold text-xs rounded-lg active:scale-95 cursor-pointer"
                >
                  Save Salary Config
                </button>
                <button
                  onClick={() => {
                    setEditSalary(false);
                    if (profile.salaryStructure) {
                      setMonthWage(profile.salaryStructure.monthWage || 0);
                      setWorkingDaysPerWeek(profile.salaryStructure.workingDaysPerWeek || 5);
                      setBreakTimeHrs(profile.salaryStructure.breakTimeHrs || 1);
                    }
                  }}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wage summary row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Monthly Gross Wage</span>
                  <p className="text-2xl font-black text-[#0B1B42] mt-1 tabular">₹{monthWage.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Computed Annual Package</span>
                  <p className="text-2xl font-black text-[#2F5CE0] mt-1 tabular">₹{(monthWage * 12).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Schedule</span>
                  <p className="text-base font-bold text-slate-700 mt-2">
                    {workingDaysPerWeek} days/wk · {breakTimeHrs}hr breaks
                  </p>
                </div>
              </div>

              {/* Component Breakdowns */}
              <div>
                <h3 className="font-bold text-[#0B1B42] text-xs uppercase tracking-wider text-slate-400 mb-3">
                  Automatic Component Recalculation Breakdowns
                </h3>
                <div className="bg-slate-50/50 rounded-xl border border-slate-100 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between items-center p-3">
                    <span className="text-slate-500 font-medium">Basic Salary (50% of Wage)</span>
                    <span className="font-bold text-[#0B1B42] tabular">₹{basicSalary.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center p-3">
                    <span className="text-slate-500 font-medium">House Rent Allowance (HRA) (50% of Basic)</span>
                    <span className="font-bold text-[#0B1B42] tabular">₹{hra.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center p-3">
                    <span className="text-slate-500 font-medium">Standard Allowance (Fixed)</span>
                    <span className="font-bold text-[#0B1B42] tabular">₹{standardAllowance.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center p-3">
                    <span className="text-slate-500 font-medium">Performance Bonus (8.33% of Basic)</span>
                    <span className="font-bold text-[#0B1B42] tabular">₹{performanceBonus.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center p-3">
                    <span className="text-slate-500 font-medium">Leave Travel Allowance (LTA) (8.333% of Basic)</span>
                    <span className="font-bold text-[#0B1B42] tabular">₹{lta.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50/30">
                    <span className="text-[#2F5CE0] font-bold">Fixed Allowance (Residual balance)</span>
                    <span className="font-bold text-[#2F5CE0] tabular">₹{fixedAllowance.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center p-3">
                    <span className="text-slate-500 font-medium">Provident Fund (PF) Employee Deduction (12% of Basic)</span>
                    <span className="font-bold text-red-600 tabular">₹{pfEmployee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center p-3">
                    <span className="text-slate-500 font-medium">Provident Fund (PF) Employer Contribution (12% of Basic)</span>
                    <span className="font-bold text-slate-700 tabular">₹{pfEmployer.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center p-3">
                    <span className="text-slate-500 font-medium">Professional Tax deduction (Fixed)</span>
                    <span className="font-bold text-red-600 tabular">₹200</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
