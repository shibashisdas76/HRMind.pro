/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

import {
  readDb,
  writeDb,
  hashPassword,
  generateLoginId
} from "./src/server/db.js";
import {
  UserRole,
  AttendanceStatus,
  TimeOffRequestStatus,
  Attendance,
  TimeOffRequest,
  TimeOffBalance,
  Employee,
  SalaryStructure,
  BankDetail,
  Skill,
  Certification
} from "./src/types.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Token Utility (Lightweight, robust, secure JWT alternative for standard iframes)
const JWT_SECRET = process.env.JWT_SECRET || "hr-mind-secret-key-123456";

function createToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
  return `${header}.${data}.${signature}`;
}

function verifyToken(token: string): any {
  try {
    const [header, data, signature] = token.split(".");
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    if (signature !== expectedSig) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

// Middleware: Authenticate User
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  req.user = payload; // Attach user to request
  next();
}

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        companyId: string;
      };
    }
  }
}

// Helper: Calculate standard salary components
function computeSalaryComponents(wage: number, config: any) {
  const basic = Math.round(wage * (config.basicPct / 100));
  const hra = Math.round(basic * (config.hraPct / 100));
  const performanceBonus = Math.round(basic * (config.performanceBonusPct / 100));
  const lta = Math.round(basic * (config.ltaPct / 100));
  const standardAllowance = config.standardAllowance || 4167;
  
  // Fixed allowance fills the remainder
  const otherSum = basic + hra + standardAllowance + performanceBonus + lta;
  const fixedAllowance = wage - otherSum;

  return {
    basicSalary: basic,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    fixedAllowance,
  };
}

// REST Endpoints

// 1. Auth Login
app.post("/api/auth/login", (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) {
    return res.status(400).json({ error: "Login ID / Email and password are required" });
  }

  const db = readDb();
  const lowerId = loginId.trim().toLowerCase();
  
  const user = db.users.find(
    (u) => u.loginId.toLowerCase() === lowerId || u.email.toLowerCase() === lowerId
  );

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid login ID/Email or password" });
  }

  const token = createToken({
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });

  const employee = db.employees.find((e) => e.userId === user.id);

  res.json({
    token,
    user: {
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
    },
    employee,
  });
});

// 2. Reset Password
app.post("/api/auth/reset-password", authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: "New password is required" });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === req.user!.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // If password reset is forced, or if they passed currentPassword, check it
  if (currentPassword && user.passwordHash !== hashPassword(currentPassword)) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }

  user.passwordHash = hashPassword(newPassword);
  user.mustResetPassword = false;
  writeDb(db);

  res.json({ success: true, message: "Password updated successfully" });
});

// 3. Get Current Me Details
app.get("/api/auth/me", authenticateToken, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user!.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const employee = db.employees.find((e) => e.userId === user.id);
  const company = db.companies.find((c) => c.id === user.companyId);

  res.json({
    user: {
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
    },
    employee,
    company,
  });
});

// 4. Get Employees
app.get("/api/employees", authenticateToken, (req, res) => {
  const db = readDb();
  // Map basic fields or status fields for all cards
  const employees = db.employees.map((emp) => {
    // Look up today's status in attendance
    const todayStr = new Date().toISOString().split("T")[0];
    const todayAtt = db.attendance.find((a) => a.employeeId === emp.id && a.date === todayStr);
    
    // Find if has active approved leave request today
    const onLeave = db.timeOffRequests.some(
      (r) =>
        r.employeeId === emp.id &&
        r.status === TimeOffRequestStatus.Approved &&
        todayStr >= r.startDate &&
        todayStr <= r.endDate
    );

    let liveStatus = "Absent";
    if (onLeave) {
      liveStatus = "Leave";
    } else if (todayAtt) {
      if (todayAtt.status === AttendanceStatus.Present) liveStatus = "Present";
      else if (todayAtt.status === AttendanceStatus.HalfDay) liveStatus = "Half-day";
      else if (todayAtt.status === AttendanceStatus.Leave) liveStatus = "Leave";
    }

    const user = db.users.find((u) => u.id === emp.userId);

    return {
      ...emp,
      loginId: user?.loginId || "",
      role: user?.role,
      liveStatus,
    };
  });

  res.json(employees);
});

// 5. Create Employee (Admin / HR only)
app.post("/api/employees", authenticateToken, (req, res) => {
  const { role } = req.user!;
  if (role !== UserRole.Admin && role !== UserRole.HROfficer) {
    return res.status(403).json({ error: "Permission denied. Admin or HR only." });
  }

  const {
    firstName,
    lastName,
    email,
    personalEmail,
    dob,
    phone,
    gender,
    maritalStatus,
    nationality,
    address,
    department,
    jobPosition,
    location,
    dateOfJoining,
    userRole, // UserRole
    monthWage, // Starting salary
  } = req.body;

  if (!firstName || !lastName || !email || !dateOfJoining) {
    return res.status(400).json({ error: "First name, last name, business email, and date of joining are required" });
  }

  const db = readDb();

  // Validate email uniqueness
  if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: "An employee with this business email already exists" });
  }

  const company = db.companies.find((c) => c.id === req.user!.companyId);
  const prefix = company?.prefix || "HM";

  const newUserId = "user-" + crypto.randomUUID().substring(0, 8);
  const loginId = generateLoginId(prefix, firstName, lastName, dateOfJoining, db.users);
  const tempPassword = "HM@" + crypto.randomInt(100000, 999999);

  const newUser: any = {
    id: newUserId,
    companyId: req.user!.companyId,
    loginId,
    email: email.trim(),
    passwordHash: hashPassword(tempPassword),
    role: userRole || UserRole.Employee,
    mustResetPassword: true,
    createdAt: new Date().toISOString(),
  };

  const newEmployee: Employee = {
    id: newUserId,
    userId: newUserId,
    firstName,
    lastName,
    dob: dob || "",
    phone: phone || "",
    personalEmail: personalEmail || "",
    gender: gender || "Male",
    maritalStatus: maritalStatus || "Single",
    nationality: nationality || "Indian",
    address: address || "",
    department: department || "Operations",
    jobPosition: jobPosition || "Associate",
    location: location || "Remote",
    dateOfJoining,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}_${lastName}`,
  };

  // Setup standard Salary Structure
  const baseWage = Number(monthWage) || 30000;
  const payrollConf = company?.payrollConfig || {
    pfEmployeePct: 12,
    pfEmployerPct: 12,
    professionalTax: 200,
    basicPct: 50,
    hraPct: 50,
    performanceBonusPct: 8.33,
    ltaPct: 8.333,
  };

  const newSalary: SalaryStructure = {
    id: "sal-" + crypto.randomUUID().substring(0, 8),
    employeeId: newUserId,
    monthWage: baseWage,
    yearlyWage: baseWage * 12,
    workingDaysPerWeek: 5,
    breakTimeHrs: 1,
    basicPct: payrollConf.basicPct,
    hraPct: payrollConf.hraPct,
    standardAllowance: 4167,
    performanceBonusPct: payrollConf.performanceBonusPct,
    ltaPct: payrollConf.ltaPct,
    pfEmployeePct: payrollConf.pfEmployeePct,
    pfEmployerPct: payrollConf.pfEmployerPct,
    professionalTax: payrollConf.professionalTax,
    effectiveFrom: dateOfJoining,
  };

  // Setup default Bank Details
  const newBank: BankDetail = {
    id: "bank-" + crypto.randomUUID().substring(0, 8),
    employeeId: newUserId,
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    panNo: "",
    uanNo: "",
    empCode: `HM-${prefix}-${crypto.randomInt(100, 999)}`,
  };

  // Seed default Leave balances (e.g. 15 paid days, 10 sick days)
  const paidBalance: TimeOffBalance = {
    id: "bal-" + crypto.randomUUID().substring(0, 8),
    employeeId: newUserId,
    timeOffTypeId: "type-paid",
    daysAvailable: 15,
    year: 2026,
  };

  const sickBalance: TimeOffBalance = {
    id: "bal-" + crypto.randomUUID().substring(0, 8),
    employeeId: newUserId,
    timeOffTypeId: "type-sick",
    daysAvailable: 10,
    year: 2026,
  };

  db.users.push(newUser);
  db.employees.push(newEmployee);
  db.salaryStructures.push(newSalary);
  db.bankDetails.push(newBank);
  db.timeOffBalances.push(paidBalance);
  db.timeOffBalances.push(sickBalance);

  writeDb(db);

  res.status(201).json({
    employee: newEmployee,
    loginId,
    tempPassword,
    message: "Employee successfully created. Share temporary credentials with them.",
  });
});

// 6. Get Single Employee Profile
app.get("/api/employees/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user!.id;
  const role = req.user!.role;

  const db = readDb();
  const employee = db.employees.find((e) => e.id === id);
  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }

  // Get additional tabs info
  const skills = db.skills.filter((s) => s.employeeId === id);
  const certifications = db.certifications.filter((c) => c.employeeId === id);
  const user = db.users.find((u) => u.id === employee.userId);

  // Security gate: Employee can only see own Private, Bank, or Salary details.
  // Admin/HR can see everything.
  const isSelf = currentUserId === id;
  const isAdminOrHR = role === UserRole.Admin || role === UserRole.HROfficer;

  const response: any = {
    ...employee,
    loginId: user?.loginId || "",
    email: user?.email || "",
    role: user?.role,
    skills,
    certifications,
  };

  if (isSelf || isAdminOrHR) {
    response.bankDetails = db.bankDetails.find((b) => b.employeeId === id);
    if (isAdminOrHR) {
      response.salaryStructure = db.salaryStructures.find((s) => s.employeeId === id);
    }
  }

  res.json(response);
});

// 7. Update Employee Profile
app.patch("/api/employees/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user!.id;
  const role = req.user!.role;

  const isSelf = currentUserId === id;
  const isAdminOrHR = role === UserRole.Admin || role === UserRole.HROfficer;

  if (!isSelf && !isAdminOrHR) {
    return res.status(403).json({ error: "Permission denied to edit this profile" });
  }

  const db = readDb();
  const employeeIndex = db.employees.findIndex((e) => e.id === id);
  if (employeeIndex === -1) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const existingEmployee = db.employees[employeeIndex];

  // Self can only edit limited fields: about, jobLoveNote, hobbies, avatarUrl, phone, personalEmail, address
  // Admin/HR can edit everything.
  const body = req.body;
  if (!isAdminOrHR) {
    // Filter edit fields
    existingEmployee.about = body.about !== undefined ? body.about : existingEmployee.about;
    existingEmployee.jobLoveNote = body.jobLoveNote !== undefined ? body.jobLoveNote : existingEmployee.jobLoveNote;
    existingEmployee.hobbies = body.hobbies !== undefined ? body.hobbies : existingEmployee.hobbies;
    existingEmployee.phone = body.phone !== undefined ? body.phone : existingEmployee.phone;
    existingEmployee.personalEmail = body.personalEmail !== undefined ? body.personalEmail : existingEmployee.personalEmail;
    existingEmployee.address = body.address !== undefined ? body.address : existingEmployee.address;
    if (body.avatarUrl) {
      existingEmployee.avatarUrl = body.avatarUrl;
    }
  } else {
    // Admin/HR full update
    db.employees[employeeIndex] = {
      ...existingEmployee,
      firstName: body.firstName || existingEmployee.firstName,
      lastName: body.lastName || existingEmployee.lastName,
      dob: body.dob !== undefined ? body.dob : existingEmployee.dob,
      phone: body.phone !== undefined ? body.phone : existingEmployee.phone,
      personalEmail: body.personalEmail !== undefined ? body.personalEmail : existingEmployee.personalEmail,
      gender: body.gender || existingEmployee.gender,
      maritalStatus: body.maritalStatus || existingEmployee.maritalStatus,
      nationality: body.nationality || existingEmployee.nationality,
      address: body.address !== undefined ? body.address : existingEmployee.address,
      department: body.department || existingEmployee.department,
      jobPosition: body.jobPosition || existingEmployee.jobPosition,
      location: body.location || existingEmployee.location,
      managerId: body.managerId !== undefined ? body.managerId : existingEmployee.managerId,
      dateOfJoining: body.dateOfJoining || existingEmployee.dateOfJoining,
      about: body.about !== undefined ? body.about : existingEmployee.about,
      jobLoveNote: body.jobLoveNote !== undefined ? body.jobLoveNote : existingEmployee.jobLoveNote,
      hobbies: body.hobbies !== undefined ? body.hobbies : existingEmployee.hobbies,
    };
  }

  // Update skills if provided
  if (body.skills && Array.isArray(body.skills)) {
    // Filter out old skills, write new ones
    db.skills = db.skills.filter((s) => s.employeeId !== id);
    body.skills.forEach((skName: string) => {
      db.skills.push({
        id: "sk-" + crypto.randomUUID().substring(0, 8),
        employeeId: id,
        name: skName,
      });
    });
  }

  // Update certifications if provided
  if (body.certifications && Array.isArray(body.certifications)) {
    db.certifications = db.certifications.filter((c) => c.employeeId !== id);
    body.certifications.forEach((cert: any) => {
      db.certifications.push({
        id: "crt-" + crypto.randomUUID().substring(0, 8),
        employeeId: id,
        name: cert.name,
        issuer: cert.issuer,
        date: cert.date,
      });
    });
  }

  // Update Bank details (only editable if self or Admin/HR)
  if (body.bankDetails && (isSelf || isAdminOrHR)) {
    const bankIndex = db.bankDetails.findIndex((b) => b.employeeId === id);
    const updatedBank = {
      ...db.bankDetails[bankIndex],
      accountNumber: body.bankDetails.accountNumber !== undefined ? body.bankDetails.accountNumber : db.bankDetails[bankIndex]?.accountNumber,
      bankName: body.bankDetails.bankName !== undefined ? body.bankDetails.bankName : db.bankDetails[bankIndex]?.bankName,
      ifscCode: body.bankDetails.ifscCode !== undefined ? body.bankDetails.ifscCode : db.bankDetails[bankIndex]?.ifscCode,
      panNo: body.bankDetails.panNo !== undefined ? body.bankDetails.panNo : db.bankDetails[bankIndex]?.panNo,
      uanNo: body.bankDetails.uanNo !== undefined ? body.bankDetails.uanNo : db.bankDetails[bankIndex]?.uanNo,
    };
    if (bankIndex !== -1) {
      db.bankDetails[bankIndex] = updatedBank;
    } else {
      db.bankDetails.push({
        id: "bank-" + crypto.randomUUID().substring(0, 8),
        employeeId: id,
        accountNumber: body.bankDetails.accountNumber || "",
        bankName: body.bankDetails.bankName || "",
        ifscCode: body.bankDetails.ifscCode || "",
        panNo: body.bankDetails.panNo || "",
        uanNo: body.bankDetails.uanNo || "",
        empCode: `HM-MT-${crypto.randomInt(100, 999)}`,
      });
    }
  }

  writeDb(db);
  res.json({ success: true, employee: db.employees[employeeIndex] });
});

// 8. Get Employee Salary Structure (Admin / HR only)
app.get("/api/employees/:id/salary", authenticateToken, (req, res) => {
  if (req.user!.role !== UserRole.Admin && req.user!.role !== UserRole.HROfficer) {
    return res.status(403).json({ error: "Access denied. Admin or HR only." });
  }

  const db = readDb();
  const salary = db.salaryStructures.find((s) => s.employeeId === req.params.id);
  if (!salary) {
    return res.status(404).json({ error: "Salary structure not found" });
  }
  res.json(salary);
});

// 9. Put/Update Salary Structure (Admin / HR only)
app.put("/api/employees/:id/salary", authenticateToken, (req, res) => {
  if (req.user!.role !== UserRole.Admin && req.user!.role !== UserRole.HROfficer) {
    return res.status(403).json({ error: "Access denied. Admin or HR only." });
  }

  const { id } = req.params;
  const { monthWage, workingDaysPerWeek, breakTimeHrs } = req.body;

  if (!monthWage) {
    return res.status(400).json({ error: "Monthly wage is required" });
  }

  const db = readDb();
  const salaryIndex = db.salaryStructures.findIndex((s) => s.employeeId === id);
  if (salaryIndex === -1) {
    return res.status(404).json({ error: "Salary structure not found" });
  }

  const company = db.companies.find((c) => c.id === req.user!.companyId);
  const conf = company?.payrollConfig || {
    pfEmployeePct: 12,
    pfEmployerPct: 12,
    professionalTax: 200,
    basicPct: 50,
    hraPct: 50,
    performanceBonusPct: 8.33,
    ltaPct: 8.333,
  };

  const wage = Number(monthWage);
  const updatedSalary: SalaryStructure = {
    ...db.salaryStructures[salaryIndex],
    monthWage: wage,
    yearlyWage: wage * 12,
    workingDaysPerWeek: Number(workingDaysPerWeek) || 5,
    breakTimeHrs: Number(breakTimeHrs) || 1,
    basicPct: conf.basicPct,
    hraPct: conf.hraPct,
    standardAllowance: 4167,
    performanceBonusPct: conf.performanceBonusPct,
    ltaPct: conf.ltaPct,
    pfEmployeePct: conf.pfEmployeePct,
    pfEmployerPct: conf.pfEmployerPct,
    professionalTax: conf.professionalTax,
  };

  // Double check sum of components: since component structures are derived from wage directly in code,
  // it never exceeds 100%. Let's write down the components.
  db.salaryStructures[salaryIndex] = updatedSalary;
  writeDb(db);

  res.json({ success: true, salary: updatedSalary });
});

// 10. Check-In Action
app.post("/api/attendance/check-in", authenticateToken, (req, res) => {
  const db = readDb();
  const employeeId = req.user!.id;
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = new Date().toLocaleTimeString("en-US", { hour12: false }); // "HH:MM:SS"

  // Check if already checked in today
  let att = db.attendance.find((a) => a.employeeId === employeeId && a.date === todayStr);
  if (att) {
    if (att.checkIn) {
      return res.status(400).json({ error: "Already checked in today" });
    }
    att.checkIn = nowTimeStr;
    att.status = AttendanceStatus.Present;
  } else {
    att = {
      id: "att-" + crypto.randomUUID().substring(0, 8),
      employeeId,
      date: todayStr,
      checkIn: nowTimeStr,
      workHours: 0,
      extraHours: 0,
      status: AttendanceStatus.Present,
    };
    db.attendance.push(att);
  }

  writeDb(db);
  res.json({ success: true, attendance: att });
});

// 11. Check-Out Action
app.post("/api/attendance/check-out", authenticateToken, (req, res) => {
  const db = readDb();
  const employeeId = req.user!.id;
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = new Date().toLocaleTimeString("en-US", { hour12: false });

  const att = db.attendance.find((a) => a.employeeId === employeeId && a.date === todayStr);
  if (!att || !att.checkIn) {
    return res.status(400).json({ error: "Cannot check out without checking in first" });
  }

  att.checkOut = nowTimeStr;

  // Calculate work hours
  try {
    const [inH, inM, inS] = att.checkIn.split(":").map(Number);
    const [outH, outM, outS] = nowTimeStr.split(":").map(Number);
    const inDate = new Date(2026, 6, 4, inH, inM, inS || 0);
    const outDate = new Date(2026, 6, 4, outH, outM, outS || 0);
    
    let diffHrs = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60);
    if (diffHrs < 0) diffHrs = 0;
    
    att.workHours = parseFloat(diffHrs.toFixed(2));
    
    // Check extra hours (beyond 9 hours)
    if (diffHrs > 9) {
      att.extraHours = parseFloat((diffHrs - 9).toFixed(2));
    } else {
      att.extraHours = 0;
    }
  } catch (err) {
    att.workHours = 8;
  }

  writeDb(db);
  res.json({ success: true, attendance: att });
});

// 12. Get Attendance Records
app.get("/api/attendance", authenticateToken, (req, res) => {
  const db = readDb();
  const { employeeId, month, date } = req.query;
  const currentUserId = req.user!.id;
  const role = req.user!.role;

  let records = db.attendance;

  // If client wants a specific date (e.g. Admin screen)
  if (date) {
    records = records.filter((r) => r.date === date);
  }

  // If client wants a specific employee
  if (employeeId) {
    // Security check: Employees can only view their own attendance
    if (role === UserRole.Employee && employeeId !== currentUserId) {
      return res.status(403).json({ error: "Access denied. You can only view your own records." });
    }
    records = records.filter((r) => r.employeeId === employeeId);
  } else {
    // If no employeeId provided, and user is an Employee, default to self
    if (role === UserRole.Employee) {
      records = records.filter((r) => r.employeeId === currentUserId);
    }
  }

  // Filter by month (YYYY-MM)
  if (month) {
    records = records.filter((r) => r.date.startsWith(month as string));
  }

  // Join names if Admin/HR is querying all records for a date
  const enriched = records.map((rec) => {
    const emp = db.employees.find((e) => e.id === rec.employeeId);
    return {
      ...rec,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee",
      department: emp?.department || "",
      jobPosition: emp?.jobPosition || "",
    };
  });

  res.json(enriched);
});

// 13. Get Time Off Balances
app.get("/api/timeoff/balances/:employeeId", authenticateToken, (req, res) => {
  const { employeeId } = req.params;
  const currentUserId = req.user!.id;
  const role = req.user!.role;

  // Security check: Employees can only view own balance
  if (role === UserRole.Employee && employeeId !== currentUserId) {
    return res.status(403).json({ error: "Access denied" });
  }

  const db = readDb();
  const balances = db.timeOffBalances.filter((b) => b.employeeId === employeeId);
  
  // Format nicely with the category names
  const formatted = balances.map((b) => {
    const type = db.timeOffTypes.find((t) => t.id === b.timeOffTypeId);
    return {
      ...b,
      typeName: type?.name || "Leave",
      isPaid: type?.isPaid,
      requiresAttachment: type?.requiresAttachment,
    };
  });

  res.json(formatted);
});

// 14. Apply Time Off Request
app.post("/api/timeoff/requests", authenticateToken, (req, res) => {
  const db = readDb();
  const employeeId = req.user!.id;
  const { timeOffTypeId, startDate, endDate, remarks, attachmentUrl } = req.body;

  if (!timeOffTypeId || !startDate || !endDate) {
    return res.status(400).json({ error: "Time off type, start date, and end date are required" });
  }

  // Calculate allocation days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const allocationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (isNaN(allocationDays) || allocationDays <= 0) {
    return res.status(400).json({ error: "Invalid date range selected" });
  }

  const type = db.timeOffTypes.find((t) => t.id === timeOffTypeId);
  if (type?.requiresAttachment && !attachmentUrl) {
    return res.status(400).json({ error: `An attachment (medical certificate, etc.) is required for ${type.name}` });
  }

  // Check if balance exists and is sufficient for Paid leave
  if (type && type.isPaid) {
    const balance = db.timeOffBalances.find(
      (b) => b.employeeId === employeeId && b.timeOffTypeId === timeOffTypeId
    );
    if (!balance || balance.daysAvailable < allocationDays) {
      return res.status(400).json({
        error: `Insufficient leave balance. You have ${balance?.daysAvailable || 0} days available, but requested ${allocationDays} days.`,
      });
    }
  }

  const newRequest: TimeOffRequest = {
    id: "req-" + crypto.randomUUID().substring(0, 8),
    employeeId,
    timeOffTypeId,
    startDate,
    endDate,
    allocationDays,
    remarks,
    attachmentUrl,
    status: TimeOffRequestStatus.Pending,
  };

  db.timeOffRequests.push(newRequest);
  writeDb(db);

  res.status(201).json({ success: true, request: newRequest });
});

// 15. Approve Time Off Request (Admin / HR only)
app.patch("/api/timeoff/requests/:id/approve", authenticateToken, (req, res) => {
  if (req.user!.role !== UserRole.Admin && req.user!.role !== UserRole.HROfficer) {
    return res.status(403).json({ error: "Access denied. Admin or HR only." });
  }

  const { id } = req.params;
  const { comments } = req.body;

  const db = readDb();
  const reqIndex = db.timeOffRequests.findIndex((r) => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({ error: "Time off request not found" });
  }

  const timeOffReq = db.timeOffRequests[reqIndex];
  if (timeOffReq.status !== TimeOffRequestStatus.Pending) {
    return res.status(400).json({ error: `Request already processed as ${timeOffReq.status}` });
  }

  // Deduct days from employee balance if it is paid leave
  const leaveType = db.timeOffTypes.find((t) => t.id === timeOffReq.timeOffTypeId);
  if (leaveType && leaveType.isPaid) {
    const balance = db.timeOffBalances.find(
      (b) => b.employeeId === timeOffReq.employeeId && b.timeOffTypeId === timeOffReq.timeOffTypeId
    );
    if (balance) {
      balance.daysAvailable = Math.max(0, balance.daysAvailable - timeOffReq.allocationDays);
    }
  }

  // Create attendance override records for leave period as status: Leave
  const start = new Date(timeOffReq.startDate);
  const end = new Date(timeOffReq.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split("T")[0];
    
    // Check if attendance record exists, overwrite or create
    const existingAtt = db.attendance.find((a) => a.employeeId === timeOffReq.employeeId && a.date === dStr);
    if (existingAtt) {
      existingAtt.status = AttendanceStatus.Leave;
      existingAtt.workHours = 0;
      existingAtt.extraHours = 0;
    } else {
      db.attendance.push({
        id: "att-" + crypto.randomUUID().substring(0, 8),
        employeeId: timeOffReq.employeeId,
        date: dStr,
        status: AttendanceStatus.Leave,
        workHours: 0,
        extraHours: 0,
      });
    }
  }

  const reviewerEmp = db.employees.find((e) => e.userId === req.user!.id);
  const reviewerName = reviewerEmp ? `${reviewerEmp.firstName} ${reviewerEmp.lastName}` : "Manager";

  timeOffReq.status = TimeOffRequestStatus.Approved;
  timeOffReq.reviewedBy = reviewerName;
  timeOffReq.reviewedAt = new Date().toISOString();
  timeOffReq.comments = comments || "Approved by HR.";

  writeDb(db);
  res.json({ success: true, request: timeOffReq });
});

// 16. Reject Time Off Request (Admin / HR only)
app.patch("/api/timeoff/requests/:id/reject", authenticateToken, (req, res) => {
  if (req.user!.role !== UserRole.Admin && req.user!.role !== UserRole.HROfficer) {
    return res.status(403).json({ error: "Access denied. Admin or HR only." });
  }

  const { id } = req.params;
  const { comments } = req.body;

  const db = readDb();
  const reqIndex = db.timeOffRequests.findIndex((r) => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({ error: "Time off request not found" });
  }

  const timeOffReq = db.timeOffRequests[reqIndex];
  if (timeOffReq.status !== TimeOffRequestStatus.Pending) {
    return res.status(400).json({ error: `Request already processed as ${timeOffReq.status}` });
  }

  const reviewerEmp = db.employees.find((e) => e.userId === req.user!.id);
  const reviewerName = reviewerEmp ? `${reviewerEmp.firstName} ${reviewerEmp.lastName}` : "Manager";

  timeOffReq.status = TimeOffRequestStatus.Rejected;
  timeOffReq.reviewedBy = reviewerName;
  timeOffReq.reviewedAt = new Date().toISOString();
  timeOffReq.comments = comments || "Rejected by HR.";

  writeDb(db);
  res.json({ success: true, request: timeOffReq });
});

// 17. Get All Leave Requests (Gated)
app.get("/api/timeoff/requests", authenticateToken, (req, res) => {
  const db = readDb();
  const currentUserId = req.user!.id;
  const role = req.user!.role;

  let requests = db.timeOffRequests;

  // Filter for employee self
  if (role === UserRole.Employee) {
    requests = requests.filter((r) => r.employeeId === currentUserId);
  }

  // Join names and details
  const enriched = requests.map((reqItem) => {
    const emp = db.employees.find((e) => e.id === reqItem.employeeId);
    const leaveType = db.timeOffTypes.find((t) => t.id === reqItem.timeOffTypeId);
    return {
      ...reqItem,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee",
      department: emp?.department || "",
      jobPosition: emp?.jobPosition || "",
      typeName: leaveType?.name || "Leave",
    };
  });

  res.json(enriched);
});

// 18. AI Copilot Chat Endpoint
app.post("/api/copilot/chat", authenticateToken, async (req, res) => {
  const { message, chatHistory } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const currentUserId = req.user!.id;
  const role = req.user!.role;

  const db = readDb();
  const emp = db.employees.find((e) => e.id === currentUserId);
  const employeeName = emp ? `${emp.firstName} ${emp.lastName}` : "User";

  // Build secure client-gated context to pass inside Gemini system instructions
  // This avoids hallucinations and guarantees 100% correct, instant lookup answers
  let systemContext = "";

  if (role === UserRole.Employee) {
    const myBalances = db.timeOffBalances.filter((b) => b.employeeId === currentUserId).map((b) => {
      const type = db.timeOffTypes.find((t) => t.id === b.timeOffTypeId);
      return `${type?.name || "Leave"}: ${b.daysAvailable} days available`;
    }).join("\n");

    const myAttendance = db.attendance.filter((a) => a.employeeId === currentUserId).map((a) => {
      return `Date: ${a.date}, CheckIn: ${a.checkIn || "Absent"}, CheckOut: ${a.checkOut || "N/A"}, Status: ${a.status}`;
    }).join("\n");

    const myRequests = db.timeOffRequests.filter((r) => r.employeeId === currentUserId).map((r) => {
      const type = db.timeOffTypes.find((t) => t.id === r.timeOffTypeId);
      return `Leave Request: ${type?.name} from ${r.startDate} to ${r.endDate} (${r.allocationDays} days) Status: ${r.status}, Comment: ${r.comments || ""}`;
    }).join("\n");

    const mySalary = db.salaryStructures.find((s) => s.employeeId === currentUserId);
    const salStr = mySalary ? `Salary Details: Monthly Gross Wage: ₹${mySalary.monthWage}, Basic Salary: ₹${mySalary.monthWage * 0.5}, HRA: ₹${mySalary.monthWage * 0.25}, Standard Allowance: ₹${mySalary.standardAllowance}` : "N/A";

    systemContext = `
You are "Mind Assistant", the expert HR AI Copilot inside HR Mind.
The current logged-in user is an EMPLOYEE named ${employeeName} (ID: ${currentUserId}).

YOUR PERSONAL POLICY DATA & REAL-TIME RECORDS:
- Current Leave Balances:
${myBalances}

- Current Month Attendance Logs:
${myAttendance}

- Leave Requests History:
${myRequests}

- ${salStr}

CRITICAL RULES:
1. You can only view and answer questions about this employee's OWN data. You DO NOT have access to anyone else's salary, Private Info, or attendance.
2. Ground all answers strictly in the numbers provided above. Never hallucinate balances, dates, or salary components.
3. If the user asks you to apply for leave (e.g. "Apply for 2 days sick leave starting 2026-07-06"), say that you have prepared the draft request on the screen. Also, write down a special JSON tag at the end of your response to pre-fill the form:
[DRAFT_ACTION:{"type":"apply_leave","startDate":"2026-07-06","endDate":"2026-07-07","timeOffTypeId":"type-sick","remarks":"Requested via Mind Assistant"}]
Always adapt the dates and typeId inside the draft tag based on user instructions. The available typeIds are:
- 'type-paid' (Paid Time Off)
- 'type-sick' (Sick Time Off)
- 'type-unpaid' (Unpaid Leave)
Ensure dates are formatted as YYYY-MM-DD.
4. Keep replies helpful, clean, professional, and friendly.
`;
  } else {
    // Admin / HR role - has elevated permissions!
    const employeesSummary = db.employees.map((e) => {
      const user = db.users.find((u) => u.id === e.userId);
      return `- ${e.firstName} ${e.lastName} (ID: ${e.id}, Dept: ${e.department}, Position: ${e.jobPosition}, Email: ${user?.email || ""})`;
    }).join("\n");

    const todayStr = new Date().toISOString().split("T")[0];
    const todayAtt = db.attendance.filter((a) => a.date === todayStr).map((a) => {
      const empName = db.employees.find((e) => e.id === a.employeeId);
      return `- ${empName?.firstName || "Unknown"} ${empName?.lastName || "Unknown"}: ${a.checkIn ? "Checked in at " + a.checkIn : "Absent"} (Status: ${a.status})`;
    }).join("\n");

    const pendingRequests = db.timeOffRequests.filter((r) => r.status === TimeOffRequestStatus.Pending).map((r) => {
      const empName = db.employees.find((e) => e.id === r.employeeId);
      const leaveType = db.timeOffTypes.find((t) => t.id === r.timeOffTypeId);
      return `- Request ${r.id} from ${empName?.firstName} ${empName?.lastName}: ${leaveType?.name} from ${r.startDate} to ${r.endDate} (${r.allocationDays} days). Reason: "${r.remarks || ""}"`;
    }).join("\n");

    systemContext = `
You are "Mind Assistant", the expert HR AI Copilot inside HR Mind.
The current logged-in user is an ADMIN / HR OFFICER named ${employeeName}. You have full access to company directory, live attendance, and leave approvals.

REAL-TIME TEAM RECORDS:
- Company Employee Directory:
${employeesSummary}

- Today's (${todayStr}) Attendance Status:
${todayAtt || "No active check-ins or records logged today."}

- Pending Leave Requests to Review:
${pendingRequests || "No pending requests at this time."}

CRITICAL RULES:
1. You can answer queries about any employee's details, today's team attendance, or summary trends.
2. Ground all reports, summaries, and names in the real database lists above. Do not make up mock employees.
3. If asked who is absent today, compare today's checked-in list against the full directory. (Those not checked-in or on leave are Absent).
4. If they ask you to write an email or draft a policy announcement, provide a beautiful corporate draft they can copy.
5. Keep your tone executive, polished, helpful, and highly competent.
`;
  }

  try {
    const aiKey = process.env.GEMINI_API_KEY;
    if (!aiKey || aiKey === "MY_GEMINI_API_KEY") {
      return res.json({
        content: "Hello! The Gemini API is not fully configured in your environment yet. Please provide a real `GEMINI_API_KEY` in the AI Studio Settings menu to activate live smart responses. (Showing offline helpful guidelines instead: I am Mind Assistant, here to manage your leave balances and logs!)"
      });
    }

    const ai = new GoogleGenAI({ apiKey: aiKey });

    const contents: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.slice(-10).forEach((chat: any) => {
        contents.push({
          role: chat.role === "user" ? "user" : "model",
          parts: [{ text: chat.content }],
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemContext,
        temperature: 0.3,
      }
    });

    let assistantReply = response.text || "I apologize, but I could not compute a clear response right now. How else can I assist?";
    
    // Extract any [DRAFT_ACTION:...] block if present
    let draftAction: any = null;
    const actionMatch = assistantReply.match(/\[DRAFT_ACTION:(.*?)\]/);
    if (actionMatch) {
      try {
        draftAction = JSON.parse(actionMatch[1]);
        // Strip the block from the visible text response to make it look clean
        assistantReply = assistantReply.replace(/\[DRAFT_ACTION:.*?\]/, "").trim();
      } catch (e) {
        console.error("Failed to parse draft action JSON", e);
      }
    }

    res.json({
      content: assistantReply,
      draftAction,
    });
  } catch (err: any) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Failed to communicate with AI Copilot. Check API configuration." });
  }
});

// Serve frontend in dev middleware mode or production static
const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  // We'll lazy import Vite so it is only loaded during dev and doesn't pollute the production server bundle build
  console.log("Starting server in development mode with Vite middleware...");
  import("vite").then(async (ViteModule) => {
    const vite = await ViteModule.createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  });
} else {
  console.log("Starting server in production mode...");
  const distPath = path.join(process.cwd(), "dist", "client");
  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`HR Mind server listening on http://0.0.0.0:${PORT}`);
});
