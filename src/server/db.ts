/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  DbSchema,
  UserRole,
  User,
  Employee,
  SalaryStructure,
  BankDetail,
  AttendanceStatus,
  TimeOffRequestStatus,
  TimeOffType,
  Attendance
} from "../types.js";

const DB_FILE = path.join(process.cwd(), "db.json");

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function generateLoginId(
  prefix: string,
  firstName: string,
  lastName: string,
  joiningDateStr: string,
  existingUsers: User[]
): string {
  const cleanFirst = (firstName || "XX").replace(/[^a-zA-Z]/g, "").toUpperCase();
  const cleanLast = (lastName || "XX").replace(/[^a-zA-Z]/g, "").toUpperCase();
  const f2 = (cleanFirst + "XX").substring(0, 2);
  const l2 = (cleanLast + "XX").substring(0, 2);
  const letters = f2 + l2;

  const year = new Date(joiningDateStr).getFullYear().toString();

  // Find other users in the same company for that year
  const prefixYearStr = `${prefix}${letters}${year}`;
  const yearPrefix = prefix + letters + year;

  // Let's filter existing login IDs starting with MTVIME2026, MTRASE2026, etc.
  // The PRD format: [CompanyPrefix][First2LettersFirstName+First2LettersLastName][YearOfJoining][SerialNumberInYear]
  // e.g. MTRASE20260001
  const matches = existingUsers.filter((u) => u.loginId.startsWith(yearPrefix));
  let maxSerial = 0;
  for (const match of matches) {
    const serialStr = match.loginId.slice(yearPrefix.length);
    const serial = parseInt(serialStr, 10);
    if (!isNaN(serial) && serial > maxSerial) {
      maxSerial = serial;
    }
  }

  const nextSerial = maxSerial + 1;
  const serialStr = nextSerial.toString().padStart(4, "0");

  return `${yearPrefix}${serialStr}`;
}

const DEFAULT_COMPANY_ID = "company-1";

export function getInitialDb(): DbSchema {
  const companyId = DEFAULT_COMPANY_ID;

  const adminId = "user-admin";
  const hrId = "user-hr";
  const emp1Id = "user-emp1";
  const emp2Id = "user-emp2";

  const adminUser: User = {
    id: adminId,
    companyId,
    loginId: "MTADSH20260001",
    email: "admin@hrmind.com",
    passwordHash: hashPassword("admin123"),
    role: UserRole.Admin,
    mustResetPassword: false,
    createdAt: new Date().toISOString(),
  };

  const hrUser: User = {
    id: hrId,
    companyId,
    loginId: "MTVIME20260002",
    email: "hr@hrmind.com",
    passwordHash: hashPassword("hr123"),
    role: UserRole.HROfficer,
    mustResetPassword: false,
    createdAt: new Date().toISOString(),
  };

  const emp1User: User = {
    id: emp1Id,
    companyId,
    loginId: "MTRASE20260003",
    email: "rahul@hrmind.com",
    passwordHash: hashPassword("employee123"),
    role: UserRole.Employee,
    mustResetPassword: true, // Needs force reset
    createdAt: new Date().toISOString(),
  };

  const emp2User: User = {
    id: emp2Id,
    companyId,
    loginId: "MTPRNA20260004",
    email: "priya@hrmind.com",
    passwordHash: hashPassword("employee123"),
    role: UserRole.Employee,
    mustResetPassword: false,
    createdAt: new Date().toISOString(),
  };

  const companies = [
    {
      id: companyId,
      name: "MindTech Solutions",
      prefix: "MT",
      payrollConfig: {
        pfEmployeePct: 12,
        pfEmployerPct: 12,
        professionalTax: 200,
        basicPct: 50,
        hraPct: 50,
        performanceBonusPct: 8.33,
        ltaPct: 8.333,
      },
    },
  ];

  const employees: Employee[] = [
    {
      id: adminId,
      userId: adminId,
      firstName: "Aditi",
      lastName: "Sharma",
      dob: "1988-04-12",
      phone: "+91 98765 43210",
      personalEmail: "aditi.sharma.personal@gmail.com",
      gender: "Female",
      maritalStatus: "Married",
      nationality: "Indian",
      address: "Flat 402, Sea Breeze Apartments, Bandra West, Mumbai, MH",
      department: "Administration",
      jobPosition: "Chief HR Administrator",
      location: "Mumbai",
      dateOfJoining: "2026-01-01",
      about: "Passionate HR Leader with 10+ years of experience aligning human potential with business growth. Dedicated to crafting healthy work cultures.",
      jobLoveNote: "I love building programs that support lifelong career growth for our workforce.",
      hobbies: "Classical dance, reading non-fiction, exploring heritage cafes",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
    },
    {
      id: hrId,
      userId: hrId,
      firstName: "Vikram",
      lastName: "Mehta",
      dob: "1992-09-25",
      phone: "+91 98123 45678",
      personalEmail: "vikram.mehta.92@yahoo.com",
      gender: "Male",
      maritalStatus: "Single",
      nationality: "Indian",
      address: "12A, Ground Floor, Shanti Kunj, Sector 21, Gurugram, HR",
      department: "Human Resources",
      jobPosition: "HR Operations Officer",
      managerId: adminId,
      location: "Gurugram",
      dateOfJoining: "2026-01-10",
      about: "People-centric specialist focused on streamlining onboarding, performance management, and benefits administration.",
      jobLoveNote: "Solving complex payroll and attendance cases to make everyday work simple for everyone.",
      hobbies: "Table tennis, sketching, organic farming",
      avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
    },
    {
      id: emp1Id,
      userId: emp1Id,
      firstName: "Rahul",
      lastName: "Sen",
      dob: "1995-11-05",
      phone: "+91 97777 88888",
      personalEmail: "rahul.sen.engineer@gmail.com",
      gender: "Male",
      maritalStatus: "Single",
      nationality: "Indian",
      address: "No. 45, 3rd Cross, Indiranagar, Bengaluru, KA",
      department: "Engineering",
      jobPosition: "Senior Frontend Engineer",
      managerId: hrId,
      location: "Bengaluru",
      dateOfJoining: "2026-02-15",
      about: "Frontend craftsman specializing in React, responsive interfaces, and interactive dashboards. Obsessed with high-performance CSS and layouts.",
      jobLoveNote: "Turning complex wireframes into polished responsive user interfaces that perform flawlessly.",
      hobbies: "Amateur photography, synthesizers, mechanical keyboards",
      avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
    },
    {
      id: emp2Id,
      userId: emp2Id,
      firstName: "Priya",
      lastName: "Nair",
      dob: "1997-07-19",
      phone: "+91 95555 12345",
      personalEmail: "priya.nair.dev@gmail.com",
      gender: "Female",
      maritalStatus: "Single",
      nationality: "Indian",
      address: "Block B, Skyline Heights, Kakkanad, Kochi, KL",
      department: "Engineering",
      jobPosition: "Backend Systems Engineer",
      managerId: hrId,
      location: "Kochi",
      dateOfJoining: "2026-03-01",
      about: "Cloud architecture enthusiast and Node.js developer. Experienced with database performance optimization and robust security endpoints.",
      jobLoveNote: "Designing secure, bulletproof database schemas and asynchronous queue processors.",
      hobbies: "Baking, playing violin, hiking in the Western Ghats",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    },
  ];

  const skills = [
    { id: "sk-1", employeeId: emp1Id, name: "React 19" },
    { id: "sk-2", employeeId: emp1Id, name: "Vite & bundlers" },
    { id: "sk-3", employeeId: emp1Id, name: "Tailwind CSS v4" },
    { id: "sk-4", employeeId: emp1Id, name: "TypeScript" },
    { id: "sk-5", employeeId: emp1Id, name: "Zustand State" },
    { id: "sk-6", employeeId: emp2Id, name: "Node.js & Express" },
    { id: "sk-7", employeeId: emp2Id, name: "SQLite & PostgreSQL" },
    { id: "sk-8", employeeId: emp2Id, name: "Docker containers" },
    { id: "sk-9", employeeId: emp2Id, name: "Google Cloud Platform" },
  ];

  const certifications = [
    { id: "crt-1", employeeId: emp1Id, name: "Meta Certified Frontend Developer", issuer: "Coursera", date: "2025-08-10" },
    { id: "crt-2", employeeId: emp2Id, name: "Google Cloud Certified Associate Cloud Engineer", issuer: "Google Cloud", date: "2025-12-18" },
  ];

  const salaryStructures: SalaryStructure[] = [
    {
      id: "sal-admin",
      employeeId: adminId,
      monthWage: 150000,
      yearlyWage: 1800000,
      workingDaysPerWeek: 5,
      breakTimeHrs: 1,
      basicPct: 50,
      hraPct: 50,
      standardAllowance: 4167,
      performanceBonusPct: 8.33,
      ltaPct: 8.333,
      pfEmployeePct: 12,
      pfEmployerPct: 12,
      professionalTax: 200,
      effectiveFrom: "2026-01-01",
    },
    {
      id: "sal-hr",
      employeeId: hrId,
      monthWage: 90000,
      yearlyWage: 1080000,
      workingDaysPerWeek: 5,
      breakTimeHrs: 1,
      basicPct: 50,
      hraPct: 50,
      standardAllowance: 4167,
      performanceBonusPct: 8.33,
      ltaPct: 8.333,
      pfEmployeePct: 12,
      pfEmployerPct: 12,
      professionalTax: 200,
      effectiveFrom: "2026-01-10",
    },
    {
      id: "sal-emp1",
      employeeId: emp1Id,
      monthWage: 110000,
      yearlyWage: 1320000,
      workingDaysPerWeek: 5,
      breakTimeHrs: 1,
      basicPct: 50,
      hraPct: 50,
      standardAllowance: 4167,
      performanceBonusPct: 8.33,
      ltaPct: 8.333,
      pfEmployeePct: 12,
      pfEmployerPct: 12,
      professionalTax: 200,
      effectiveFrom: "2026-02-15",
    },
    {
      id: "sal-emp2",
      employeeId: emp2Id,
      monthWage: 85000,
      yearlyWage: 1020000,
      workingDaysPerWeek: 5,
      breakTimeHrs: 1,
      basicPct: 50,
      hraPct: 50,
      standardAllowance: 4167,
      performanceBonusPct: 8.33,
      ltaPct: 8.333,
      pfEmployeePct: 12,
      pfEmployerPct: 12,
      professionalTax: 200,
      effectiveFrom: "2026-03-01",
    },
  ];

  const bankDetails: BankDetail[] = [
    {
      id: "bank-admin",
      employeeId: adminId,
      accountNumber: "456789123456",
      bankName: "HDFC Bank Ltd",
      ifscCode: "HDFC0000104",
      panNo: "ABCPS1234A",
      uanNo: "100234567891",
      empCode: "MT-ADM-001",
    },
    {
      id: "bank-hr",
      employeeId: hrId,
      accountNumber: "987654321012",
      bankName: "ICICI Bank Ltd",
      ifscCode: "ICIC0000012",
      panNo: "DEFPS5678B",
      uanNo: "100234567892",
      empCode: "MT-HR-002",
    },
    {
      id: "bank-emp1",
      employeeId: emp1Id,
      accountNumber: "112233445566",
      bankName: "State Bank of India",
      ifscCode: "SBIN0001234",
      panNo: "GHIJS9012C",
      uanNo: "100234567893",
      empCode: "MT-ENG-003",
    },
    {
      id: "bank-emp2",
      employeeId: emp2Id,
      accountNumber: "998877665544",
      bankName: "Axis Bank Ltd",
      ifscCode: "UTIB0000051",
      panNo: "JKLPS3456D",
      uanNo: "100234567894",
      empCode: "MT-ENG-004",
    },
  ];

  // We want to prefill a few attendance logs for 2026-07-01, 2026-07-02, 2026-07-03
  // Today's date in local metadata metadata is 2026-07-04.
  const attendance: Attendance[] = [
    // 2026-07-01
    { id: "att-1", employeeId: adminId, date: "2026-07-01", checkIn: "09:15:00", checkOut: "18:15:00", workHours: 9, extraHours: 0, status: AttendanceStatus.Present },
    { id: "att-2", employeeId: hrId, date: "2026-07-01", checkIn: "09:02:00", checkOut: "18:30:00", workHours: 9.47, extraHours: 0.47, status: AttendanceStatus.Present },
    { id: "att-3", employeeId: emp1Id, date: "2026-07-01", checkIn: "09:30:00", checkOut: "18:45:00", workHours: 9.25, extraHours: 0.25, status: AttendanceStatus.Present },
    { id: "att-4", employeeId: emp2Id, date: "2026-07-01", checkIn: "09:10:00", checkOut: "18:00:00", workHours: 8.83, extraHours: 0, status: AttendanceStatus.Present },

    // 2026-07-02
    { id: "att-5", employeeId: adminId, date: "2026-07-02", checkIn: "09:20:00", checkOut: "18:10:00", workHours: 8.83, extraHours: 0, status: AttendanceStatus.Present },
    { id: "att-6", employeeId: hrId, date: "2026-07-02", checkIn: "08:55:00", checkOut: "18:15:00", workHours: 9.33, extraHours: 0.33, status: AttendanceStatus.Present },
    { id: "att-7", employeeId: emp1Id, date: "2026-07-02", workHours: 0, extraHours: 0, status: AttendanceStatus.Leave }, // On approved leave
    { id: "att-8", employeeId: emp2Id, date: "2026-07-02", checkIn: "09:05:00", checkOut: "18:12:00", workHours: 9.12, extraHours: 0.12, status: AttendanceStatus.Present },

    // 2026-07-03
    { id: "att-9", employeeId: adminId, date: "2026-07-03", checkIn: "09:05:00", checkOut: "18:00:00", workHours: 8.92, extraHours: 0, status: AttendanceStatus.Present },
    { id: "att-10", employeeId: hrId, date: "2026-07-03", checkIn: "09:12:00", checkOut: "18:15:00", workHours: 9.05, extraHours: 0.05, status: AttendanceStatus.Present },
    { id: "att-11", employeeId: emp1Id, date: "2026-07-03", checkIn: "09:15:00", checkOut: "18:30:00", workHours: 9.25, extraHours: 0.25, status: AttendanceStatus.Present },
    { id: "att-12", employeeId: emp2Id, date: "2026-07-03", checkIn: "09:40:00", checkOut: "14:10:00", workHours: 4.5, extraHours: 0, status: AttendanceStatus.HalfDay },

    // 2026-07-04 (Today - No check ins initially so people show as Yellow "Absent" until they check in)
    // We let Priya be Present today from 09:00:00 so the directory looks alive immediately!
    { id: "att-13", employeeId: emp2Id, date: "2026-07-04", checkIn: "09:00:00", workHours: 0, extraHours: 0, status: AttendanceStatus.Present },
  ];

  const timeOffTypes: TimeOffType[] = [
    { id: "type-paid", companyId, name: "Paid Time Off", isPaid: true, requiresAttachment: false },
    { id: "type-sick", companyId, name: "Sick Time Off", isPaid: true, requiresAttachment: true },
    { id: "type-unpaid", companyId, name: "Unpaid Leave", isPaid: false, requiresAttachment: false },
  ];

  const timeOffBalances = [
    // Admin
    { id: "bal-ad-paid", employeeId: adminId, timeOffTypeId: "type-paid", daysAvailable: 15, year: 2026 },
    { id: "bal-ad-sick", employeeId: adminId, timeOffTypeId: "type-sick", daysAvailable: 10, year: 2026 },
    // HR
    { id: "bal-hr-paid", employeeId: hrId, timeOffTypeId: "type-paid", daysAvailable: 18, year: 2026 },
    { id: "bal-hr-sick", employeeId: hrId, timeOffTypeId: "type-sick", daysAvailable: 10, year: 2026 },
    // Rahul
    { id: "bal-e1-paid", employeeId: emp1Id, timeOffTypeId: "type-paid", daysAvailable: 12, year: 2026 },
    { id: "bal-e1-sick", employeeId: emp1Id, timeOffTypeId: "type-sick", daysAvailable: 8, year: 2026 },
    // Priya
    { id: "bal-e2-paid", employeeId: emp2Id, timeOffTypeId: "type-paid", daysAvailable: 16, year: 2026 },
    { id: "bal-e2-sick", employeeId: emp2Id, timeOffTypeId: "type-sick", daysAvailable: 9, year: 2026 },
  ];

  const timeOffRequests = [
    {
      id: "req-1",
      employeeId: emp1Id,
      timeOffTypeId: "type-paid",
      startDate: "2026-07-02",
      endDate: "2026-07-02",
      allocationDays: 1,
      remarks: "Family gathering in Chennai",
      status: TimeOffRequestStatus.Approved,
      reviewedBy: "Aditi Sharma (Admin)",
      reviewedAt: "2026-06-25T11:30:00Z",
      comments: "Approved. Please handover critical front-end work to team.",
    },
    {
      id: "req-2",
      employeeId: emp1Id,
      timeOffTypeId: "type-sick",
      startDate: "2026-07-15",
      endDate: "2026-07-16",
      allocationDays: 2,
      remarks: "Dental extraction procedure",
      attachmentUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200",
      status: TimeOffRequestStatus.Pending,
    },
    {
      id: "req-3",
      employeeId: emp2Id,
      timeOffTypeId: "type-paid",
      startDate: "2026-07-28",
      endDate: "2026-07-30",
      allocationDays: 3,
      remarks: "Visiting family in Kerala",
      status: TimeOffRequestStatus.Pending,
    }
  ];

  const copilotMessages: any[] = [];

  return {
    companies,
    users: [adminUser, hrUser, emp1User, emp2User],
    employees,
    skills,
    certifications,
    salaryStructures,
    bankDetails,
    attendance,
    timeOffTypes,
    timeOffBalances,
    timeOffRequests,
    copilotMessages,
  };
}

export function readDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDb();
      writeDb(initial);
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read database, resetting to default seed data", e);
    const initial = getInitialDb();
    writeDb(initial);
    return initial;
  }
}

export function writeDb(data: DbSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write to database file", e);
  }
}
