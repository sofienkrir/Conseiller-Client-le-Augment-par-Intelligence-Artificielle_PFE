import { useEffect, useState } from "react";

const C = {
  red: "#CC0000",
  redDark: "#A00000",
  orange: "#E8521A",
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
  danger: "#DC2626",
};

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

function getStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "pending")              return "En attente";
  if (normalized === "confirmed")            return "Confirmé";
  if (normalized === "approved")             return "Validé";
  if (normalized === "rejected")             return "Refusé";
  if (normalized === "cancelled")            return "Annulé";
  if (normalized === "cancelled_by_advisor") return "Annulé par le conseiller";
  if (normalized === "completed")            return "Terminé";

  return status || "Non défini";
}

function getStatusStyle(status) {
  const normalized = String(status || "").toLowerCase();

  if (["confirmed", "approved", "completed"].includes(normalized)) {
    return {
      background: "#DCFCE7",
      color: "#166534",
      border: "1px solid #BBF7D0",
    };
  }

  if (normalized === "pending") {
    return {
      background: "#FEF3C7",
      color: "#92400E",
      border: "1px solid #FDE68A",
    };
  }

  if (["rejected", "cancelled"].includes(normalized)) {
    return {
      background: "#FEE2E2",
      color: "#991B1B",
      border: "1px solid #FECACA",
    };
  }

  if (normalized === "cancelled_by_advisor") {
    return {
      background: "#FEF3C7",
      color: "#92400E",
      border: "1px solid #FDE68A",
    };
  }

  return {
    background: "#F1F5F9",
    color: "#475569",
    border: "1px solid #CBD5E1",
  };
}

export default function MesRDV() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [choosingSlot, setChoosingSlot] = useState(null); // appointmentId en cours

  async function handleChooseSlot(appointmentId, slotIndex) {
    setChoosingSlot(appointmentId + "_" + slotIndex);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/appointments/${appointmentId}/choose-slot`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ slot_index: slotIndex }),
      });
      if (res.ok) await loadAppointments();
    } catch {}
    finally { setChoosingSlot(null); }
  }

  async function loadAppointments() {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const res = await fetch("http://127.0.0.1:8000/api/appointments/my", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }

      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(
        "Impossible de charger vos rendez-vous. Vérifiez le backend ou votre connexion."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topActions}>
          <button
            type="button"
            onClick={() => navigateTo("/chat")}
            style={styles.secondaryButton}
          >
            ← Retour au chat
          </button>

          <button
            type="button"
            onClick={() => navigateTo("/prendre-rdv")}
            style={styles.primaryButton}
          >
            📅 Prendre un nouveau RDV
          </button>
        </div>

        <section style={styles.hero}>
          <div>
            <h1 style={styles.title}>Mes Rendez-vous</h1>
            <p style={styles.subtitle}>
              Consultez l’historique de vos demandes de rendez-vous avec Attijari Bank.
            </p>
          </div>

          <div style={styles.counterBox}>
            <span style={styles.counterNumber}>{appointments.length}</span>
            <span style={styles.counterLabel}>RDV</span>
          </div>
        </section>

        {loading && (
          <div style={styles.card}>
            <p style={styles.loadingText}>Chargement de vos rendez-vous...</p>
          </div>
        )}

        {!loading && error && (
          <div style={styles.errorBox}>
            <strong>Erreur</strong>
            <p>{error}</p>

            <button
              type="button"
              onClick={loadAppointments}
              style={{ ...styles.primaryButton, marginTop: 14 }}
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && appointments.length === 0 && (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>📅</div>
            <h2 style={styles.emptyTitle}>Aucun rendez-vous trouvé</h2>
            <p style={styles.emptyText}>
              Vous n’avez pas encore envoyé de demande de rendez-vous.
            </p>

            <button
              type="button"
              onClick={() => navigateTo("/prendre-rdv")}
              style={styles.primaryButton}
            >
              Prendre mon premier RDV
            </button>
          </div>
        )}

        {!loading && !error && appointments.length > 0 && (
          <div style={styles.list}>
            {appointments.map((rdv) => {
              const statusStyle = getStatusStyle(rdv.status);

              return (
                <article key={rdv.id || rdv._id} style={styles.appointmentCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h2 style={styles.appointmentTitle}>
                        <span style={styles.appointmentIcon}>
                          {rdv.motif_icon || "📌"}
                        </span>
                        {rdv.motif_label || rdv.motif_id || "Rendez-vous"}
                      </h2>

                      <p style={styles.reference}>
                        Référence : {rdv.id || rdv._id || "Non disponible"}
                      </p>
                    </div>

                    <span style={{ ...styles.statusBadge, ...statusStyle }}>
                      {getStatusLabel(rdv.status)}
                    </span>
                  </div>

                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Date</span>
                      <span style={styles.infoValue}>{rdv.date}</span>
                    </div>

                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Heure</span>
                      <span style={styles.infoValue}>
                        {rdv.start_time} - {rdv.end_time}
                      </span>
                    </div>

                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Statut</span>
                      <span style={styles.infoValue}>
                        {getStatusLabel(rdv.status)}
                      </span>
                    </div>
                  </div>

                  {rdv.notes_client && (
                    <div style={styles.noteBox}>
                      <span style={styles.infoLabel}>Note client</span>
                      <p style={styles.noteText}>{rdv.notes_client}</p>
                    </div>
                  )}

                  {rdv.status === "alternative_proposed" && rdv.alternatives_multiple?.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.charcoal, marginBottom: 10 }}>
                        🔄 Votre conseiller vous propose {rdv.alternatives_multiple.length} créneaux — choisissez-en un :
                      </div>
                      {rdv.alternatives_message && (
                        <p style={{ fontSize: 12, color: C.midGray, fontStyle: "italic", marginBottom: 10 }}>
                          "{rdv.alternatives_message}"
                        </p>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {rdv.alternatives_multiple.map((slot, idx) => {
                          const labels = ["Option A", "Option B", "Option C"];
                          const dateStr = slot.date_str || String(slot.date || "").slice(0, 10);
                          const isLoading = choosingSlot === `${rdv.id}_${idx}`;
                          return (
                            <button key={idx} onClick={() => handleChooseSlot(rdv.id, idx)} disabled={!!choosingSlot}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F0F7FF", border: "1.5px solid #BFDBFE", borderRadius: 12, cursor: choosingSlot ? "not-allowed" : "pointer", textAlign: "left", transition: "all 0.2s" }}
                              onMouseEnter={e => { if (!choosingSlot) e.currentTarget.style.background = "#DBEAFE"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#F0F7FF"; }}>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#1D4ED8", marginRight: 10 }}>{labels[idx]}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.charcoal }}>
                                  {new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                                </span>
                                <span style={{ fontSize: 13, color: C.midGray, marginLeft: 8 }}>{slot.start_time} – {slot.end_time}</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>
                                {isLoading ? "..." : "Choisir →"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {rdv.status === "rejected" && rdv.rejection_reason && (
                    <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 12, padding: 14, marginTop: 10 }}>
                      <span style={{ ...styles.infoLabel, color: "#991B1B" }}>Motif du refus</span>
                      <p style={{ ...styles.noteText, color: "#7F1D1D" }}>{rdv.rejection_reason}</p>
                    </div>
                  )}

                  {rdv.status === "cancelled_by_advisor" && (
                    <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: 14, marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>📧</span>
                      <p style={{ margin: 0, fontSize: 13, color: "#92400E", fontWeight: 600 }}>
                        Un e-mail vous a été envoyé avec les détails de l'annulation.
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
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

  topActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    flexWrap: "wrap",
  },

  primaryButton: {
    background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`,
    color: C.white,
    border: "none",
    borderRadius: 12,
    padding: "11px 18px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(204,0,0,0.18)",
  },

  secondaryButton: {
    background: C.white,
    color: C.darkGray,
    border: `1px solid ${C.borderGray}`,
    borderRadius: 12,
    padding: "11px 18px",
    fontWeight: 700,
    cursor: "pointer",
  },

  hero: {
    background: `linear-gradient(135deg, ${C.red} 0%, ${C.redDark} 100%)`,
    color: C.white,
    borderRadius: 18,
    padding: "28px 32px",
    boxShadow: "0 16px 35px rgba(204,0,0,0.22)",
    marginBottom: 24,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: 800,
    margin: 0,
  },

  subtitle: {
    fontSize: 15,
    opacity: 0.92,
    marginTop: 8,
  },

  counterBox: {
    minWidth: 92,
    height: 92,
    background: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  counterNumber: {
    fontSize: 30,
    fontWeight: 900,
  },

  counterLabel: {
    fontSize: 12,
    opacity: 0.9,
    fontWeight: 700,
  },

  card: {
    background: C.white,
    borderRadius: 18,
    border: `1px solid ${C.lightGray}`,
    boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
    padding: 26,
  },

  loadingText: {
    color: C.midGray,
    fontSize: 15,
  },

  errorBox: {
    background: "#FFF5F5",
    border: "1px solid #FECACA",
    color: "#991B1B",
    borderRadius: 16,
    padding: 22,
  },

  emptyCard: {
    background: C.white,
    borderRadius: 18,
    border: `1px solid ${C.lightGray}`,
    boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
    padding: 38,
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: 52,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 8,
  },

  emptyText: {
    color: C.midGray,
    marginBottom: 22,
  },

  list: {
    display: "grid",
    gap: 18,
  },

  appointmentCard: {
    background: C.white,
    borderRadius: 18,
    border: `1px solid ${C.lightGray}`,
    boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
    padding: 24,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    marginBottom: 20,
  },

  appointmentTitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 22,
    fontWeight: 800,
    margin: 0,
  },

  appointmentIcon: {
    fontSize: 28,
  },

  reference: {
    color: C.midGray,
    fontSize: 12,
    marginTop: 6,
  },

  statusBadge: {
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 14,
  },

  infoItem: {
    background: C.offWhite,
    borderRadius: 12,
    padding: 14,
    border: `1px solid ${C.lightGray}`,
  },

  infoLabel: {
    display: "block",
    color: C.midGray,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: 800,
    color: C.charcoal,
  },

  noteBox: {
    background: "#FFF7F7",
    border: "1px solid #FECACA",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },

  noteText: {
    margin: 0,
    color: C.darkGray,
    lineHeight: 1.6,
  },
};