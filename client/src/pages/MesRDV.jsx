import { useEffect, useState } from "react";

export default function MesRDV() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("accessToken");

    fetch("http://127.0.0.1:8000/api/appointments/my", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Erreur ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setAppointments(data.appointments || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: 40 }}>Chargement de vos rendez-vous...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: "red" }}>
        Erreur chargement RDV : {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 20 }}>
        Mes Rendez-vous
      </h1>

      {appointments.length === 0 ? (
        <p>Aucun rendez-vous trouvé.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {appointments.map((rdv) => (
            <div
              key={rdv.id || rdv._id}
              style={{
                background: "white",
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: "bold" }}>
                {rdv.motif_icon} {rdv.motif_label}
              </h2>

              <p>
                <strong>Date :</strong> {rdv.date}
              </p>

              <p>
                <strong>Heure :</strong> {rdv.start_time} - {rdv.end_time}
              </p>

              <p>
                <strong>Statut :</strong> {rdv.status}
              </p>

              {rdv.notes_client && (
                <p>
                  <strong>Note :</strong> {rdv.notes_client}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}