// client/src/api/appointmentsApi.js
// Wrapper autour de l'API backend pour les RDV et notifications

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// ════════════════════════════════════════
// Helper: récupère le token JWT
// ════════════════════════════════════════
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper générique
const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur réseau" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
};

// ════════════════════════════════════════
// Configuration
// ════════════════════════════════════════
export const fetchMotifs = () => request("/appointments/motifs");

// ════════════════════════════════════════
// Disponibilités
// ════════════════════════════════════════
export const fetchMonthAvailability = (year, month) =>
  request(`/appointments/availability/month?year=${year}&month=${month}`);

export const fetchDayAvailability = (date) =>
  request(`/appointments/availability/day?date=${date}`);

// ════════════════════════════════════════
// Client - RDV
// ════════════════════════════════════════
export const requestAppointment = (data) =>
  request("/appointments/request", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const fetchMyAppointments = (status = null) => {
  const query = status ? `?status=${status}` : "";
  return request(`/appointments/my${query}`);
};

export const cancelAppointment = (appointmentId) =>
  request(`/appointments/${appointmentId}`, { method: "DELETE" });

export const acceptAlternative = (appointmentId) =>
  request(`/appointments/${appointmentId}/accept-alternative`, {
    method: "POST",
  });

// ════════════════════════════════════════
// Admin - RDV
// ════════════════════════════════════════
export const fetchPendingAppointments = () =>
  request("/admin/appointments/pending");

export const fetchAdminCalendar = (startDate, endDate) =>
  request(`/admin/appointments/calendar?start_date=${startDate}&end_date=${endDate}`);

export const fetchAppointmentsStats = () =>
  request("/admin/appointments/stats");

export const approveAppointment = (appointmentId) =>
  request(`/admin/appointments/${appointmentId}/approve`, { method: "POST" });

export const rejectAppointment = (appointmentId, reason) =>
  request(`/admin/appointments/${appointmentId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const proposeAlternative = (appointmentId, newDate, newStartTime, message = "") =>
  request(`/admin/appointments/${appointmentId}/propose-alternative`, {
    method: "POST",
    body: JSON.stringify({
      new_date: newDate,
      new_start_time: newStartTime,
      message,
    }),
  });

export const fetchAppointmentDetail = (appointmentId) =>
  request(`/admin/appointments/${appointmentId}`);

// ════════════════════════════════════════
// Notifications
// ════════════════════════════════════════
export const fetchNotifications = (onlyUnread = false, limit = 20) =>
  request(`/notifications?only_unread=${onlyUnread}&limit=${limit}`);

export const fetchUnreadCount = () =>
  request("/notifications/unread-count");

export const markNotificationRead = (notificationId) =>
  request(`/notifications/${notificationId}/read`, { method: "POST" });

export const markAllNotificationsRead = () =>
  request("/notifications/read-all", { method: "POST" });

export const deleteNotification = (notificationId) =>
  request(`/notifications/${notificationId}`, { method: "DELETE" });

// ════════════════════════════════════════
// Helpers d'affichage
// ════════════════════════════════════════
export const STATUS_LABELS = {
  pending: { label: "En attente", color: "amber", icon: "⏳" },
  confirmed: { label: "Confirmé", color: "green", icon: "✅" },
  rejected: { label: "Refusé", color: "red", icon: "❌" },
  cancelled: { label: "Annulé", color: "gray", icon: "🚫" },
  completed: { label: "Terminé", color: "blue", icon: "✓" },
  alternative_proposed: { label: "Nouveau créneau proposé", color: "orange", icon: "🔄" },
};

export const formatDateFR = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
