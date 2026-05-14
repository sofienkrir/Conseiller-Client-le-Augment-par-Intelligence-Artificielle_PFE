import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  fetchMotifs,
  fetchMonthAvailability,
  fetchDayAvailability,
  requestAppointment,
} from "../api/appointmentsApi";

const C = {
  red: "#CC0000",
  redDark: "#A00000",
  orange: "#E8521A",
  gold: "#B8964A",
  white: "#FFFFFF",
  offWhite: "#F8F7F5",
  bg: "#F4F6FA",
  charcoal: "#1A1A1A",
  darkGray: "#3D3D3D",
  midGray: "#757575",
  lightGray: "#E8E4DF",
  borderGray: "#D8D4CE",
  success: "#16A34A",
  warning: "#F59E0B",
  dangerLight: "#FFF5F5",
};

const monthNames = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken")
  );
}

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(currentMonth, monthAvailability) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const firstWeekDay = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthDays = Array.isArray(monthAvailability?.days)
    ? monthAvailability.days
    : [];

  const cells = [];

  for (let i = 0; i < firstWeekDay; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const dateKey = formatDateLocal(date);

    const availability = monthDays.find((item) => item.date === dateKey);

    const isPast = date < today;
    const isSunday = date.getDay() === 0;

    // Si le backend donne available, on l'utilise.
    // Sinon, on rend disponibles les dates futures sauf dimanche.
    const backendAvailable =
      typeof availability?.available === "boolean"
        ? availability.available
        : undefined;

    const fallbackAvailable = !isPast && !isSunday;

    const isAvailable =
      backendAvailable !== undefined ? backendAvailable : fallbackAvailable;

    const slotsCount =
      availability?.slots_count ??
      availability?.available_slots ??
      availability?.slots?.length ??
      (isAvailable ? 12 : 0);

    cells.push({
      day,
      date,
      dateKey,
      available: isAvailable,
      slots_count: slotsCount,
      status: availability?.status || (isAvailable ? "available" : "unavailable"),
    });
  }

  return cells;
}

export default function PrendreRDV() {
  const [motifs, setMotifs] = useState([]);
  const [selectedMotif, setSelectedMotif] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [monthAvailability, setMonthAvailability] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [daySlots, setDaySlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [notes, setNotes] = useState("");
  const [loadingMotifs, setLoadingMotifs] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth, monthAvailability),
    [currentMonth, monthAvailability]
  );

  useEffect(() => {
    async function loadMotifs() {
      try {
        setLoadingMotifs(true);
        setError("");
        const data = await fetchMotifs();
        setMotifs(data.motifs || []);
      } catch (err) {
        setError("Impossible de charger les motifs de rendez-vous.");
      } finally {
        setLoadingMotifs(false);
      }
    }

    loadMotifs();
  }, []);

  useEffect(() => {
    async function loadMonthAvailability() {
      if (!selectedMotif) return;

      try {
        setLoadingMonth(true);
        setError("");

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;

        const data = await fetchMonthAvailability(year, month, selectedMotif.id);
        setMonthAvailability(data);
      } catch (err) {
        setError("Impossible de charger les disponibilités du mois.");
      } finally {
        setLoadingMonth(false);
      }
    }

    loadMonthAvailability();
  }, [currentMonth, selectedMotif]);

  async function handleSelectDate(day) {
    if (!day || !day.available) return;

    try {
      setSelectedDate(day.dateKey);
      setSelectedSlot(null);
      setDaySlots([]);
      setLoadingDay(true);
      setError("");

      const data = await fetchDayAvailability(day.dateKey, selectedMotif?.id);
      setDaySlots(data.slots || []);
    } catch (err) {
      setError("Impossible de charger les créneaux de cette date.");
    } finally {
      setLoadingDay(false);
    }
  }

  async function handleSubmit() {
    if (!selectedMotif || !selectedDate || !selectedSlot) {
      setError("Choisissez un motif, une date et un créneau avant de confirmer.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const token = getToken();

      const payload = {
        motif_id: selectedMotif.id,
        date: selectedDate,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        notes_client: notes,
      };

      const data = await requestAppointment(payload, token);

      setSuccess({
        reference: data.appointment_id || data.id || "RDV créé",
        motif: selectedMotif.label,
        date: selectedDate,
        start: selectedSlot.start,
        end: selectedSlot.end,
      });

      setNotes("");
    } catch (err) {
      setError(
        err?.message ||
          "Impossible de confirmer le rendez-vous. Vérifiez le serveur backend."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function previousMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
    setSelectedDate(null);
    setSelectedSlot(null);
    setDaySlots([]);
  }

  function nextMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
    setSelectedDate(null);
    setSelectedSlot(null);
    setDaySlots([]);
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>
            <Check size={42} />
          </div>

          <h1 style={styles.successTitle}>Demande de rendez-vous envoyée</h1>

          <p style={styles.successText}>
            Votre demande a été enregistrée avec succès. Elle est maintenant en
            attente de validation.
          </p>

          <div style={styles.summaryBox}>
            <p>
              <strong>Motif :</strong> {success.motif}
            </p>
            <p>
              <strong>Date :</strong> {success.date}
            </p>
            <p>
              <strong>Créneau :</strong> {success.start} - {success.end}
            </p>
            <p>
              <strong>Statut :</strong> En attente
            </p>
          </div>

          <div style={styles.successActions}>
            <button
              type="button"
              onClick={() => navigateTo("/my-appointments")}
              style={styles.primaryButton}
            >
              Voir mes rendez-vous
            </button>

            <button
              type="button"
              onClick={() => {
                setSuccess(null);
                setSelectedMotif(null);
                setSelectedDate(null);
                setSelectedSlot(null);
                setDaySlots([]);
              }}
              style={styles.secondaryButton}
            >
              Nouveau RDV
            </button>

            <button
              type="button"
              onClick={() => navigateTo("/chat")}
              style={styles.ghostButton}
            >
              Retour au chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button
          type="button"
          onClick={() => navigateTo("/chat")}
          style={styles.backButton}
        >
          <ArrowLeft size={18} />
          Retour au chat
        </button>

        <section style={styles.hero}>
          <div style={styles.heroIcon}>
            <Calendar size={34} />
          </div>

          <div>
            <h1 style={styles.heroTitle}>Prendre un Rendez-vous</h1>
            <p style={styles.heroSubtitle}>
              Réservez un créneau avec un conseiller Attijari Bank
            </p>
          </div>
        </section>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div style={styles.stepBadge}>1</div>
            <h2 style={styles.sectionTitle}>Quel est l'objet de votre RDV ?</h2>
          </div>

          {loadingMotifs ? (
            <div style={styles.loadingRow}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Chargement des motifs...
            </div>
          ) : (
            <div style={styles.motifsGrid}>
              {motifs.map((motif) => {
                const active = selectedMotif?.id === motif.id;

                return (
                  <button
                    key={motif.id}
                    type="button"
                    onClick={() => {
                      setSelectedMotif(motif);
                      setSelectedDate(null);
                      setSelectedSlot(null);
                      setDaySlots([]);
                      setSuccess(null);
                    }}
                    style={{
                      ...styles.motifButton,
                      ...(active ? styles.motifButtonActive : {}),
                    }}
                  >
                    <span style={styles.motifIcon}>{motif.icon}</span>
                    <span style={styles.motifLabel}>{motif.label}</span>
                    {active && (
                      <span style={styles.checkBadge}>
                        <Check size={15} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedMotif && (
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div style={styles.stepBadge}>2</div>
              <h2 style={styles.sectionTitle}>Choisissez une date</h2>
            </div>

            <div style={styles.monthHeader}>
              <button type="button" onClick={previousMonth} style={styles.monthButton}>
                <ChevronLeft size={18} />
              </button>

              <div style={styles.monthTitle}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>

              <button type="button" onClick={nextMonth} style={styles.monthButton}>
                <ChevronRight size={18} />
              </button>
            </div>

            {loadingMonth ? (
              <div style={styles.loadingRow}>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Chargement du calendrier...
              </div>
            ) : (
              <>
                <div style={styles.calendarGrid}>
                  {dayLabels.map((day) => (
                    <div key={day} style={styles.dayLabel}>
                      {day}
                    </div>
                  ))}

                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} style={styles.emptyDay} />;
                    }

                    const selected = selectedDate === day.dateKey;

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        disabled={!day.available}
                        onClick={() => handleSelectDate(day)}
                        style={{
                          ...styles.dayButton,
                          ...(day.available ? styles.dayAvailable : styles.dayDisabled),
                          ...(selected ? styles.daySelected : {}),
                        }}
                      >
                        <span style={styles.dayNumber}>{day.day}</span>

                        {day.available && (
                          <span style={styles.slotCount}>
                            {day.slots_count} libres
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div style={styles.legend}>
                  <span>
                    <i style={{ ...styles.legendDot, background: C.success }} /> Disponible
                  </span>
                  <span>
                    <i style={{ ...styles.legendDot, background: C.warning }} /> Peu de créneaux
                  </span>
                  <span>
                    <i style={{ ...styles.legendDot, background: "#CBD5E1" }} /> Indisponible
                  </span>
                </div>
              </>
            )}
          </section>
        )}

        {selectedDate && (
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div style={styles.stepBadge}>3</div>
              <h2 style={styles.sectionTitle}>Choisissez un créneau</h2>
            </div>

            {loadingDay ? (
              <div style={styles.loadingRow}>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Chargement des créneaux...
              </div>
            ) : (
              <div style={styles.slotsGrid}>
                {daySlots.map((slot) => {
                  const active =
                    selectedSlot?.start === slot.start &&
                    selectedSlot?.end === slot.end;

                  return (
                    <button
                      key={`${slot.start}-${slot.end}`}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        ...styles.slotButton,
                        ...(slot.available ? styles.slotAvailable : styles.slotDisabled),
                        ...(active ? styles.slotSelected : {}),
                      }}
                    >
                      <Clock size={16} />
                      {slot.start} - {slot.end}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {selectedSlot && (
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div style={styles.stepBadge}>4</div>
              <h2 style={styles.sectionTitle}>Confirmer la demande</h2>
            </div>

            <div style={styles.confirmBox}>
              <p>
                <strong>Motif :</strong> {selectedMotif.label}
              </p>
              <p>
                <strong>Date :</strong> {selectedDate}
              </p>
              <p>
                <strong>Créneau :</strong> {selectedSlot.start} - {selectedSlot.end}
              </p>
            </div>

            <label style={styles.label}>Note optionnelle</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Exemple : Je souhaite discuter des conditions de financement..."
              style={styles.textarea}
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                ...styles.submitButton,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Envoi en cours..." : "Confirmer ma demande de RDV"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #F8F7F5 0%, #EEF2F8 100%)",
    padding: "28px",
    fontFamily: "'Source Sans 3', Arial, sans-serif",
    color: C.charcoal,
  },

  container: {
    maxWidth: 1180,
    margin: "0 auto",
  },

  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: `1px solid ${C.borderGray}`,
    background: C.white,
    color: C.darkGray,
    borderRadius: 10,
    padding: "9px 14px",
    cursor: "pointer",
    marginBottom: 18,
    fontWeight: 600,
  },

  hero: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    background: `linear-gradient(135deg, ${C.red} 0%, ${C.redDark} 100%)`,
    color: C.white,
    borderRadius: 18,
    padding: "28px 32px",
    boxShadow: "0 16px 35px rgba(204,0,0,0.22)",
    marginBottom: 24,
  },

  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: "rgba(255,255,255,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: {
    fontSize: 30,
    fontWeight: 800,
    margin: 0,
  },

  heroSubtitle: {
    fontSize: 15,
    opacity: 0.92,
    marginTop: 6,
  },

  card: {
    background: C.white,
    borderRadius: 18,
    border: `1px solid ${C.lightGray}`,
    boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
    padding: 26,
    marginBottom: 22,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },

  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${C.red}, ${C.orange})`,
    color: C.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: 800,
    margin: 0,
  },

  motifsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 14,
  },

  motifButton: {
    position: "relative",
    minHeight: 112,
    background: C.white,
    border: `1.5px solid ${C.lightGray}`,
    borderRadius: 14,
    padding: "20px 18px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  motifButtonActive: {
    border: `2px solid ${C.red}`,
    background: "#FFF7F7",
    boxShadow: "0 8px 20px rgba(204,0,0,0.12)",
  },

  motifIcon: {
    fontSize: 30,
  },

  motifLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: C.charcoal,
  },

  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: C.red,
    color: C.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  monthHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  monthTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: C.charcoal,
  },

  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: `1px solid ${C.borderGray}`,
    background: C.offWhite,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 10,
  },

  dayLabel: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: 800,
    color: C.midGray,
    textTransform: "uppercase",
    paddingBottom: 4,
  },

  emptyDay: {
    minHeight: 74,
  },

  dayButton: {
    minHeight: 74,
    borderRadius: 12,
    padding: "10px 8px",
    border: `1px solid ${C.lightGray}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  dayAvailable: {
    background: "#F0FDF4",
    color: C.charcoal,
    cursor: "pointer",
    borderColor: "#BBF7D0",
  },

  dayDisabled: {
    background: "#F1F5F9",
    color: "#94A3B8",
    cursor: "not-allowed",
  },

  daySelected: {
    background: C.red,
    color: C.white,
    borderColor: C.red,
  },

  dayNumber: {
    fontSize: 17,
    fontWeight: 800,
  },

  slotCount: {
    fontSize: 11,
    fontWeight: 700,
  },

  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 18,
    color: C.midGray,
    fontSize: 13,
  },

  legendDot: {
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: "50%",
    marginRight: 6,
  },

  slotsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
  },

  slotButton: {
    borderRadius: 12,
    padding: "13px 14px",
    border: `1.5px solid ${C.lightGray}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
  },

  slotAvailable: {
    background: C.white,
    cursor: "pointer",
    color: C.charcoal,
  },

  slotDisabled: {
    background: "#F1F5F9",
    color: "#94A3B8",
    cursor: "not-allowed",
  },

  slotSelected: {
    background: C.red,
    color: C.white,
    borderColor: C.red,
  },

  confirmBox: {
    background: C.offWhite,
    borderRadius: 12,
    border: `1px solid ${C.lightGray}`,
    padding: 16,
    marginBottom: 18,
    lineHeight: 1.8,
  },

  label: {
    display: "block",
    fontWeight: 700,
    marginBottom: 8,
  },

  textarea: {
    width: "100%",
    minHeight: 100,
    borderRadius: 12,
    border: `1.5px solid ${C.borderGray}`,
    padding: 14,
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    marginBottom: 16,
  },

  submitButton: {
    width: "100%",
    background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`,
    color: C.white,
    border: "none",
    borderRadius: 12,
    padding: "15px 18px",
    fontSize: 16,
    fontWeight: 800,
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: C.dangerLight,
    color: C.redDark,
    border: "1px solid #FECACA",
    borderRadius: 12,
    padding: "13px 16px",
    marginBottom: 18,
    fontWeight: 600,
  },

  loadingRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: C.midGray,
    padding: 18,
  },

  successCard: {
    maxWidth: 640,
    margin: "80px auto",
    background: C.white,
    borderRadius: 20,
    padding: 38,
    textAlign: "center",
    boxShadow: "0 15px 40px rgba(0,0,0,0.10)",
  },

  successIcon: {
    width: 82,
    height: 82,
    margin: "0 auto 20px",
    borderRadius: "50%",
    background: "#DCFCE7",
    color: C.success,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  successTitle: {
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 10,
  },

  successText: {
    color: C.midGray,
    fontSize: 15,
    marginBottom: 22,
  },

  summaryBox: {
    background: C.offWhite,
    borderRadius: 12,
    padding: 16,
    textAlign: "left",
    lineHeight: 1.8,
    marginBottom: 22,
  },

  successActions: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
  },

  primaryButton: {
    background: C.red,
    color: C.white,
    border: "none",
    borderRadius: 10,
    padding: "11px 16px",
    fontWeight: 800,
    cursor: "pointer",
  },

  secondaryButton: {
    background: C.charcoal,
    color: C.white,
    border: "none",
    borderRadius: 10,
    padding: "11px 16px",
    fontWeight: 800,
    cursor: "pointer",
  },

  ghostButton: {
    background: C.white,
    color: C.darkGray,
    border: `1px solid ${C.borderGray}`,
    borderRadius: 10,
    padding: "11px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
};