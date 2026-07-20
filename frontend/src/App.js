import { useEffect, useMemo, useState } from "react";
import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import {
  Award,
  CalendarDays,
  ChartColumnBig,
  ClipboardList,
  Dumbbell,
  FileCheck2,
  FileDown,
  LogOut,
  Medal,
  Music4,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
  UserRoundCheck,
  Users,
  Video,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const TOKEN_KEY = "talent-platform-token";

const demoAccounts = [
  { role: "admin", label: "Admin", email: "admin@talentdemo.com", password: "Admin123!" },
  { role: "coach", label: "Coach", email: "coach@talentdemo.com", password: "Coach123!" },
  { role: "student", label: "Student", email: "student@talentdemo.com", password: "Student123!" },
  { role: "parent", label: "Parent", email: "parent@talentdemo.com", password: "Parent123!" },
];

const roleIcons = {
  admin: ShieldCheck,
  coach: Dumbbell,
  student: Medal,
  parent: Users,
};

const toneClassMap = {
  blue: "badge-tone-blue",
  green: "badge-tone-green",
  purple: "badge-tone-purple",
  default: "badge-tone-default",
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateOnly = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
    }
    return url;
  } catch {
    return url;
  }
};

const apiConfig = (token) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

const SectionHeading = ({ eyebrow, title, description, testId }) => (
  <div className="section-heading" data-testid={testId}>
    <span className="section-eyebrow">{eyebrow}</span>
    <h2 className="section-title">{title}</h2>
    <p className="section-copy">{description}</p>
  </div>
);

const MetricCard = ({ item, index }) => (
  <Card className="metric-card" data-testid={`metric-card-${index}`}>
    <CardHeader className="metric-card-header">
      <CardDescription data-testid={`metric-label-${index}`}>{item.label}</CardDescription>
      <CardTitle className="metric-card-value" data-testid={`metric-value-${index}`}>
        {item.value}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="metric-card-detail" data-testid={`metric-detail-${index}`}>
        {item.detail}
      </p>
    </CardContent>
  </Card>
);

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [health, setHealth] = useState(null);
  const [loadingRole, setLoadingRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/health`)
      .then((response) => setHealth(response.data))
      .catch(() => setHealth(null));
  }, []);

  const submit = async (loginEmail, loginPassword, sourceRole) => {
    try {
      setSubmitting(true);
      setLoadingRole(sourceRole || "manual");
      await onLogin(loginEmail, loginPassword);
    } finally {
      setSubmitting(false);
      setLoadingRole("");
    }
  };

  return (
    <div className="login-shell" data-testid="login-screen">
      <div className="login-hero-panel glass-panel" data-testid="login-hero-panel">
        <div className="hero-chip-row" data-testid="hero-chip-row">
          <Badge className="hero-chip badge-tone-blue" data-testid="hero-chip-programs">
            School operations
          </Badge>
          <Badge className="hero-chip badge-tone-green" data-testid="hero-chip-student-growth">
            Student growth
          </Badge>
          <Badge className="hero-chip badge-tone-purple" data-testid="hero-chip-certificates">
            Digital certificates
          </Badge>
        </div>
        <h1 className="hero-title" data-testid="login-hero-title">
          Talent development, coaching insight, and family updates in one platform.
        </h1>
        <p className="hero-description" data-testid="login-hero-description">
          Built for school sports and music programs with Azure-ready AI summaries, Blob-backed assets, SQL-ready persistence, and portfolio certificates.
        </p>

        <div className="hero-status-grid" data-testid="hero-status-grid">
          <div className="status-tile" data-testid="status-database-mode">
            <span className="status-label">Database</span>
            <strong>{health?.database_mode || "checking"}</strong>
          </div>
          <div className="status-tile" data-testid="status-summary-mode">
            <span className="status-label">Summaries</span>
            <strong>{health?.summary_mode || "checking"}</strong>
          </div>
          <div className="status-tile" data-testid="status-storage-mode">
            <span className="status-label">Storage</span>
            <strong>{health?.storage_mode || "checking"}</strong>
          </div>
          <div className="status-tile" data-testid="status-blob-container">
            <span className="status-label">Container</span>
            <strong>{health?.container || "app-assets"}</strong>
          </div>
        </div>

        <div className="demo-grid" data-testid="demo-account-grid">
          {demoAccounts.map((account) => {
            const Icon = roleIcons[account.role];
            return (
              <button
                key={account.role}
                type="button"
                className="demo-tile"
                data-testid={`demo-login-${account.role}`}
                onClick={() => submit(account.email, account.password, account.role)}
              >
                <div className="demo-tile-topline">
                  <Icon size={18} />
                  <span>{account.label}</span>
                </div>
                <div className="demo-tile-body">
                  <strong>{account.email}</strong>
                  <span>{account.password}</span>
                </div>
                <span className="demo-tile-action">
                  {loadingRole === account.role ? "Signing in…" : "Open dashboard"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="login-form-panel glass-panel" data-testid="login-form-panel">
        <CardHeader>
          <CardTitle data-testid="login-form-title">Sign in to a role dashboard</CardTitle>
          <CardDescription data-testid="login-form-copy">
            Use the seeded demo accounts or enter credentials manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="stack-lg"
            data-testid="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              submit(email, password, "manual");
            }}
          >
            <div className="stack-sm">
              <label className="field-label" htmlFor="login-email">
                Email
              </label>
              <Input
                id="login-email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="coach@talentdemo.com"
              />
            </div>
            <div className="stack-sm">
              <label className="field-label" htmlFor="login-password">
                Password
              </label>
              <Input
                id="login-password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <Button
              type="submit"
              className="primary-cta"
              data-testid="login-submit-button"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="credential-list" data-testid="credential-list">
            {demoAccounts.map((account) => (
              <div key={account.role} className="credential-row" data-testid={`credential-row-${account.role}`}>
                <span>{account.label}</span>
                <strong>{account.email}</strong>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const DashboardShell = ({ token, user, onLogout }) => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [summaryResult, setSummaryResult] = useState("");
  const [activityForm, setActivityForm] = useState({
    title: "",
    category: "sports",
    track: "",
    description: "",
    schedule: "",
    capacity: 24,
    coach_id: "",
  });
  const [enrollmentForm, setEnrollmentForm] = useState({ activity_id: "", student_id: "" });
  const [materialForm, setMaterialForm] = useState({
    activity_id: "",
    title: "",
    material_type: "video-upload",
    description: "",
    youtube_url: "",
  });
  const [practiceForm, setPracticeForm] = useState({
    activity_id: "",
    duration_minutes: 60,
    mood: "Focused",
    notes: "",
  });
  const [summaryForm, setSummaryForm] = useState({
    student_id: "",
    activity_id: "",
    notes: "",
    achievements: "",
    next_focus: "",
  });
  const [assessmentForm, setAssessmentForm] = useState({
    student_id: "",
    activity_id: "",
    skill_label: "Technique",
    score: 85,
    coach_notes: "",
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    event_type: "tournament",
    activity_id: "",
    event_date: "",
    location: "",
    details: "",
    leader_student_id: "",
  });
  const [certificateForm, setCertificateForm] = useState({
    student_id: "",
    activity_id: "",
    title: "Certificate of Achievement",
    badge_label: "Spotlight Award",
  });
  const [leadForm, setLeadForm] = useState({ enrollment_id: "", lead_role: "captain" });

  const roleLabel = user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : "";
  const RoleIcon = roleIcons[user?.role] || ShieldCheck;

  const sections = useMemo(() => {
    const map = {
      admin: [
        { key: "overview", label: "Overview", icon: ChartColumnBig },
        { key: "activities", label: "Programs", icon: Dumbbell },
        { key: "materials", label: "Materials", icon: Video },
        { key: "events", label: "Events", icon: CalendarDays },
        { key: "portfolio", label: "Portfolio", icon: Award },
        { key: "analytics", label: "Analytics", icon: Sparkles },
      ],
      coach: [
        { key: "overview", label: "Overview", icon: ChartColumnBig },
        { key: "roster", label: "Roster", icon: Users },
        { key: "materials", label: "Materials", icon: UploadCloud },
        { key: "summaries", label: "Summaries", icon: Sparkles },
        { key: "assessments", label: "Assessments", icon: ClipboardList },
        { key: "events", label: "Events", icon: CalendarDays },
        { key: "portfolio", label: "Certificates", icon: Award },
      ],
      student: [
        { key: "overview", label: "Overview", icon: ChartColumnBig },
        { key: "practice", label: "Practice", icon: Medal },
        { key: "materials", label: "Materials", icon: PlayCircle },
        { key: "events", label: "Events", icon: CalendarDays },
        { key: "portfolio", label: "Portfolio", icon: Award },
      ],
      parent: [
        { key: "overview", label: "Overview", icon: ChartColumnBig },
        { key: "children", label: "Children", icon: UserRoundCheck },
        { key: "summaries", label: "Summaries", icon: Sparkles },
        { key: "events", label: "Events", icon: CalendarDays },
        { key: "portfolio", label: "Portfolio", icon: Award },
      ],
    };
    return map[user.role] || map.student;
  }, [user.role]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/dashboard`, apiConfig(token));
      setDashboard(response.data);
      if (!activityForm.activity_id && response.data.options.activities[0]) {
        setActivityForm((state) => ({ ...state, coach_id: response.data.options.coaches[0]?.id?.toString() || "" }));
        setEnrollmentForm((state) => ({
          ...state,
          activity_id: response.data.options.activities[0]?.id?.toString() || "",
          student_id: response.data.options.students[0]?.id?.toString() || "",
        }));
        setMaterialForm((state) => ({ ...state, activity_id: response.data.options.activities[0]?.id?.toString() || "" }));
        setPracticeForm((state) => ({ ...state, activity_id: response.data.options.activities[0]?.id?.toString() || "" }));
        setSummaryForm((state) => ({
          ...state,
          student_id: response.data.options.students[0]?.id?.toString() || "",
          activity_id: response.data.options.activities[0]?.id?.toString() || "",
        }));
        setAssessmentForm((state) => ({
          ...state,
          student_id: response.data.options.students[0]?.id?.toString() || "",
          activity_id: response.data.options.activities[0]?.id?.toString() || "",
        }));
        setEventForm((state) => ({
          ...state,
          activity_id: response.data.options.activities[0]?.id?.toString() || "",
          leader_student_id: response.data.options.students[0]?.id?.toString() || "",
        }));
        setCertificateForm((state) => ({
          ...state,
          student_id: response.data.options.students[0]?.id?.toString() || "",
          activity_id: response.data.options.activities[0]?.id?.toString() || "",
        }));
        setLeadForm((state) => ({ ...state, enrollment_id: response.data.options.enrollments[0]?.id?.toString() || "" }));
      }
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
        navigate("/login");
      } else {
        toast.error(error.response?.data?.detail || "Unable to load dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const runAction = async (actionName, handler) => {
    try {
      setBusyAction(actionName);
      await handler();
      await fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Something went wrong");
    } finally {
      setBusyAction("");
    }
  };

  const filteredEvents = useMemo(() => {
    if (!dashboard?.events) return [];
    return dashboard.events.filter((event) => {
      const current = new Date(event.event_date);
      return current.toDateString() === selectedDate.toDateString();
    });
  }, [dashboard?.events, selectedDate]);

  const openPdf = (downloadUrl) => {
    window.open(`${BACKEND_URL}${downloadUrl}`, "_blank", "noopener,noreferrer");
  };

  const heroCopyByRole = {
    admin: "School-wide visibility across talent pathways, attendance rhythm, and achievement momentum.",
    coach: "Guide practice standards, deliver family-ready summaries, and keep roster leadership clear.",
    student: "Track your progress, build your portfolio, and stay ready for both competition and performance.",
    parent: "See practice progress, event readiness, and portfolio milestones in one place.",
  };

  if (loading || !dashboard) {
    return (
      <div className="loading-state" data-testid="dashboard-loading-state">
        <RefreshCw className="spin-icon" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="stack-xl" data-testid="overview-panel">
      <SectionHeading
        eyebrow={`${roleLabel} overview`}
        title="Role-based insight across sports and music development"
        description={heroCopyByRole[user.role]}
        testId="overview-section-heading"
      />

      <div className="metrics-grid" data-testid="metrics-grid">
        {dashboard.stats.map((item, index) => (
          <MetricCard item={item} index={index} key={`${item.label}-${index}`} />
        ))}
      </div>

      <div className="overview-grid" data-testid="overview-grid">
        <Card className="glass-panel chart-card" data-testid="practice-chart-card">
          <CardHeader>
            <CardTitle data-testid="practice-chart-title">Practice intensity by track</CardTitle>
            <CardDescription data-testid="practice-chart-copy">
              Logged minutes aggregated across visible programs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="chart-shell" data-testid="practice-chart-shell">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dashboard.practice_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d7deef" />
                  <XAxis dataKey="name" stroke="#53627f" />
                  <YAxis stroke="#53627f" />
                  <Tooltip cursor={{ fill: "rgba(79, 106, 244, 0.08)" }} />
                  <Bar dataKey="minutes" fill="#4f6af4" radius={[10, 10, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel chart-card" data-testid="assessment-chart-card">
          <CardHeader>
            <CardTitle data-testid="assessment-chart-title">Skill score snapshot</CardTitle>
            <CardDescription data-testid="assessment-chart-copy">
              Average scores by tracked skill or performance outcome.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="chart-shell" data-testid="assessment-chart-shell">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dashboard.assessment_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d7deef" />
                  <XAxis dataKey="name" stroke="#53627f" />
                  <YAxis stroke="#53627f" domain={[0, 100]} />
                  <Tooltip cursor={{ fill: "rgba(31, 164, 123, 0.08)" }} />
                  <Bar dataKey="score" fill="#1fa47b" radius={[10, 10, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel status-card" data-testid="service-status-card">
        <CardHeader>
          <CardTitle data-testid="service-status-title">Implementation modes</CardTitle>
          <CardDescription data-testid="service-status-copy">
            Secure placeholders are wired for Azure and SQL Server while local demo fallbacks remain available.
          </CardDescription>
        </CardHeader>
        <CardContent className="status-row-grid">
          <div className="status-pod" data-testid="service-status-database">
            <span>Database</span>
            <strong>{dashboard.service_status.database_mode}</strong>
          </div>
          <div className="status-pod" data-testid="service-status-summary">
            <span>AI summarizer</span>
            <strong>{dashboard.service_status.summary_mode}</strong>
          </div>
          <div className="status-pod" data-testid="service-status-storage">
            <span>File storage</span>
            <strong>{dashboard.service_status.storage_mode}</strong>
          </div>
          <div className="status-pod" data-testid="service-status-container">
            <span>Blob container</span>
            <strong>{dashboard.service_status.container}</strong>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderActivities = () => (
    <div className="stack-xl" data-testid="activities-panel">
      <SectionHeading
        eyebrow="Programs"
        title="Enroll students and shape distinct sports/music pathways"
        description="Activities power roster assignment, materials, assessments, and event planning."
        testId="activities-section-heading"
      />
      <div className="content-grid-two" data-testid="activities-content-grid">
        <Card className="glass-panel" data-testid="activities-table-card">
          <CardHeader>
            <CardTitle data-testid="activities-table-title">Current activity map</CardTitle>
            <CardDescription data-testid="activities-table-copy">Every enrolled program visible to this role.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table data-testid="activities-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Roster</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.activities.map((activity) => (
                  <TableRow key={activity.id} data-testid={`activity-row-${activity.id}`}>
                    <TableCell>
                      <div className="stack-xs">
                        <strong data-testid={`activity-title-${activity.id}`}>{activity.title}</strong>
                        <span className="table-subcopy">{activity.category}</span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`activity-track-${activity.id}`}>{activity.track}</TableCell>
                    <TableCell data-testid={`activity-coach-${activity.id}`}>{activity.coach_name}</TableCell>
                    <TableCell data-testid={`activity-schedule-${activity.id}`}>{activity.schedule}</TableCell>
                    <TableCell data-testid={`activity-roster-${activity.id}`}>{activity.enrollment_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-panel" data-testid="activity-actions-card">
          <CardHeader>
            <CardTitle data-testid="activity-actions-title">Program actions</CardTitle>
            <CardDescription data-testid="activity-actions-copy">
              {user.role === "student" || user.role === "parent"
                ? "Use enrollment to join or support a visible activity."
                : "Create and assign new activities with clear schedules and capacity."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.role === "admin" || user.role === "coach" ? (
              <form
                className="stack-md"
                data-testid="create-activity-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction("create-activity", async () => {
                    await axios.post(
                      `${API}/activities`,
                      {
                        ...activityForm,
                        capacity: Number(activityForm.capacity),
                        coach_id: activityForm.coach_id ? Number(activityForm.coach_id) : undefined,
                      },
                      apiConfig(token),
                    );
                    toast.success("Program created");
                    setActivityForm({
                      title: "",
                      category: activityForm.category,
                      track: "",
                      description: "",
                      schedule: "",
                      capacity: 24,
                      coach_id: activityForm.coach_id,
                    });
                  });
                }}
              >
                <Input
                  data-testid="activity-title-input"
                  placeholder="Basketball Fundamentals"
                  value={activityForm.title}
                  onChange={(event) => setActivityForm((state) => ({ ...state, title: event.target.value }))}
                />
                <div className="form-grid-two">
                  <Select
                    value={activityForm.category}
                    onValueChange={(value) => setActivityForm((state) => ({ ...state, category: value }))}
                  >
                    <SelectTrigger data-testid="activity-category-select">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    data-testid="activity-track-input"
                    placeholder="Track / Focus"
                    value={activityForm.track}
                    onChange={(event) => setActivityForm((state) => ({ ...state, track: event.target.value }))}
                  />
                </div>
                <Textarea
                  data-testid="activity-description-input"
                  placeholder="Program description"
                  value={activityForm.description}
                  onChange={(event) => setActivityForm((state) => ({ ...state, description: event.target.value }))}
                />
                <div className="form-grid-two">
                  <Input
                    data-testid="activity-schedule-input"
                    placeholder="Tue • Thu • 16:30"
                    value={activityForm.schedule}
                    onChange={(event) => setActivityForm((state) => ({ ...state, schedule: event.target.value }))}
                  />
                  <Input
                    data-testid="activity-capacity-input"
                    type="number"
                    value={activityForm.capacity}
                    onChange={(event) => setActivityForm((state) => ({ ...state, capacity: event.target.value }))}
                  />
                </div>
                {user.role === "admin" && (
                  <Select
                    value={activityForm.coach_id || dashboard.options.coaches[0]?.id?.toString() || ""}
                    onValueChange={(value) => setActivityForm((state) => ({ ...state, coach_id: value }))}
                  >
                    <SelectTrigger data-testid="activity-coach-select">
                      <SelectValue placeholder="Assign coach" />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboard.options.coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id.toString()}>
                          {coach.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="submit"
                  className="primary-cta"
                  data-testid="activity-create-button"
                  disabled={busyAction === "create-activity"}
                >
                  {busyAction === "create-activity" ? "Saving…" : "Create program"}
                </Button>
              </form>
            ) : (
              <form
                className="stack-md"
                data-testid="enrollment-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction("create-enrollment", async () => {
                    await axios.post(
                      `${API}/enrollments`,
                      {
                        activity_id: Number(enrollmentForm.activity_id),
                        student_id: enrollmentForm.student_id ? Number(enrollmentForm.student_id) : undefined,
                      },
                      apiConfig(token),
                    );
                    toast.success("Enrollment completed");
                  });
                }}
              >
                <Select
                  value={enrollmentForm.activity_id}
                  onValueChange={(value) => setEnrollmentForm((state) => ({ ...state, activity_id: value }))}
                >
                  <SelectTrigger data-testid="enrollment-activity-select">
                    <SelectValue placeholder="Choose a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboard.options.activities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id.toString()}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {user.role === "parent" && (
                  <Select
                    value={enrollmentForm.student_id}
                    onValueChange={(value) => setEnrollmentForm((state) => ({ ...state, student_id: value }))}
                  >
                    <SelectTrigger data-testid="enrollment-student-select">
                      <SelectValue placeholder="Choose student" />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboard.options.students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="submit"
                  className="primary-cta"
                  data-testid="enrollment-submit-button"
                  disabled={busyAction === "create-enrollment"}
                >
                  {busyAction === "create-enrollment" ? "Submitting…" : "Enroll now"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderRoster = () => (
    <div className="stack-xl" data-testid="roster-panel">
      <SectionHeading
        eyebrow="Roster management"
        title="See assignments, parent links, and captain / lead workflows"
        description="Coach and admin roles can set visible leadership responsibilities directly on enrollments."
        testId="roster-section-heading"
      />
      <div className="content-grid-two" data-testid="roster-content-grid">
        <Card className="glass-panel" data-testid="roster-table-card">
          <CardHeader>
            <CardTitle data-testid="roster-table-title">Visible roster</CardTitle>
            <CardDescription data-testid="roster-table-copy">Leadership tags appear next to enrolled programs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table data-testid="roster-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Programs</TableHead>
                  <TableHead>Lead roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.roster.map((row) => (
                  <TableRow key={row.student_id} data-testid={`roster-row-${row.student_id}`}>
                    <TableCell data-testid={`roster-student-${row.student_id}`}>{row.student_name}</TableCell>
                    <TableCell data-testid={`roster-parent-${row.student_id}`}>{row.parent_name}</TableCell>
                    <TableCell data-testid={`roster-programs-${row.student_id}`}>{row.activities.join(", ") || "—"}</TableCell>
                    <TableCell data-testid={`roster-leads-${row.student_id}`}>{row.lead_roles.join(", ") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-panel" data-testid="roster-lead-card">
          <CardHeader>
            <CardTitle data-testid="roster-lead-title">Assign captain / section lead</CardTitle>
            <CardDescription data-testid="roster-lead-copy">Select an enrollment and apply the leadership role.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="stack-md"
              data-testid="roster-lead-form"
              onSubmit={(event) => {
                event.preventDefault();
                runAction("set-lead", async () => {
                  await axios.post(
                    `${API}/roster/lead`,
                    {
                      enrollment_id: Number(leadForm.enrollment_id),
                      lead_role: leadForm.lead_role,
                    },
                    apiConfig(token),
                  );
                  toast.success("Lead role updated");
                });
              }}
            >
              <Select value={leadForm.enrollment_id} onValueChange={(value) => setLeadForm((state) => ({ ...state, enrollment_id: value }))}>
                <SelectTrigger data-testid="roster-enrollment-select">
                  <SelectValue placeholder="Choose enrollment" />
                </SelectTrigger>
                <SelectContent>
                  {dashboard.options.enrollments.map((enrollment) => (
                    <SelectItem key={enrollment.id} value={enrollment.id.toString()}>
                      {enrollment.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={leadForm.lead_role} onValueChange={(value) => setLeadForm((state) => ({ ...state, lead_role: value }))}>
                <SelectTrigger data-testid="roster-lead-role-select">
                  <SelectValue placeholder="Choose lead role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="captain">Captain</SelectItem>
                  <SelectItem value="section lead">Section lead</SelectItem>
                  <SelectItem value="performance anchor">Performance anchor</SelectItem>
                </SelectContent>
              </Select>
              <Button className="primary-cta" data-testid="roster-lead-submit-button" disabled={busyAction === "set-lead"}>
                {busyAction === "set-lead" ? "Saving…" : "Update lead role"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderMaterials = () => (
    <div className="stack-xl" data-testid="materials-panel">
      <SectionHeading
        eyebrow="Content management"
        title="Upload practice videos, plans, and YouTube references"
        description="Azure Blob is ready through one shared container with dedicated subfolders and a local fallback for demo mode."
        testId="materials-section-heading"
      />
      <div className="content-grid-two" data-testid="materials-content-grid">
        <Card className="glass-panel" data-testid="materials-library-card">
          <CardHeader>
            <CardTitle data-testid="materials-library-title">Content library</CardTitle>
            <CardDescription data-testid="materials-library-copy">Students can stream direct uploads or open embedded YouTube content.</CardDescription>
          </CardHeader>
          <CardContent className="stack-lg">
            {dashboard.materials.map((material) => (
              <div className="material-card" key={material.id} data-testid={`material-card-${material.id}`}>
                <div className="material-card-header">
                  <div>
                    <strong data-testid={`material-title-${material.id}`}>{material.title}</strong>
                    <p className="table-subcopy" data-testid={`material-activity-${material.id}`}>
                      {material.activity_title}
                    </p>
                  </div>
                  <Badge className={`hero-chip ${toneClassMap[material.material_type === "youtube" ? "purple" : material.material_type === "video-upload" ? "green" : "blue"]}`} data-testid={`material-type-${material.id}`}>
                    {material.material_type}
                  </Badge>
                </div>
                <p className="material-copy" data-testid={`material-description-${material.id}`}>{material.description || "No additional description"}</p>
                {material.youtube_url ? (
                  <iframe
                    title={material.title}
                    src={getEmbedUrl(material.youtube_url)}
                    className="video-frame"
                    data-testid={`material-embed-${material.id}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : material.download_url ? (
                  <video
                    controls
                    className="uploaded-video"
                    src={`${BACKEND_URL}${material.download_url}`}
                    data-testid={`material-video-${material.id}`}
                  />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        {(user.role === "admin" || user.role === "coach") && (
          <Card className="glass-panel" data-testid="materials-create-card">
            <CardHeader>
              <CardTitle data-testid="materials-create-title">Publish training material</CardTitle>
              <CardDescription data-testid="materials-create-copy">Choose file upload or YouTube link mode.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="stack-md"
                data-testid="materials-create-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction("create-material", async () => {
                    const formData = new FormData();
                    formData.append("activity_id", materialForm.activity_id);
                    formData.append("title", materialForm.title);
                    formData.append("material_type", materialForm.material_type);
                    formData.append("description", materialForm.description);
                    formData.append("youtube_url", materialForm.youtube_url);
                    if (selectedFile) formData.append("file", selectedFile);
                    await axios.post(`${API}/materials`, formData, apiConfig(token));
                    toast.success("Material published");
                    setMaterialForm((state) => ({ ...state, title: "", description: "", youtube_url: "" }));
                    setSelectedFile(null);
                  });
                }}
              >
                <Select value={materialForm.activity_id} onValueChange={(value) => setMaterialForm((state) => ({ ...state, activity_id: value }))}>
                  <SelectTrigger data-testid="material-activity-select">
                    <SelectValue placeholder="Choose activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboard.options.activities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id.toString()}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  data-testid="material-title-input"
                  placeholder="Title"
                  value={materialForm.title}
                  onChange={(event) => setMaterialForm((state) => ({ ...state, title: event.target.value }))}
                />
                <Select value={materialForm.material_type} onValueChange={(value) => setMaterialForm((state) => ({ ...state, material_type: value }))}>
                  <SelectTrigger data-testid="material-type-select">
                    <SelectValue placeholder="Material type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video-upload">Direct video upload</SelectItem>
                    <SelectItem value="youtube">YouTube embed</SelectItem>
                    <SelectItem value="lesson-plan">Lesson plan upload</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  data-testid="material-description-input"
                  placeholder="What should students focus on?"
                  value={materialForm.description}
                  onChange={(event) => setMaterialForm((state) => ({ ...state, description: event.target.value }))}
                />
                {materialForm.material_type === "youtube" ? (
                  <Input
                    data-testid="material-youtube-input"
                    placeholder="https://youtube.com/watch?v=..."
                    value={materialForm.youtube_url}
                    onChange={(event) => setMaterialForm((state) => ({ ...state, youtube_url: event.target.value }))}
                  />
                ) : (
                  <Input
                    data-testid="material-file-input"
                    type="file"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  />
                )}
                <Button className="primary-cta" data-testid="material-submit-button" disabled={busyAction === "create-material"}>
                  {busyAction === "create-material" ? "Uploading…" : "Publish material"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderPractice = () => (
    <div className="stack-xl" data-testid="practice-panel">
      <SectionHeading
        eyebrow="Daily practice"
        title="Log effort, mood, and notes that can feed parent summaries"
        description="Student submissions automatically generate a concise family-facing update when saved."
        testId="practice-section-heading"
      />
      <div className="content-grid-two" data-testid="practice-content-grid">
        <Card className="glass-panel" data-testid="practice-form-card">
          <CardHeader>
            <CardTitle data-testid="practice-form-title">Record today's session</CardTitle>
            <CardDescription data-testid="practice-form-copy">Visible on student and parent dashboards after submission.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="stack-md"
              data-testid="practice-form"
              onSubmit={(event) => {
                event.preventDefault();
                runAction("log-practice", async () => {
                  const response = await axios.post(
                    `${API}/practice-logs`,
                    {
                      ...practiceForm,
                      activity_id: Number(practiceForm.activity_id),
                      duration_minutes: Number(practiceForm.duration_minutes),
                    },
                    apiConfig(token),
                  );
                  toast.success("Practice logged");
                  setSummaryResult(response.data.summary || "");
                  setPracticeForm((state) => ({ ...state, notes: "" }));
                });
              }}
            >
              <Select value={practiceForm.activity_id} onValueChange={(value) => setPracticeForm((state) => ({ ...state, activity_id: value }))}>
                <SelectTrigger data-testid="practice-activity-select">
                  <SelectValue placeholder="Choose activity" />
                </SelectTrigger>
                <SelectContent>
                  {dashboard.options.activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id.toString()}>
                      {activity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="form-grid-two">
                <Input
                  data-testid="practice-duration-input"
                  type="number"
                  value={practiceForm.duration_minutes}
                  onChange={(event) => setPracticeForm((state) => ({ ...state, duration_minutes: event.target.value }))}
                />
                <Input
                  data-testid="practice-mood-input"
                  value={practiceForm.mood}
                  onChange={(event) => setPracticeForm((state) => ({ ...state, mood: event.target.value }))}
                />
              </div>
              <Textarea
                data-testid="practice-notes-input"
                placeholder="What went well? What needs work?"
                value={practiceForm.notes}
                onChange={(event) => setPracticeForm((state) => ({ ...state, notes: event.target.value }))}
              />
              <Button className="primary-cta" data-testid="practice-submit-button" disabled={busyAction === "log-practice"}>
                {busyAction === "log-practice" ? "Saving…" : "Save practice log"}
              </Button>
            </form>
            {summaryResult && (
              <div className="highlight-panel" data-testid="practice-summary-preview">
                <Sparkles size={18} />
                <p>{summaryResult}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel" data-testid="practice-log-card">
          <CardHeader>
            <CardTitle data-testid="practice-log-title">Recent practice log</CardTitle>
            <CardDescription data-testid="practice-log-copy">Shows the most recent student-facing notes and generated parent summary.</CardDescription>
          </CardHeader>
          <CardContent className="stack-md">
            {dashboard.practice_logs.slice(0, 3).map((log) => (
              <div className="timeline-card" key={log.id} data-testid={`practice-log-item-${log.id}`}>
                <div className="timeline-headline">
                  <strong>{log.activity_title}</strong>
                  <span>{formatDate(log.created_at)}</span>
                </div>
                <p data-testid={`practice-notes-${log.id}`}>{log.notes}</p>
                <div className="highlight-panel compact" data-testid={`practice-summary-${log.id}`}>
                  <Sparkles size={16} />
                  <p>{log.summary_text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSummaries = () => (
    <div className="stack-xl" data-testid="summaries-panel">
      <SectionHeading
        eyebrow="AI-assisted family updates"
        title="Create concise post-practice summaries for parents"
        description="Azure OpenAI credentials can be dropped into the env template later; local demo copy works now."
        testId="summaries-section-heading"
      />
      <div className="content-grid-two" data-testid="summaries-content-grid">
        {user.role === "coach" || user.role === "admin" ? (
          <Card className="glass-panel" data-testid="summary-generator-card">
            <CardHeader>
              <CardTitle data-testid="summary-generator-title">Generate a parent-ready recap</CardTitle>
              <CardDescription data-testid="summary-generator-copy">Use this after observing training, rehearsal, or a performance checkpoint.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="stack-md"
                data-testid="summary-generator-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction("generate-summary", async () => {
                    const response = await axios.post(
                      `${API}/ai/parent-summary`,
                      {
                        student_id: Number(summaryForm.student_id),
                        activity_id: Number(summaryForm.activity_id),
                        notes: summaryForm.notes,
                        achievements: summaryForm.achievements,
                        next_focus: summaryForm.next_focus,
                      },
                      apiConfig(token),
                    );
                    setSummaryResult(response.data.summary);
                    toast.success("Parent summary generated");
                  });
                }}
              >
                <div className="form-grid-two">
                  <Select value={summaryForm.student_id} onValueChange={(value) => setSummaryForm((state) => ({ ...state, student_id: value }))}>
                    <SelectTrigger data-testid="summary-student-select">
                      <SelectValue placeholder="Choose student" />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboard.options.students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={summaryForm.activity_id} onValueChange={(value) => setSummaryForm((state) => ({ ...state, activity_id: value }))}>
                    <SelectTrigger data-testid="summary-activity-select">
                      <SelectValue placeholder="Choose activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboard.options.activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id.toString()}>
                          {activity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  data-testid="summary-notes-input"
                  placeholder="Observed practice notes"
                  value={summaryForm.notes}
                  onChange={(event) => setSummaryForm((state) => ({ ...state, notes: event.target.value }))}
                />
                <Textarea
                  data-testid="summary-achievements-input"
                  placeholder="Big wins or improvements"
                  value={summaryForm.achievements}
                  onChange={(event) => setSummaryForm((state) => ({ ...state, achievements: event.target.value }))}
                />
                <Textarea
                  data-testid="summary-next-focus-input"
                  placeholder="Next focus"
                  value={summaryForm.next_focus}
                  onChange={(event) => setSummaryForm((state) => ({ ...state, next_focus: event.target.value }))}
                />
                <Button className="primary-cta" data-testid="summary-submit-button" disabled={busyAction === "generate-summary"}>
                  {busyAction === "generate-summary" ? "Generating…" : "Generate summary"}
                </Button>
              </form>
              {summaryResult && (
                <div className="highlight-panel" data-testid="generated-summary-output">
                  <Sparkles size={18} />
                  <p>{summaryResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card className="glass-panel" data-testid="summary-feed-card">
          <CardHeader>
            <CardTitle data-testid="summary-feed-title">Recent parent-visible updates</CardTitle>
            <CardDescription data-testid="summary-feed-copy">Summaries attached to practice logs and ready for follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="stack-md">
            {dashboard.practice_logs.map((log) => (
              <div className="timeline-card" key={log.id} data-testid={`summary-log-${log.id}`}>
                <div className="timeline-headline">
                  <strong>{log.student_name} • {log.activity_title}</strong>
                  <span>{formatDate(log.created_at)}</span>
                </div>
                <p className="table-subcopy">{log.notes}</p>
                <div className="highlight-panel compact" data-testid={`summary-text-${log.id}`}>
                  <Sparkles size={16} />
                  <p>{log.summary_text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAssessments = () => (
    <div className="stack-xl" data-testid="assessments-panel">
      <SectionHeading
        eyebrow="Assessment and progress"
        title="Score skill growth and build report-ready evidence"
        description="Coaches can capture skill cards that feed analytics and student portfolio visibility."
        testId="assessments-section-heading"
      />
      <div className="content-grid-two" data-testid="assessments-content-grid">
        <Card className="glass-panel" data-testid="assessment-form-card">
          <CardHeader>
            <CardTitle data-testid="assessment-form-title">Record a scorecard</CardTitle>
            <CardDescription data-testid="assessment-form-copy">Attach skill scores to a student and program.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="stack-md"
              data-testid="assessment-form"
              onSubmit={(event) => {
                event.preventDefault();
                runAction("create-assessment", async () => {
                  await axios.post(
                    `${API}/assessments`,
                    {
                      ...assessmentForm,
                      student_id: Number(assessmentForm.student_id),
                      activity_id: Number(assessmentForm.activity_id),
                      score: Number(assessmentForm.score),
                    },
                    apiConfig(token),
                  );
                  toast.success("Assessment saved");
                  setAssessmentForm((state) => ({ ...state, coach_notes: "" }));
                });
              }}
            >
              <div className="form-grid-two">
                <Select value={assessmentForm.student_id} onValueChange={(value) => setAssessmentForm((state) => ({ ...state, student_id: value }))}>
                  <SelectTrigger data-testid="assessment-student-select">
                    <SelectValue placeholder="Choose student" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboard.options.students.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={assessmentForm.activity_id} onValueChange={(value) => setAssessmentForm((state) => ({ ...state, activity_id: value }))}>
                  <SelectTrigger data-testid="assessment-activity-select">
                    <SelectValue placeholder="Choose activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboard.options.activities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id.toString()}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-grid-two">
                <Input
                  data-testid="assessment-skill-input"
                  placeholder="Skill label"
                  value={assessmentForm.skill_label}
                  onChange={(event) => setAssessmentForm((state) => ({ ...state, skill_label: event.target.value }))}
                />
                <Input
                  data-testid="assessment-score-input"
                  type="number"
                  max="100"
                  value={assessmentForm.score}
                  onChange={(event) => setAssessmentForm((state) => ({ ...state, score: event.target.value }))}
                />
              </div>
              <Textarea
                data-testid="assessment-notes-input"
                placeholder="Coach notes"
                value={assessmentForm.coach_notes}
                onChange={(event) => setAssessmentForm((state) => ({ ...state, coach_notes: event.target.value }))}
              />
              <Button className="primary-cta" data-testid="assessment-submit-button" disabled={busyAction === "create-assessment"}>
                {busyAction === "create-assessment" ? "Saving…" : "Save scorecard"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel" data-testid="assessment-table-card">
          <CardHeader>
            <CardTitle data-testid="assessment-table-title">Recent scorecards</CardTitle>
            <CardDescription data-testid="assessment-table-copy">Visible skills and notes for your scope.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table data-testid="assessment-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.assessments.map((assessment) => (
                  <TableRow key={assessment.id} data-testid={`assessment-row-${assessment.id}`}>
                    <TableCell>{assessment.student_name}</TableCell>
                    <TableCell>{assessment.activity_title}</TableCell>
                    <TableCell>{assessment.skill_label}</TableCell>
                    <TableCell>{assessment.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderEvents = () => (
    <div className="stack-xl" data-testid="events-panel">
      <SectionHeading
        eyebrow="Unified calendar"
        title="Track tournaments, concerts, rehearsals, and leadership assignments"
        description="One calendar serves both sports and music workflows across the school."
        testId="events-section-heading"
      />
      <div className="content-grid-two" data-testid="events-content-grid">
        <Card className="glass-panel" data-testid="events-calendar-card">
          <CardHeader>
            <CardTitle data-testid="events-calendar-title">Interactive event calendar</CardTitle>
            <CardDescription data-testid="events-calendar-copy">Select a date to filter the visible event list.</CardDescription>
          </CardHeader>
          <CardContent className="calendar-stack">
            <div className="calendar-shell" data-testid="events-calendar-shell">
              <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
            </div>
            <div className="stack-md" data-testid="events-day-list">
              <strong data-testid="events-selected-date">{formatDateOnly(selectedDate)}</strong>
              {filteredEvents.length ? (
                filteredEvents.map((event) => (
                  <div className="timeline-card" key={event.id} data-testid={`calendar-event-${event.id}`}>
                    <div className="timeline-headline">
                      <strong>{event.title}</strong>
                      <span>{event.event_type}</span>
                    </div>
                    <p>{event.activity_title} • {event.location}</p>
                  </div>
                ))
              ) : (
                <p className="table-subcopy" data-testid="events-day-empty">No events scheduled for the selected day.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel" data-testid="events-management-card">
          <CardHeader>
            <CardTitle data-testid="events-management-title">Event list and workflow</CardTitle>
            <CardDescription data-testid="events-management-copy">Create and review visibility across visible programs.</CardDescription>
          </CardHeader>
          <CardContent className="stack-lg">
            {(user.role === "admin" || user.role === "coach") && (
              <form
                className="stack-md"
                data-testid="event-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction("create-event", async () => {
                    await axios.post(
                      `${API}/events`,
                      {
                        ...eventForm,
                        activity_id: eventForm.activity_id ? Number(eventForm.activity_id) : null,
                        leader_student_id: eventForm.leader_student_id ? Number(eventForm.leader_student_id) : null,
                      },
                      apiConfig(token),
                    );
                    toast.success("Event created");
                    setEventForm((state) => ({ ...state, title: "", location: "", details: "" }));
                  });
                }}
              >
                <Input
                  data-testid="event-title-input"
                  placeholder="Event title"
                  value={eventForm.title}
                  onChange={(event) => setEventForm((state) => ({ ...state, title: event.target.value }))}
                />
                <div className="form-grid-two">
                  <Select value={eventForm.event_type} onValueChange={(value) => setEventForm((state) => ({ ...state, event_type: value }))}>
                    <SelectTrigger data-testid="event-type-select">
                      <SelectValue placeholder="Event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tournament">Tournament</SelectItem>
                      <SelectItem value="concert">Concert</SelectItem>
                      <SelectItem value="showcase">Showcase</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={eventForm.activity_id} onValueChange={(value) => setEventForm((state) => ({ ...state, activity_id: value }))}>
                    <SelectTrigger data-testid="event-activity-select">
                      <SelectValue placeholder="Choose activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboard.options.activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id.toString()}>
                          {activity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-grid-two">
                  <Input
                    data-testid="event-date-input"
                    type="datetime-local"
                    value={eventForm.event_date}
                    onChange={(event) => setEventForm((state) => ({ ...state, event_date: event.target.value }))}
                  />
                  <Input
                    data-testid="event-location-input"
                    placeholder="Location"
                    value={eventForm.location}
                    onChange={(event) => setEventForm((state) => ({ ...state, location: event.target.value }))}
                  />
                </div>
                <Textarea
                  data-testid="event-details-input"
                  placeholder="Logistics and expectations"
                  value={eventForm.details}
                  onChange={(event) => setEventForm((state) => ({ ...state, details: event.target.value }))}
                />
                <Select value={eventForm.leader_student_id} onValueChange={(value) => setEventForm((state) => ({ ...state, leader_student_id: value }))}>
                  <SelectTrigger data-testid="event-leader-select">
                    <SelectValue placeholder="Choose leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboard.options.students.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="primary-cta" data-testid="event-submit-button" disabled={busyAction === "create-event"}>
                  {busyAction === "create-event" ? "Saving…" : "Create event"}
                </Button>
              </form>
            )}

            <Table data-testid="events-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Leader</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.events.map((event) => (
                  <TableRow key={event.id} data-testid={`event-row-${event.id}`}>
                    <TableCell>
                      <div className="stack-xs">
                        <strong>{event.title}</strong>
                        <span className="table-subcopy">{event.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>{event.activity_title}</TableCell>
                    <TableCell>{formatDate(event.event_date)}</TableCell>
                    <TableCell>{event.leader_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPortfolio = () => (
    <div className="stack-xl" data-testid="portfolio-panel">
      <SectionHeading
        eyebrow="Achievements"
        title="Digital badges and downloadable PDF certificates"
        description="Portfolio content is designed for students, parents, coaches, and school administrators to review or share."
        testId="portfolio-section-heading"
      />
      <Tabs defaultValue="badges" className="stack-lg" data-testid="portfolio-tabs">
        <TabsList className="portfolio-tabs-list" data-testid="portfolio-tabs-list">
          <TabsTrigger value="badges" data-testid="portfolio-tab-badges">Badges</TabsTrigger>
          <TabsTrigger value="certificates" data-testid="portfolio-tab-certificates">Certificates</TabsTrigger>
        </TabsList>
        <TabsContent value="badges" data-testid="portfolio-badges-content">
          <div className="badge-grid" data-testid="badge-grid">
            {dashboard.badges.map((badge) => (
              <Card className="glass-panel badge-card" key={badge.id} data-testid={`badge-card-${badge.id}`}>
                <CardHeader>
                  <Badge className={`hero-chip ${toneClassMap[badge.tone] || toneClassMap.default}`} data-testid={`badge-tone-${badge.id}`}>
                    {badge.title}
                  </Badge>
                  <CardTitle data-testid={`badge-title-${badge.id}`}>{badge.student_name}</CardTitle>
                  <CardDescription data-testid={`badge-copy-${badge.id}`}>{badge.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="certificates" data-testid="portfolio-certificates-content">
          <div className="content-grid-two" data-testid="certificates-content-grid">
            {(user.role === "admin" || user.role === "coach") && (
              <Card className="glass-panel" data-testid="certificate-generate-card">
                <CardHeader>
                  <CardTitle data-testid="certificate-generate-title">Issue a new certificate</CardTitle>
                  <CardDescription data-testid="certificate-generate-copy">Auto-generates a PDF certificate with dynamic badges.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="stack-md"
                    data-testid="certificate-generate-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      runAction("generate-certificate", async () => {
                        const response = await axios.post(
                          `${API}/certificates/generate`,
                          {
                            student_id: Number(certificateForm.student_id),
                            activity_id: Number(certificateForm.activity_id),
                            title: certificateForm.title,
                            badge_label: certificateForm.badge_label,
                          },
                          apiConfig(token),
                        );
                        toast.success("Certificate generated");
                        if (response.data.download_url) {
                          openPdf(response.data.download_url);
                        }
                      });
                    }}
                  >
                    <div className="form-grid-two">
                      <Select value={certificateForm.student_id} onValueChange={(value) => setCertificateForm((state) => ({ ...state, student_id: value }))}>
                        <SelectTrigger data-testid="certificate-student-select">
                          <SelectValue placeholder="Choose student" />
                        </SelectTrigger>
                        <SelectContent>
                          {dashboard.options.students.map((student) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={certificateForm.activity_id} onValueChange={(value) => setCertificateForm((state) => ({ ...state, activity_id: value }))}>
                        <SelectTrigger data-testid="certificate-activity-select">
                          <SelectValue placeholder="Choose activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {dashboard.options.activities.map((activity) => (
                            <SelectItem key={activity.id} value={activity.id.toString()}>
                              {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      data-testid="certificate-title-input"
                      value={certificateForm.title}
                      onChange={(event) => setCertificateForm((state) => ({ ...state, title: event.target.value }))}
                    />
                    <Input
                      data-testid="certificate-badge-input"
                      value={certificateForm.badge_label}
                      onChange={(event) => setCertificateForm((state) => ({ ...state, badge_label: event.target.value }))}
                    />
                    <Button className="primary-cta" data-testid="certificate-submit-button" disabled={busyAction === "generate-certificate"}>
                      {busyAction === "generate-certificate" ? "Generating…" : "Generate certificate"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="glass-panel" data-testid="certificate-library-card">
              <CardHeader>
                <CardTitle data-testid="certificate-library-title">Certificate library</CardTitle>
                <CardDescription data-testid="certificate-library-copy">Download or open the latest PDF assets.</CardDescription>
              </CardHeader>
              <CardContent className="stack-md">
                {dashboard.certificates.map((certificate) => (
                  <div className="certificate-card" key={certificate.id} data-testid={`certificate-card-${certificate.id}`}>
                    <div>
                      <strong data-testid={`certificate-title-${certificate.id}`}>{certificate.title}</strong>
                      <p className="table-subcopy" data-testid={`certificate-student-${certificate.id}`}>
                        {certificate.student_name} • {certificate.activity_title}
                      </p>
                      <p className="table-subcopy" data-testid={`certificate-date-${certificate.id}`}>
                        {formatDateOnly(certificate.issued_at)} • {certificate.badge_label}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="action-ghost"
                      data-testid={`certificate-download-${certificate.id}`}
                      onClick={() => openPdf(certificate.download_url)}
                    >
                      <FileDown size={16} />
                      Download PDF
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderChildren = () => (
    <div className="stack-xl" data-testid="children-panel">
      <SectionHeading
        eyebrow="Children overview"
        title="Follow child focus areas, linked programs, and support opportunities"
        description="Parent accounts see only linked student information and portfolio updates."
        testId="children-section-heading"
      />
      <div className="content-grid-two" data-testid="children-content-grid">
        {dashboard.students.map((student) => (
          <Card className="glass-panel" key={student.id} data-testid={`child-card-${student.id}`}>
            <CardHeader>
              <CardTitle data-testid={`child-name-${student.id}`}>{student.name}</CardTitle>
              <CardDescription data-testid={`child-focus-${student.id}`}>{student.focus_area}</CardDescription>
            </CardHeader>
            <CardContent className="stack-sm">
              <div className="detail-row" data-testid={`child-programs-${student.id}`}>
                <span>Programs</span>
                <strong>{dashboard.roster.find((row) => row.student_id === student.id)?.activities.join(", ") || "—"}</strong>
              </div>
              <div className="detail-row" data-testid={`child-leads-${student.id}`}>
                <span>Lead roles</span>
                <strong>{dashboard.roster.find((row) => row.student_id === student.id)?.lead_roles.join(", ") || "—"}</strong>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="stack-xl" data-testid="analytics-panel">
      <SectionHeading
        eyebrow="Admin analytics"
        title="Operational visibility for attendance rhythm and activity momentum"
        description="A lightweight analytics layer turns practice and assessment entries into immediate school-level insight."
        testId="analytics-section-heading"
      />
      <div className="overview-grid" data-testid="analytics-grid">
        <Card className="glass-panel" data-testid="analytics-practice-card">
          <CardHeader>
            <CardTitle data-testid="analytics-practice-title">Practice history</CardTitle>
            <CardDescription data-testid="analytics-practice-copy">Most recent student practice entries.</CardDescription>
          </CardHeader>
          <CardContent className="stack-md">
            {dashboard.practice_logs.map((log) => (
              <div className="timeline-card" key={log.id} data-testid={`analytics-practice-${log.id}`}>
                <div className="timeline-headline">
                  <strong>{log.student_name}</strong>
                  <span>{log.duration_minutes} mins</span>
                </div>
                <p>{log.activity_title}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="glass-panel" data-testid="analytics-events-card">
          <CardHeader>
            <CardTitle data-testid="analytics-events-title">Event runway</CardTitle>
            <CardDescription data-testid="analytics-events-copy">Upcoming sports and music touchpoints.</CardDescription>
          </CardHeader>
          <CardContent className="stack-md">
            {dashboard.events.map((event) => (
              <div className="timeline-card" key={event.id} data-testid={`analytics-event-${event.id}`}>
                <div className="timeline-headline">
                  <strong>{event.title}</strong>
                  <span>{formatDateOnly(event.event_date)}</span>
                </div>
                <p>{event.activity_title} • {event.location}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "activities":
        return renderActivities();
      case "roster":
        return renderRoster();
      case "materials":
        return renderMaterials();
      case "practice":
        return renderPractice();
      case "summaries":
        return renderSummaries();
      case "assessments":
        return renderAssessments();
      case "events":
        return renderEvents();
      case "portfolio":
        return renderPortfolio();
      case "children":
        return renderChildren();
      case "analytics":
        return renderAnalytics();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="dashboard-shell" data-testid="dashboard-shell">
      <aside className="sidebar-panel glass-panel" data-testid="role-sidebar">
        <div className="sidebar-brand" data-testid="sidebar-brand">
          <div className="brand-icon-wrap">
            <RoleIcon size={20} />
          </div>
          <div>
            <p className="sidebar-brand-label">Talent Platform</p>
            <strong data-testid="sidebar-role-label">{roleLabel} dashboard</strong>
          </div>
        </div>

        <div className="sidebar-identity" data-testid="sidebar-identity">
          <strong data-testid="current-user-name">{user.name}</strong>
          <span data-testid="current-user-email">{user.email}</span>
          <p data-testid="current-user-focus">{dashboard.current_user.focus_area}</p>
        </div>

        <nav className="sidebar-nav" data-testid="sidebar-navigation">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                type="button"
                className={`sidebar-link ${activeSection === section.key ? "active" : ""}`}
                data-testid={`sidebar-link-${section.key}`}
                onClick={() => setActiveSection(section.key)}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer" data-testid="sidebar-footer">
          <Button
            variant="outline"
            className="action-ghost"
            data-testid="dashboard-refresh-button"
            onClick={fetchDashboard}
          >
            <RefreshCw size={16} />
            Refresh data
          </Button>
          <Button
            variant="outline"
            className="action-ghost"
            data-testid="dashboard-logout-button"
            onClick={() => {
              onLogout();
              navigate("/login");
            }}
          >
            <LogOut size={16} />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="main-stage" data-testid="dashboard-main-stage">
        <header className="topbar glass-panel" data-testid="dashboard-topbar">
          <div>
            <p className="section-eyebrow">{roleLabel} workspace</p>
            <h1 className="topbar-title" data-testid="topbar-title">
              School Sports & Music Talent Development Platform
            </h1>
            <p className="topbar-copy" data-testid="topbar-copy">
              {heroCopyByRole[user.role]}
            </p>
          </div>
          <div className="topbar-chip-row" data-testid="topbar-chip-row">
            <Badge className="hero-chip badge-tone-blue" data-testid="chip-summary-mode">
              {dashboard.service_status.summary_mode}
            </Badge>
            <Badge className="hero-chip badge-tone-green" data-testid="chip-storage-mode">
              {dashboard.service_status.storage_mode}
            </Badge>
            <Badge className="hero-chip badge-tone-purple" data-testid="chip-database-mode">
              {dashboard.service_status.database_mode}
            </Badge>
          </div>
        </header>

        {renderSection()}
      </main>
    </div>
  );
};

const ProtectedRoute = ({ token, user, onLogout }) => {
  if (!token || !user) return <Navigate to="/login" replace />;
  return <DashboardShell token={token} user={user} onLogout={onLogout} />;
};

const AppContainer = () => {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem(TOKEN_KEY, response.data.token);
    toast.success(`Signed in as ${response.data.user.role}`);
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${API}/auth/logout`, {}, apiConfig(token));
      }
    } catch {
      // ignore logout transport errors
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    toast.success("Signed out");
  };

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const response = await axios.get(`${API}/auth/me`, apiConfig(token));
        setUser(response.data);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    verifySession();
  }, [token]);

  if (checkingAuth) {
    return (
      <div className="loading-state" data-testid="auth-loading-state">
        <RefreshCw className="spin-icon" />
        <span>Preparing your workspace…</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={token && user ? <Navigate to="/app" replace /> : <LoginScreen onLogin={login} />} />
        <Route path="/app" element={<ProtectedRoute token={token} user={user} onLogout={logout} />} />
        <Route path="*" element={<Navigate to={token && user ? "/app" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return <AppContainer />;
}

export default App;
