// client/src/components/FeedbackButtons.jsx
// Version SANS Tailwind — styles inline garantis

import { useState } from "react";
import { ThumbsUp, ThumbsDown, AlertTriangle, X, Check, Loader2, Send } from "lucide-react";
import { submitFeedback } from "../api/evaluationApi";


// ════════════════════════════════════════
// Modal de signalement
// ════════════════════════════════════════

function FeedbackModal({ evalId, onClose, onSubmitted }) {
  const [issueType, setIssueType] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const issueTypes = [
    { id: "incorrect",  label: "❌ Information incorrecte",      desc: "La réponse contient des erreurs" },
    { id: "incomplete", label: "📝 Réponse incomplète",          desc: "Il manque des informations" },
    { id: "irrelevant", label: "🎯 Hors-sujet",                  desc: "Ne correspond pas à ma question" },
    { id: "other",      label: "💬 Autre problème",              desc: "Décrivez ci-dessous" },
  ];

  const handleSubmit = async () => {
    if (!issueType) {
      setError("Veuillez sélectionner un type de problème");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback(evalId, "down", comment.trim() || null, issueType);
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const overlayStyle = {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  };

  const modalStyle = {
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
    maxWidth: "440px",
    width: "100%",
    padding: "24px",
    maxHeight: "90vh",
    overflowY: "auto",
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={20} color="#F59E0B" />
            <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937", margin: 0 }}>
              Signaler un problème
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: "14px", color: "#4B5563", marginBottom: "16px" }}>
          Aidez-nous à améliorer le chatbot:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {issueTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setIssueType(type.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px",
                borderRadius: "8px",
                border: `2px solid ${issueType === type.id ? "#EF4444" : "#E5E7EB"}`,
                background: issueType === type.id ? "#FEF2F2" : "white",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontWeight: "500", fontSize: "14px", color: issueType === type.id ? "#B91C1C" : "#374151" }}>
                {type.label}
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{type.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
            Commentaire <span style={{ fontSize: "12px", color: "#9CA3AF" }}>(optionnel)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Décrivez le problème..."
            style={{
              width: "100%",
              padding: "12px",
              border: "2px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              resize: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: "12px", color: "#9CA3AF", textAlign: "right", marginTop: "4px" }}>
            {comment.length}/500
          </div>
        </div>

        {error && (
          <div style={{
            marginBottom: "16px",
            padding: "12px",
            background: "#FEF2F2",
            borderLeft: "4px solid #EF4444",
            borderRadius: "4px",
            fontSize: "14px",
            color: "#991B1B",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "2px solid #E5E7EB",
              background: "white",
              color: "#374151",
              borderRadius: "8px",
              fontWeight: "500",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!issueType || submitting}
            style={{
              flex: 1,
              background: !issueType || submitting ? "#FCA5A5" : "#DC2626",
              color: "white",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              fontWeight: "500",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: !issueType || submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} />
                Envoi...
              </>
            ) : (
              <>
                <Send size={16} />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════
// Composant principal: FeedbackButtons
// ════════════════════════════════════════

export default function FeedbackButtons({ evalId }) {
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [flash, setFlash] = useState(null);

  if (!evalId) return null;

  const handleThumbsUp = async () => {
    if (feedback === "up" || submitting) return;
    setSubmitting(true);
    try {
      await submitFeedback(evalId, "up");
      setFeedback("up");
      setFlash({ type: "success", text: "Merci pour votre retour! 👍" });
      setTimeout(() => setFlash(null), 3000);
    } catch (err) {
      setFlash({ type: "error", text: "Erreur: " + err.message });
      setTimeout(() => setFlash(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleThumbsDown = () => {
    if (feedback || submitting) return;
    setShowModal(true);
  };

  const handleFeedbackSubmitted = () => {
    setFeedback("down");
    setFlash({ type: "success", text: "Merci, votre signalement nous aide!" });
    setTimeout(() => setFlash(null), 4000);
  };

  const containerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "8px",
    fontSize: "13px",
  };

  const labelStyle = {
    color: "#6B7280",
    fontSize: "13px",
  };

  const getButtonStyle = (type) => {
    const isThisVoted = feedback === type;
    const isOtherVoted = feedback && feedback !== type;
    const isUp = type === "up";

    let bg = "#F9FAFB";
    let textColor = "#4B5563";
    let borderColor = "#E5E7EB";

    if (isThisVoted) {
      bg = isUp ? "#D1FAE5" : "#FEE2E2";
      textColor = isUp ? "#047857" : "#B91C1C";
      borderColor = isUp ? "#86EFAC" : "#FCA5A5";
    } else if (isOtherVoted) {
      bg = "#F3F4F6";
      textColor = "#9CA3AF";
      borderColor = "#E5E7EB";
    }

    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "6px 12px",
      borderRadius: "8px",
      border: `1.5px solid ${borderColor}`,
      background: bg,
      color: textColor,
      fontSize: "13px",
      fontWeight: "500",
      cursor: feedback ? "not-allowed" : "pointer",
      transition: "all 0.2s",
    };
  };

  return (
    <>
      <div style={containerStyle}>
        <span style={labelStyle}>Cette réponse vous a-t-elle aidé?</span>

        <button
          onClick={handleThumbsUp}
          disabled={feedback !== null || submitting}
          style={getButtonStyle("up")}
          title="Oui, utile"
        >
          <ThumbsUp size={14} fill={feedback === "up" ? "currentColor" : "none"} />
          <span>Oui</span>
        </button>

        <button
          onClick={handleThumbsDown}
          disabled={feedback !== null || submitting}
          style={getButtonStyle("down")}
          title="Non, à améliorer"
        >
          <ThumbsDown size={14} fill={feedback === "down" ? "currentColor" : "none"} />
          <span>Non</span>
        </button>

        {flash && (
          <span style={{
            marginLeft: "8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            fontWeight: "500",
            color: flash.type === "success" ? "#059669" : "#DC2626",
          }}>
            {flash.type === "success" ? <Check size={14} /> : <X size={14} />}
            <span>{flash.text}</span>
          </span>
        )}
      </div>

      {showModal && (
        <FeedbackModal
          evalId={evalId}
          onClose={() => setShowModal(false)}
          onSubmitted={handleFeedbackSubmitted}
        />
      )}
    </>
  );
}
