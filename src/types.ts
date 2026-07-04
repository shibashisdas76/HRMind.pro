/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  Admin = "Admin",
  HROfficer = "HR Officer",
  Employee = "Employee",
}

export interface Company {
  id: string;
  name: string;
  prefix: string;
  logoUrl?: string;
  payrollConfig: {
    pfEmployeePct: number;
    pfEmployerPct: number;
    professionalTax: number;
    basicPct: number;
    hraPct: number;
    performanceBonusPct: number;
    ltaPct: number;
  };
}

export interface User {
  id: string;
  companyId: string;
  loginId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  mustResetPassword: boolean;
  createdAt: string;
}

export interface Employee {
  id: string; // matches User.id
  userId: string;
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  personalEmail: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  address: string;
  department: string;
  jobPosition: string;
  managerId?: string;
  location: string;
  dateOfJoining: string;
  avatarUrl?: string;
  about?: string;
  jobLoveNote?: string;
  hobbies?: string;
}

export interface Skill {
  id: string;
  employeeId: string;
  name: string;
}

export interface Certification {
  id: string;
  employeeId: string;
  name: string;
  issuer: string;
  date: string;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  monthWage: number; // e.g. 50000
  yearlyWage: number; // monthWage * 12
  workingDaysPerWeek: number; // e.g. 5
  breakTimeHrs: number; // e.g. 1
  basicPct: number; // e.g. 50%
  hraPct: number; // e.g. 50% of Basic
  standardAllowance: number; // e.g. 4167
  performanceBonusPct: number; // e.g. 8.33% of Basic
  ltaPct: number; // e.g. 8.333% of Basic
  pfEmployeePct: number; // e.g. 12% of Basic
  pfEmployerPct: number; // e.g. 12% of Basic
  professionalTax: number; // e.g. 200
  effectiveFrom: string;
}

export interface BankDetail {
  id: string;
  employeeId: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  panNo: string;
  uanNo: string;
  empCode: string;
}

export enum AttendanceStatus {
  Present = "Present",
  Absent = "Absent",
  HalfDay = "Half-day",
  Leave = "Leave",
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:MM:SS
  checkOut?: string; // HH:MM:SS
  workHours: number;
  extraHours: number;
  status: AttendanceStatus;
}

export interface TimeOffType {
  id: string;
  companyId: string;
  name: string; // "Paid Time Off" or "Sick Time Off" or "Unpaid Leave"
  isPaid: boolean;
  requiresAttachment: boolean;
}

export interface TimeOffBalance {
  id: string;
  employeeId: string;
  timeOffTypeId: string;
  daysAvailable: number;
  year: number;
}

export enum TimeOffRequestStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  timeOffTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  allocationDays: number;
  remarks?: string;
  attachmentUrl?: string;
  status: TimeOffRequestStatus;
  reviewedBy?: string; // name or user id
  reviewedAt?: string;
  comments?: string; // admin review comments
}

export interface CopilotMessage {
  id: string;
  userId: string;
  role: "user" | "model";
  content: string;
  toolCallsJson?: string;
  createdAt: string;
}

export interface DbSchema {
  companies: Company[];
  users: User[];
  employees: Employee[];
  skills: Skill[];
  certifications: Certification[];
  salaryStructures: SalaryStructure[];
  bankDetails: BankDetail[];
  attendance: Attendance[];
  timeOffTypes: TimeOffType[];
  timeOffBalances: TimeOffBalance[];
  timeOffRequests: TimeOffRequest[];
  copilotMessages: CopilotMessage[];
}
