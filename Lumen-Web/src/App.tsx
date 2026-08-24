import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./pages/public/PublicLayout";
import { Landing } from "./pages/public/Landing";
import { About } from "./pages/public/About";
import { Features } from "./pages/public/Features";
import { Faq } from "./pages/public/Faq";
import { Contact } from "./pages/public/Contact";

import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { VerifyOtp } from "./pages/VerifyOtp";
import { ForgotPassword } from "./pages/ForgotPassword";

import { AppShell } from "./components/AppShell";
import { RequireRole, RoleHome } from "./components/RequireRole";

// Operator console
import { Dashboard } from "./pages/Dashboard";
import { Complaints } from "./pages/Complaints";
import { NewComplaint } from "./pages/NewComplaint";
import { ComplaintDetail } from "./pages/ComplaintDetail";
import { Assignment } from "./pages/Assignment";
import { Gis } from "./pages/Gis";
import { Engineers } from "./pages/Engineers";
import { NewEngineer } from "./pages/NewEngineer";
import { AuditLogs } from "./pages/AuditLogs";
import { Users } from "./pages/staff/Users";
import { StaffAnalytics } from "./pages/staff/Analytics";

// Citizen portal
import { CitizenDashboard } from "./pages/citizen/CitizenDashboard";
import { MyReports } from "./pages/citizen/MyReports";
import { ReportTracking } from "./pages/citizen/ReportTracking";
import { ReportIssue } from "./pages/citizen/ReportIssue";
import { CitizenAnalytics } from "./pages/citizen/CitizenAnalytics";
import { CitizenProfile } from "./pages/citizen/Profile";
import { CitizenPayments } from "./pages/citizen/Payments";
import { IdentityVerification } from "./pages/citizen/IdentityVerification";

const STAFF = ["ADMINISTRATOR", "SUPERVISOR", "ENGINEER", "DEPARTMENT"];
const MANAGERIAL = ["ADMINISTRATOR", "SUPERVISOR"];

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />
      <Route path="/auth/verify" element={<VerifyOtp />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />

      <Route path="/app" element={<AppShell />}>
        {/* Staff land on the console, citizens on their portal. */}
        <Route index element={<RoleHome />} />

        {/* ---- operator console ---- */}
        <Route element={<RequireRole roles={STAFF} />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="complaints/new" element={<NewComplaint />} />
          <Route path="complaints/:ref" element={<ComplaintDetail />} />
          <Route path="gis" element={<Gis />} />
        </Route>

        <Route element={<RequireRole roles={MANAGERIAL} />}>
          <Route path="assignment" element={<Assignment />} />
          <Route path="engineers" element={<Engineers />} />
          <Route path="engineers/new" element={<NewEngineer />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="analytics" element={<StaffAnalytics />} />
        </Route>

        <Route element={<RequireRole roles={["ADMINISTRATOR"]} />}>
          <Route path="users" element={<Users />} />
        </Route>

        {/* ---- citizen portal ---- */}
        <Route element={<RequireRole roles={["CITIZEN"]} />}>
          <Route path="me" element={<CitizenDashboard />} />
          <Route path="me/report" element={<ReportIssue />} />
          <Route path="me/reports" element={<MyReports />} />
          <Route path="me/reports/:id" element={<ReportTracking />} />
          <Route path="me/analytics" element={<CitizenAnalytics />} />
          <Route path="me/payments" element={<CitizenPayments />} />
          <Route path="me/identity" element={<IdentityVerification />} />
          <Route path="me/profile" element={<CitizenProfile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
