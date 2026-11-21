const API_BASE_URL = (location.hostname === "127.0.0.1" || location.hostname === "localhost")
    ? "http://localhost:3001/api"
    : "https://YOUR-RENDER-ADDRESS.onrender.com/api";

function saveSession(token, role, user) {
    sessionStorage.setItem("arms_token", token);
    sessionStorage.setItem("arms_role", role);
    sessionStorage.setItem("arms_user", JSON.stringify(user));
}

function getToken() {
    return sessionStorage.getItem("arms_token");
}

function getRole() {
    return sessionStorage.getItem("arms_role");
}

function getUser() {
    const raw = sessionStorage.getItem("arms_user");
    return raw ? JSON.parse(raw) : null;
}

function clearSession() {
    sessionStorage.removeItem("arms_token");
    sessionStorage.removeItem("arms_role");
    sessionStorage.removeItem("arms_user");
}

async function apiFetch(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    let data = null;
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) {
        const message = (data && data.message) ? data.message : `Request failed (${response.status})`;
        throw new Error(message);
    }
    return data;
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            clearSession();
            window.location.href = "login.html";
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupLogout();
});

function setupLoginPage() {
    const loginBtn = document.getElementById("loginBtn");
    if (!loginBtn) return;
    const errorEl = document.getElementById("loginError");
    loginBtn.addEventListener("click", async () => {
        const userType = document.getElementById("userType").value;
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        errorEl.style.display = "none";
        if (!email || !password) {
            errorEl.textContent = "Please enter both email and password.";
            errorEl.style.display = "block";
            return;
        }
        const routeMap = {
            student: { path: "/auth/student/login", redirect: "student-dashboard.html", userKey: "student" },
            supervisor: { path: "/auth/supervisor/login", redirect: "supervisor-dashboard.html", userKey: "supervisor" },
            admin: { path: "/auth/admin/login", redirect: "admin-dashboard.html", userKey: "admin" }
        };
        const route = routeMap[userType];
        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";
        try {
            const data = await apiFetch(route.path, { method: "POST", body: JSON.stringify({ email, password }) });
            saveSession(data.token, userType, data[route.userKey]);
            window.location.href = route.redirect;
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = "block";
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = "Login";
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupLoginPage();
});

function requireRole(expectedRole) {
    const token = getToken();
    const role = getRole();
    if (!token || role !== expectedRole) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

async function loadStudentDashboard() {
    const attachmentStatusEl = document.getElementById("attachmentStatus");
    if (!attachmentStatusEl) return;
    if (!requireRole("student")) return;
    const logbookCountEl = document.getElementById("logbookCount");
    const supervisorNameEl = document.getElementById("supervisorName");
    const evaluationStatusEl = document.getElementById("evaluationStatus");
    const recentActivitiesEl = document.getElementById("recentActivities");
    try {
        const attachment = await apiFetch("/attachment/my-attachment");
        attachmentStatusEl.textContent = attachment.status || "Pending";
        supervisorNameEl.textContent = attachment.academic_supervisor_id ? "Assigned" : "Not Assigned";
    } catch (err) {
        attachmentStatusEl.textContent = "Not Started";
        supervisorNameEl.textContent = "Not Assigned";
    }
    try {
        const entries = await apiFetch("/logbook/my-entries");
        logbookCountEl.textContent = entries.length;
        if (entries.length > 0) {
            recentActivitiesEl.innerHTML = "";
            entries.slice(0, 5).forEach((entry) => {
                const row = document.createElement("tr");
                row.innerHTML = `<td>${formatDate(entry.date_submitted)}</td><td>Week ${entry.week_number}: ${entry.activity}</td><td>${entry.approval_status}</td>`;
                recentActivitiesEl.appendChild(row);
            });
        }
    } catch (err) {
        logbookCountEl.textContent = "0";
    }
    try {
        const evaluation = await apiFetch("/students/my-evaluation");
        evaluationStatusEl.textContent = `Completed (${evaluation.overall_score}/10)`;
    } catch (err) {
        evaluationStatusEl.textContent = "Pending";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadStudentDashboard();
});

async function loadCurrentAttachment() {
    const details = document.getElementById("attachmentDetails");
    if (!details) return;
    const formSection = document.getElementById("attachmentFormSection");
    try {
        const a = await apiFetch("/attachment/my-attachment");
        const set = (id, value) => {
            document.getElementById(id).textContent = value || "Not provided";
        };
        set("caOrganization", a.organization_name);
        set("caType", a.organization_type);
        set("caDepartment", a.department);
        set("caLocation", [a.town, a.county].filter(Boolean).join(", "));
        set("caStart", formatDate(a.start_date));
        set("caEnd", formatDate(a.end_date));
        set("caSupervisor", a.supervisor_name);
        set("caSupervisorPhone", a.supervisor_phone);
        set("caSupervisorEmail", a.supervisor_email);
        set("caStatus", a.status);
        details.style.display = "grid";
        document.getElementById("noAttachmentText").style.display = "none";
        if (formSection) formSection.style.display = "none";
    } catch (err) {}
}

function setupAttachmentForm() {
    const form = document.getElementById("attachmentForm");
    if (!form) return;
    const messageEl = document.getElementById("attachmentMessage");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        messageEl.style.display = "none";
        const payload = {
            organization_name: document.getElementById("organizationName").value.trim(),
            organization_type: document.getElementById("organizationType").value || null,
            department: document.getElementById("department").value.trim() || null,
            county: document.getElementById("county").value.trim() || null,
            town: document.getElementById("location").value.trim() || null,
            supervisor_name: document.getElementById("supervisorName").value.trim() || null,
            supervisor_email: document.getElementById("supervisorEmail").value.trim() || null,
            supervisor_phone: document.getElementById("supervisorPhone").value.trim() || null,
            start_date: document.getElementById("startDate").value,
            end_date: document.getElementById("endDate").value
        };
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
        try {
            await apiFetch("/attachment", { method: "POST", body: JSON.stringify(payload) });
            messageEl.style.color = "#2e7d32";
            messageEl.textContent = "Attachment details saved successfully.";
            messageEl.style.display = "block";
            await loadCurrentAttachment();
        } catch (err) {
            messageEl.style.color = "#c0392b";
            messageEl.textContent = err.message;
            messageEl.style.display = "block";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Save Attachment Details";
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("attachmentForm")) {
        requireRole("student");
        loadCurrentAttachment();
        setupAttachmentForm();
    }
});

function renderLogbookRow(entry) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${formatDate(entry.date_submitted)}</td><td>Week ${entry.week_number}: ${entry.activity}</td><td>${entry.skills_gained || ""}</td><td>${entry.approval_status}</td><td>${entry.supervisor_comment || ""}</td>`;
    return row;
}

async function loadLogbookEntries() {
    const box = document.getElementById("logbookWeeks");
    if (!box) return;
    let entries = [];
    try {
        entries = await apiFetch("/logbook/my-entries");
    } catch (err) {}
    try {
        const attachment = await apiFetch("/attachment/my-attachment");
        renderLogbookWeeks(attachment, entries);
        const dateInput = document.getElementById("activityDate");
        if (dateInput) {
            const now = new Date();
            dateInput.min = String(attachment.start_date).slice(0, 10);
            dateInput.max = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        }
    } catch (err) {
        box.textContent = "Add your attachment details to see your logbook.";
    }
}

function setupLogbookForm() {
    const form = document.getElementById("logbookForm");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            activity: document.getElementById("activity").value.trim(),
            skills_gained: document.getElementById("skills").value.trim() || null,
            challenges: document.getElementById("challenges").value.trim() || null,
            date_submitted: document.getElementById("activityDate").value
        };
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        try {
            await apiFetch("/logbook", { method: "POST", body: JSON.stringify(payload) });
            form.reset();
            await loadLogbookEntries();
        } catch (err) {
            alert(err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Logbook Entry";
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("logbookForm")) {
        requireRole("student");
        loadLogbookEntries();
        setupLogbookForm();
    }
});

async function loadEvaluation() {
    const statusEl = document.getElementById("evaluationStatus");
    if (!statusEl) return;
    requireRole("student");
    try {
        const evaluation = await apiFetch("/students/my-evaluation");
        statusEl.textContent = "Evaluation Complete";
        document.getElementById("evaluationMessage").textContent = "Your supervisor has completed your evaluation.";
        document.getElementById("evaluationBadge").textContent = "Completed";
        document.getElementById("evaluationSupervisor").value = `${evaluation.supervisor_first_name} ${evaluation.supervisor_last_name}`;
        document.getElementById("evaluationDepartment").value = evaluation.supervisor_department || "N/A";
        document.getElementById("evaluationEmail").value = evaluation.supervisor_email;
        document.getElementById("evaluationDate").value = formatDate(evaluation.evaluation_date);
        document.getElementById("evaluationScore").textContent = evaluation.overall_score;
        document.getElementById("scoreMessage").textContent = `Technical: ${evaluation.technical_skills}/10 · Communication: ${evaluation.communication}/10 · Teamwork: ${evaluation.teamwork}/10 · Punctuality: ${evaluation.punctuality}/10`;
        document.getElementById("supervisorComments").textContent = evaluation.remarks || "No supervisor comments available yet.";
    } catch (err) {}
}

document.addEventListener("DOMContentLoaded", () => {
    loadEvaluation();
});

function timeAgo(dateStr) {
    const then = new Date(dateStr);
    const now = new Date();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 60) return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
    if (diffHours < 24) return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
}

function renderNotification(notification) {
    const div = document.createElement("div");
    div.className = "notification-item" + (notification.status === "Unread" ? " unread" : "");
    div.dataset.notificationId = notification.notification_id;
    div.innerHTML = `<div class="notification-content"><div class="notification-title-row"><h3>Notification</h3><span class="notification-time">${timeAgo(notification.created_at)}</span></div><p>${notification.message}</p></div>`;
    return div;
}

async function loadNotifications() {
    const listEl = document.getElementById("notificationList");
    if (!listEl) return;
    requireRole("student");
    const emptyEl = document.getElementById("emptyNotifications");
    try {
        const notifications = await apiFetch("/notifications/my-notifications");
        if (notifications.length === 0) {
            listEl.innerHTML = "";
            emptyEl.style.display = "block";
            return;
        }
        emptyEl.style.display = "none";
        listEl.innerHTML = "";
        notifications.forEach((n) => listEl.appendChild(renderNotification(n)));
    } catch (err) {
        listEl.innerHTML = "";
        emptyEl.style.display = "block";
    }
}

function setupMarkAllRead() {
    const btn = document.getElementById("markAllRead");
    if (!btn) return;
    btn.addEventListener("click", async () => {
        const unreadItems = document.querySelectorAll(".notification-item.unread");
        if (unreadItems.length === 0) {
            btn.textContent = "All Caught Up";
            setTimeout(() => { btn.textContent = "Mark All as Read"; }, 1500);
            return;
        }
        btn.disabled = true;
        btn.textContent = "Marking...";
        try {
            await Promise.all(Array.from(unreadItems).map((item) => apiFetch(`/notifications/${item.dataset.notificationId}/read`, { method: "PUT" })));
            await loadNotifications();
            btn.textContent = "Marked as Read";
            setTimeout(() => { btn.textContent = "Mark All as Read"; }, 1500);
        } catch (err) {
            alert(err.message);
            btn.textContent = "Mark All as Read";
        } finally {
            btn.disabled = false;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("notificationList") && getRole() === "student") {
        loadNotifications();
        setupMarkAllRead();
    }
});

async function loadReportSummary() {
    const nameEl = document.getElementById("reportStudentName");
    if (!nameEl) return;
    requireRole("student");
    try {
        const profile = await apiFetch("/students/profile");
        nameEl.textContent = `${profile.first_name} ${profile.last_name}`;
        document.getElementById("reportRegistration").textContent = profile.registration_number;
        document.getElementById("reportCourse").textContent = profile.course;
        document.getElementById("reportYear").textContent = `Year ${profile.year_of_study}`;
    } catch (err) {}
    try {
        const attachment = await apiFetch("/attachment/my-attachment");
        document.getElementById("reportOrganization").textContent = attachment.organization_name;
        document.getElementById("reportDepartment").textContent = attachment.department || "N/A";
        document.getElementById("reportStartDate").textContent = formatDate(attachment.start_date);
        document.getElementById("reportEndDate").textContent = formatDate(attachment.end_date);
        document.getElementById("reportAttachmentStatus").textContent = attachment.status;
    } catch (err) {}
    try {
        const entries = await apiFetch("/logbook/my-entries");
        document.getElementById("reportLogbookCount").textContent = entries.length;
    } catch (err) {
        document.getElementById("reportLogbookCount").textContent = "0";
    }
    try {
        const evaluation = await apiFetch("/students/my-evaluation");
        document.getElementById("reportEvaluationScore").textContent = `${evaluation.overall_score}/10`;
    } catch (err) {
        document.getElementById("reportEvaluationScore").textContent = "Not yet evaluated";
    }
    try {
        const reports = await apiFetch("/reports/my-reports");
        if (reports.length > 0) {
            const latest = reports[0];
            document.getElementById("reportStatus").textContent = `Generated (${formatDate(latest.generated_at)})`;
        }
    } catch (err) {}
}
function setupGenerateReport() {
    const btn = document.getElementById("generateReportBtn");
    if (!btn) return;
    const statusEl = document.getElementById("reportStatus");
    btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "Generating...";
        try {
            const result = await apiFetch("/reports/generate", { method: "POST" });
            statusEl.textContent = "Generated";
            showReport(result.report_name, result.content);
            await loadReportsList();
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Generate Report";
        }
    });
    const dl = document.getElementById("downloadReportBtn");
    if (dl) dl.addEventListener("click", downloadCurrentReport);
}
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("generateReportBtn")) {
        loadReportSummary();
        setupGenerateReport();
    }
});

async function loadSupervisorDashboard() {
    const tbody = document.getElementById("dashboardStudentsTable");
    if (!tbody) return;
    const nameEl = document.getElementById("supervisorGreetingName");
    if (!requireRole("supervisor")) return;
    const user = getUser();
    if (user) {
        nameEl.textContent = `${user.first_name} ${user.last_name}`;
        document.getElementById("supervisorWelcomeMessage").textContent = `Welcome, ${user.first_name} ${user.last_name}. Manage and monitor your assigned students.`;
    }
    try {
        const students = await apiFetch("/supervisors/my-students");
        document.getElementById("summaryStudentCount").textContent = students.length;
        if (students.length > 0) {
            tbody.innerHTML = "";
            students.forEach((s) => {
                const row = document.createElement("tr");
                row.innerHTML = `<td>${s.first_name} ${s.last_name}</td><td>${s.registration_number}</td><td>${s.course}</td><td>Year ${s.year_of_study}</td>`;
                tbody.appendChild(row);
            });
        }
        let totalLogbook = 0;
        let totalEvaluations = 0;
        for (const s of students) {
            try {
                const detail = await apiFetch(`/supervisors/students/${s.student_id}`);
                totalLogbook += detail.logbook_count;
                if (detail.evaluation) totalEvaluations += 1;
            } catch (err) {}
        }
        document.getElementById("summaryLogbookCount").textContent = totalLogbook;
        document.getElementById("summaryEvaluationCount").textContent = totalEvaluations;
        document.getElementById("summaryPendingCount").textContent = students.length - totalEvaluations;
    } catch (err) {
        document.getElementById("summaryStudentCount").textContent = "0";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadSupervisorDashboard();
});

function renderSupervisorNotification(notification) {
    const div = document.createElement("div");
    div.className = "notification-item" + (notification.status === "Unread" ? " unread" : "");
    div.dataset.notificationId = notification.notification_id;
    div.innerHTML = `<div class="notification-content"><div class="notification-title-row"><h3>Notification</h3><span class="notification-time">${timeAgo(notification.created_at)}</span></div><p>${notification.message}</p></div>`;
    return div;
}

async function loadSupervisorNotifications() {
    const listEl = document.getElementById("notificationList");
    if (!listEl) return;
    if (!requireRole("supervisor")) return;
    const emptyEl = document.getElementById("emptyNotifications");
    try {
        const notifications = await apiFetch("/notifications/supervisor/my-notifications");
        if (notifications.length === 0) {
            listEl.innerHTML = "";
            emptyEl.style.display = "block";
            return;
        }
        emptyEl.style.display = "none";
        listEl.innerHTML = "";
        notifications.forEach((n) => listEl.appendChild(renderSupervisorNotification(n)));
    } catch (err) {
        listEl.innerHTML = "";
        emptyEl.style.display = "block";
    }
}

function setupSupervisorMarkAllRead() {
    const btn = document.getElementById("markAllRead");
    if (!btn) return;
    btn.addEventListener("click", async () => {
        const unreadItems = document.querySelectorAll(".notification-item.unread");
        if (unreadItems.length === 0) {
            btn.textContent = "All Caught Up";
            setTimeout(() => { btn.textContent = "Mark All as Read"; }, 1500);
            return;
        }
        btn.disabled = true;
        btn.textContent = "Marking...";
        try {
            await Promise.all(Array.from(unreadItems).map((item) => apiFetch(`/notifications/supervisor/${item.dataset.notificationId}/read`, { method: "PUT" })));
            await loadSupervisorNotifications();
            btn.textContent = "Marked as Read";
            setTimeout(() => { btn.textContent = "Mark All as Read"; }, 1500);
        } catch (err) {
            alert(err.message);
            btn.textContent = "Mark All as Read";
        } finally {
            btn.disabled = false;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("notificationList") && getRole() === "supervisor") {
        const nameEl = document.getElementById("supervisorGreetingName");
        const user = getUser();
        if (nameEl && user) nameEl.textContent = `${user.first_name} ${user.last_name}`;
        loadSupervisorNotifications();
        setupSupervisorMarkAllRead();
    }
});

async function loadSupervisorStudentsPage() {
    const tbody = document.getElementById("studentsTableBody");
    if (!tbody) return;
    if (!requireRole("supervisor")) return;
    const nameEl = document.getElementById("supervisorGreetingName");
    const user = getUser();
    if (nameEl && user) nameEl.textContent = `${user.first_name} ${user.last_name}`;
    try {
        const students = await apiFetch("/supervisors/my-students");
        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">No students assigned yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = "";
        students.forEach((s) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${s.first_name} ${s.last_name}</td><td>${s.registration_number}</td><td>${s.course}</td><td>Year ${s.year_of_study}</td><td>${s.organization_name || "N/A"}</td><td>${s.status || "N/A"}</td><td><a href="student-profile.html?student=${s.student_id}">View</a></td>`;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7">Failed to load students.</td></tr>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadSupervisorStudentsPage();
});

async function loadStudentProfilePage() {
    const nameEl = document.getElementById("spName");
    if (!nameEl) return;
    if (!requireRole("supervisor")) return;
    const greetEl = document.getElementById("supervisorGreetingName");
    const user = getUser();
    if (greetEl && user) greetEl.textContent = `${user.first_name} ${user.last_name}`;
    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("student");
    if (!studentId) {
        nameEl.textContent = "No student specified";
        return;
    }
    try {
        const data = await apiFetch(`/supervisors/students/${studentId}`);
        const s = data.student;
        nameEl.textContent = `${s.first_name} ${s.last_name}`;
        document.getElementById("spRegistration").textContent = s.registration_number;
        document.getElementById("spEmail").textContent = s.email;
        document.getElementById("spPhone").textContent = s.phone_number || "N/A";
        document.getElementById("spCourse").textContent = s.course;
        document.getElementById("spYear").textContent = `Year ${s.year_of_study}`;
        document.getElementById("spOrganization").textContent = s.organization_name || "N/A";
        document.getElementById("spDepartment").textContent = s.department || "N/A";
        document.getElementById("spLocation").textContent = `${s.town || ""}, ${s.county || ""}`;
        document.getElementById("spStartDate").textContent = formatDate(s.start_date);
        document.getElementById("spEndDate").textContent = formatDate(s.end_date);
        document.getElementById("spStatus").textContent = s.status;
        document.getElementById("spLogbookCount").textContent = data.logbook_count;
        if (data.evaluation) {
            document.getElementById("spEvalScore").textContent = `${data.evaluation.overall_score}/10`;
        }
    } catch (err) {
        nameEl.textContent = "Failed to load student";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadStudentProfilePage();
});

let currentReviewLogId = null;

function renderLogbookTableRow(entry) {
    const row = document.createElement("tr");
    const actionCell = entry.approval_status === "Pending"
        ? `<button class="reset-btn review-btn" data-logid="${entry.log_id}" data-week="${entry.week_number}" data-student="${entry.first_name} ${entry.last_name}">Review</button>`
        : `<span style="color:#888;">Reviewed</span>`;
    row.innerHTML = `<td>${entry.first_name} ${entry.last_name}</td><td>${entry.week_number}</td><td>${entry.activity}</td><td>${formatDate(entry.date_submitted)}</td><td>${entry.approval_status}</td><td>${entry.supervisor_comment || ""}</td><td>${actionCell}</td>`;
    return row;
}

async function loadSupervisorLogbooks() {
    const tbody = document.getElementById("logbookTableBody");
    if (!tbody) return;
    if (!requireRole("supervisor")) return;
    const nameEl = document.getElementById("supervisorGreetingName");
    const user = getUser();
    if (nameEl && user) nameEl.textContent = `${user.first_name} ${user.last_name}`;
    try {
        const entries = await apiFetch("/supervisors/logbooks");
        if (entries.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">No logbook entries yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = "";
        entries.forEach((entry) => tbody.appendChild(renderLogbookTableRow(entry)));
        attachReviewButtonHandlers();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7">Failed to load entries.</td></tr>`;
    }
}

function attachReviewButtonHandlers() {
    document.querySelectorAll(".review-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            currentReviewLogId = btn.dataset.logid;
            document.getElementById("reviewEntryInfo").textContent = `Reviewing Week ${btn.dataset.week} entry for ${btn.dataset.student}`;
            document.getElementById("reviewFormSection").style.display = "block";
            window.scrollTo(0, document.body.scrollHeight);
        });
    });
}

function setupSupervisorReviewForm() {
    const form = document.getElementById("reviewForm");
    if (!form) return;
    const cancelBtn = document.getElementById("cancelReview");
    cancelBtn.addEventListener("click", () => {
        document.getElementById("reviewFormSection").style.display = "none";
        currentReviewLogId = null;
    });
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentReviewLogId) return;
        const comment = document.getElementById("reviewComment").value.trim();
        const status = document.getElementById("reviewStatus").value;
        try {
            await apiFetch(`/logbook/${currentReviewLogId}/review`, {
                method: "PUT",
                body: JSON.stringify({ supervisor_comment: comment || null, approval_status: status })
            });
            document.getElementById("reviewFormSection").style.display = "none";
            currentReviewLogId = null;
            await loadSupervisorLogbooks();
        } catch (err) {
            alert(err.message);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("logbookTableBody")) {
        loadSupervisorLogbooks();
        setupSupervisorReviewForm();
    }
});

async function loadEvaluationStudentOptions() {
    const select = document.getElementById("evalStudentSelect");
    if (!select) return;
    if (!requireRole("supervisor")) return;
    const nameEl = document.getElementById("supervisorGreetingName");
    const user = getUser();
    if (nameEl && user) nameEl.textContent = `${user.first_name} ${user.last_name}`;
    try {
        const students = await apiFetch("/supervisors/my-students");
        if (students.length === 0) {
            select.innerHTML = `<option value="">No students assigned</option>`;
            return;
        }
        select.innerHTML = `<option value="">Select a student</option>`;
        students.forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s.student_id;
            opt.textContent = `${s.first_name} ${s.last_name} (${s.registration_number})`;
            select.appendChild(opt);
        });
    } catch (err) {
        select.innerHTML = `<option value="">Failed to load students</option>`;
    }
}

function setupEvaluationForm() {
    const form = document.getElementById("evaluationForm");
    if (!form) return;
    const messageEl = document.getElementById("evalMessage");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        messageEl.style.display = "none";
        const studentId = document.getElementById("evalStudentSelect").value;
        if (!studentId) {
            messageEl.textContent = "Please select a student.";
            messageEl.style.display = "block";
            return;
        }
        const payload = {
            student_id: parseInt(studentId, 10),
            technical_skills: parseInt(document.getElementById("evalTechnical").value, 10),
            communication: parseInt(document.getElementById("evalCommunication").value, 10),
            teamwork: parseInt(document.getElementById("evalTeamwork").value, 10),
            punctuality: parseInt(document.getElementById("evalPunctuality").value, 10),
            remarks: document.getElementById("evalRemarks").value.trim() || null,
            evaluation_date: document.getElementById("evalDate").value
        };
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        try {
            await apiFetch("/supervisors/evaluations", { method: "POST", body: JSON.stringify(payload) });
            messageEl.style.color = "#2e7d32";
            messageEl.textContent = "Evaluation submitted successfully.";
            messageEl.style.display = "block";
            form.reset();
        } catch (err) {
            messageEl.style.color = "#c0392b";
            messageEl.textContent = err.message;
            messageEl.style.display = "block";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Evaluation";
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("evaluationForm")) {
        loadEvaluationStudentOptions();
        setupEvaluationForm();
    }
});

function setupSupervisorExportSummary() {
    const btn = document.getElementById("exportSummaryBtn");
    if (!btn) return;
    if (!requireRole("supervisor")) return;
    const nameEl = document.getElementById("supervisorGreetingName");
    const user = getUser();
    if (nameEl && user) nameEl.textContent = `${user.first_name} ${user.last_name}`;
    btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "Generating...";
        try {
            const students = await apiFetch("/supervisors/my-students");
            let content = `SUPERVISOR STUDENTS SUMMARY\nGenerated: ${new Date().toISOString()}\nSupervisor: ${user.first_name} ${user.last_name}\n========================================\n\n`;
            for (const s of students) {
                let detail = null;
                try {
                    detail = await apiFetch(`/supervisors/students/${s.student_id}`);
                } catch (err) {}
                content += `${s.first_name} ${s.last_name} (${s.registration_number})\n`;
                content += `Course: ${s.course}, Year ${s.year_of_study}\n`;
                content += `Organization: ${s.organization_name || "N/A"}\n`;
                content += `Status: ${s.status || "N/A"}\n`;
                if (detail) {
                    content += `Logbook Entries: ${detail.logbook_count}\n`;
                    content += `Evaluation: ${detail.evaluation ? detail.evaluation.overall_score + "/10" : "Not yet evaluated"}\n`;
                }
                content += `\n`;
            }
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `students_summary_${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            btn.textContent = "Exported";
            setTimeout(() => { btn.textContent = "Export Summary (.txt)"; }, 1500);
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupSupervisorExportSummary();
});

let currentReport = null;

function showReport(name, content) {
    currentReport = { name, content };
    document.getElementById("reportViewerTitle").textContent = name;
    document.getElementById("reportViewerContent").textContent = content;
    const section = document.getElementById("reportViewerSection");
    section.style.display = "block";
    section.scrollIntoView({ behavior: "smooth" });
}

function downloadCurrentReport() {
    if (!currentReport) return;
    const blob = new Blob([currentReport.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentReport.name;
    a.click();
    URL.revokeObjectURL(url);
}

async function loadReportsList() {
    const tbody = document.getElementById("reportsListBody");
    if (!tbody) return;
    try {
        const reports = await apiFetch("/reports/my-reports");
        if (reports.length === 0) return;
        tbody.innerHTML = "";
        reports.forEach((r) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${r.report_name}</td><td>${formatDate(r.generated_at)}</td><td><button class="reset-btn view-report-btn" data-id="${r.report_id}">View</button></td>`;
            tbody.appendChild(row);
        });
        document.querySelectorAll(".view-report-btn").forEach((b) => {
            b.addEventListener("click", async () => {
                try {
                    const data = await apiFetch(`/reports/${b.dataset.id}/content`);
                    showReport(data.report_name, data.content);
                } catch (err) {
                    alert(err.message);
                }
            });
        });
    } catch (err) {}
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("reportsListBody")) loadReportsList();
});

document.addEventListener("click", (e) => {
    const cell = e.target.closest("#logbookCalendar [data-date]");
    if (!cell) return;
    const input = document.getElementById("activityDate");
    if (!input) return;
    input.value = cell.dataset.date;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
});

const WEEK_WORDS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function escapeHtml(text) {
    return String(text == null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function weekHeading(weekIndex, first, last) {
    const part = (d) => `${ordinal(d.getUTCDate())} ${MONTH_NAMES[d.getUTCMonth()]}`;
    let range;
    if (first.getTime() === last.getTime()) {
        range = `${part(first)} ${first.getUTCFullYear()}`;
    } else if (first.getUTCFullYear() !== last.getUTCFullYear()) {
        range = `${part(first)} ${first.getUTCFullYear()} to ${part(last)} ${last.getUTCFullYear()}`;
    } else if (first.getUTCMonth() !== last.getUTCMonth()) {
        range = `${part(first)} to ${part(last)} ${last.getUTCFullYear()}`;
    } else {
        range = `${ordinal(first.getUTCDate())} to ${part(last)} ${last.getUTCFullYear()}`;
    }
    return `WEEK ${WEEK_WORDS[weekIndex]} (${range})`;
}

const openLogbookWeeks = new Set();

function renderLogbookWeeks(attachment, entries) {
    const box = document.getElementById("logbookWeeks");
    if (!box) return;
    const DAY = 86400000;
    const byDate = {};
    entries.forEach((e) => { byDate[String(e.date_submitted).slice(0, 10)] = e; });
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const start = new Date(String(attachment.start_date).slice(0, 10) + "T00:00:00Z");
    const firstMonday = new Date(start.getTime() - ((start.getUTCDay() + 6) % 7) * DAY);
    const supervisor = attachment.supervisor_name ? escapeHtml(attachment.supervisor_name) : "______________________";
    let html = "";
    for (let w = 0; w < 12; w++) {
        const monday = new Date(firstMonday.getTime() + w * 7 * DAY);
        const days = [];
        for (let d = 0; d < 5; d++) {
            const day = new Date(monday.getTime() + d * DAY);
            if (day >= start) days.push(day);
        }
        if (days.length === 0) continue;
        let rows = "";
        let written = 0;
        days.forEach((day) => {
            const key = day.toISOString().slice(0, 10);
            const entry = byDate[key];
            const dayName = DAY_NAMES[(day.getUTCDay() + 6) % 7];
            const dateLabel = `${ordinal(day.getUTCDate())} ${MONTH_NAMES[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
            let activity = "";
            let status = "Upcoming";
            let comment = "";
            if (entry) {
                written++;
                activity = escapeHtml(entry.activity);
                status = escapeHtml(entry.approval_status);
                comment = escapeHtml(entry.supervisor_comment || "");
            } else if (key <= todayKey) {
                activity = `<button type="button" class="reset-btn add-entry-btn" data-date="${key}">Add entry</button>`;
                status = "Not submitted";
            }
            rows += `<tr><td><strong>${dayName}</strong><br>${dateLabel}</td><td>${activity}</td><td>${status}</td><td>${comment}</td></tr>`;
        });
        const isOpen = openLogbookWeeks.has(w);
        html += `<button type="button" class="week-toggle" data-week="${w}" aria-expanded="${isOpen}"><span>${weekHeading(w, days[0], days[days.length - 1])}</span><span><span class="week-toggle-meta">${written} of ${days.length} days written</span><span class="week-toggle-state">${isOpen ? "Hide" : "Show"}</span></span></button>`;
        html += `<div class="week-panel" id="week-panel-${w}" style="display:${isOpen ? "block" : "none"};">`;
        if (w === 0) {
            html += `<p><strong>Attachment Supervisor's Name:</strong> ${supervisor}</p>`;
        }
        html += `<div class="table-container"><table><thead><tr><th>Day and Date</th><th>Activities</th><th>Status</th><th>Supervisor's Comments</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    box.innerHTML = html;
}
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-entry-btn");
    if (!btn) return;
    const input = document.getElementById("activityDate");
    if (!input) return;
    input.value = btn.dataset.date;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("activity").focus();
});

document.addEventListener("click", (e) => {
    const toggle = e.target.closest(".week-toggle");
    if (!toggle) return;
    const w = Number(toggle.dataset.week);
    if (openLogbookWeeks.has(w)) {
        openLogbookWeeks.delete(w);
    } else {
        openLogbookWeeks.add(w);
    }
    const open = openLogbookWeeks.has(w);
    document.getElementById(`week-panel-${w}`).style.display = open ? "block" : "none";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".week-toggle-state").textContent = open ? "Hide" : "Show";
});
function setupRegisterPage() {
    const form = document.getElementById("registerForm");
    if (!form) return;
    const msg = document.getElementById("registerError");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const show = (text, ok) => {
            msg.style.color = ok ? "#2e7d32" : "#c0392b";
            msg.textContent = text;
            msg.style.display = "block";
        };
        const password = document.getElementById("password").value;
        if (password.length < 6) return show("Password must be at least 6 characters.", false);
        if (password !== document.getElementById("confirmPassword").value) return show("The two passwords do not match.", false);
        const payload = {
            registration_number: document.getElementById("registrationNumber").value.trim(),
            first_name: document.getElementById("firstName").value.trim(),
            last_name: document.getElementById("lastName").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone_number: document.getElementById("phoneNumber").value.trim(),
            course: document.getElementById("course").value.trim(),
            year_of_study: parseInt(document.getElementById("yearOfStudy").value, 10),
            password
        };
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = "Creating...";
        try {
            await apiFetch("/students/register", { method: "POST", body: JSON.stringify(payload) });
            show("Account created. Taking you to the login page.", true);
            setTimeout(() => { window.location.href = "login.html"; }, 1500);
        } catch (err) {
            show(err.message, false);
            btn.disabled = false;
            btn.textContent = "Create Account";
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupRegisterPage();
});

async function loadProfilePage() {
    const form = document.getElementById("profileForm");
    if (!form) return;
    if (!requireRole("student")) return;
    const msg = document.getElementById("profileMessage");
    const show = (text, ok) => {
        msg.style.color = ok ? "#2e7d32" : "#c0392b";
        msg.textContent = text;
        msg.style.display = "block";
    };
    try {
        const p = await apiFetch("/students/profile");
        document.getElementById("profileName").textContent = `${p.first_name} ${p.last_name}`;
        document.getElementById("profileRegistration").textContent = p.registration_number;
        document.getElementById("registrationNumber").value = p.registration_number;
        document.getElementById("firstName").value = p.first_name;
        document.getElementById("lastName").value = p.last_name;
        document.getElementById("email").value = p.email;
        document.getElementById("phoneNumber").value = p.phone_number || "";
        document.getElementById("course").value = p.course;
        document.getElementById("yearOfStudy").value = String(p.year_of_study);
    } catch (err) {
        show(err.message, false);
    }
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            first_name: document.getElementById("firstName").value.trim(),
            last_name: document.getElementById("lastName").value.trim(),
            phone_number: document.getElementById("phoneNumber").value.trim() || null,
            course: document.getElementById("course").value.trim(),
            year_of_study: parseInt(document.getElementById("yearOfStudy").value, 10)
        };
        try {
            await apiFetch("/students/profile", { method: "PUT", body: JSON.stringify(payload) });
            document.getElementById("profileName").textContent = `${payload.first_name} ${payload.last_name}`;
            show("Profile updated.", true);
        } catch (err) {
            show(err.message, false);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadProfilePage();
});

let adminSupervisors = [];

function showAdminMessage(text, ok) {
    const el = document.getElementById("adminMessage");
    if (!el) return;
    el.style.color = ok ? "#2e7d32" : "#c0392b";
    el.textContent = text;
    el.style.display = "block";
}

function renderAdminStudents(students) {
    const body = document.getElementById("adminStudentsBody");
    if (students.length === 0) {
        body.innerHTML = `<tr><td colspan="6">No students registered yet.</td></tr>`;
        return;
    }
    body.innerHTML = "";
    students.forEach((s) => {
        const current = s.supervisor_first_name
            ? `${s.supervisor_first_name} ${s.supervisor_last_name}`
            : "Not assigned";
        let assignCell = "No attachment yet";
        if (s.attachment_id) {
            const options = adminSupervisors.map((sv) =>
                `<option value="${sv.supervisor_id}"${sv.supervisor_id === s.academic_supervisor_id ? " selected" : ""}>${escapeHtml(sv.first_name)} ${escapeHtml(sv.last_name)}</option>`
            ).join("");
            assignCell = `<select id="assign-${s.student_id}"><option value="">Choose supervisor</option>${options}</select> <button type="button" class="reset-btn admin-assign-btn" data-student="${s.student_id}">Assign</button>`;
        }
        const row = document.createElement("tr");
        row.innerHTML = `<td>${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</td><td>${escapeHtml(s.registration_number)}</td><td>${escapeHtml(s.organization_name || "None")}</td><td>${escapeHtml(current)}</td><td>${assignCell}</td><td><button type="button" class="reset-btn admin-delete-student" data-student="${s.student_id}" data-name="${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}">Delete</button></td>`;
        body.appendChild(row);
    });
}

function renderAdminSupervisors(supervisors) {
    const body = document.getElementById("adminSupervisorsBody");
    if (supervisors.length === 0) {
        body.innerHTML = `<tr><td colspan="4">No supervisors yet.</td></tr>`;
        return;
    }
    body.innerHTML = "";
    supervisors.forEach((sv) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${escapeHtml(sv.first_name)} ${escapeHtml(sv.last_name)}</td><td>${escapeHtml(sv.email)}</td><td>${escapeHtml(sv.department || "")}</td><td><button type="button" class="reset-btn admin-delete-supervisor" data-supervisor="${sv.supervisor_id}" data-name="${escapeHtml(sv.first_name)} ${escapeHtml(sv.last_name)}">Delete</button></td>`;
        body.appendChild(row);
    });
}

async function loadAdminData() {
    try {
        const students = await apiFetch("/admin/students");
        adminSupervisors = await apiFetch("/admin/supervisors");
        renderAdminStudents(students);
        renderAdminSupervisors(adminSupervisors);
    } catch (err) {
        showAdminMessage(err.message, false);
    }
}

document.addEventListener("click", async (e) => {
    const assign = e.target.closest(".admin-assign-btn");
    const delStudent = e.target.closest(".admin-delete-student");
    const delSupervisor = e.target.closest(".admin-delete-supervisor");
    try {
        if (assign) {
            const studentId = Number(assign.dataset.student);
            const supervisorId = Number(document.getElementById(`assign-${studentId}`).value);
            if (!supervisorId) return showAdminMessage("Choose a supervisor first.", false);
            await apiFetch("/admin/assign-supervisor", { method: "POST", body: JSON.stringify({ student_id: studentId, supervisor_id: supervisorId }) });
            showAdminMessage("Supervisor assigned.", true);
            await loadAdminData();
        } else if (delStudent) {
            if (!confirm(`Delete ${delStudent.dataset.name} and all their records? This cannot be undone.`)) return;
            await apiFetch(`/admin/students/${delStudent.dataset.student}`, { method: "DELETE" });
            showAdminMessage("Student deleted.", true);
            await loadAdminData();
        } else if (delSupervisor) {
            if (!confirm(`Delete supervisor ${delSupervisor.dataset.name}? Their students will become unassigned.`)) return;
            await apiFetch(`/admin/supervisors/${delSupervisor.dataset.supervisor}`, { method: "DELETE" });
            showAdminMessage("Supervisor deleted.", true);
            await loadAdminData();
        }
    } catch (err) {
        showAdminMessage(err.message, false);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("adminStudentsBody")) return;
    if (!requireRole("admin")) return;
    const user = getUser();
    if (user) document.getElementById("adminGreetingName").textContent = user.full_name;
    loadAdminData();
    document.getElementById("addSupervisorForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = document.getElementById("svPassword").value;
        if (password.length < 6) return showAdminMessage("The temporary password must be at least 6 characters.", false);
        try {
            await apiFetch("/supervisors/register", {
                method: "POST",
                body: JSON.stringify({
                    first_name: document.getElementById("svFirstName").value.trim(),
                    last_name: document.getElementById("svLastName").value.trim(),
                    email: document.getElementById("svEmail").value.trim(),
                    phone_number: document.getElementById("svPhone").value.trim(),
                    department: document.getElementById("svDepartment").value.trim(),
                    password
                })
            });
            e.target.reset();
            showAdminMessage("Supervisor added.", true);
            await loadAdminData();
        } catch (err) {
            showAdminMessage(err.message, false);
        }
    });
});