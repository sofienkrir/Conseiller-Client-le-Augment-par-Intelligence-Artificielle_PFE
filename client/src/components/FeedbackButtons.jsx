// client/src/components/FeedbackButtons.jsx
// Composant: Boutons 👍 / 👎 avec modal de signalement

import { useState } from "react";
import { ThumbsUp, ThumbsDown, AlertTriangle, X, Check, Loader2, Send } from "lucide-react";
import { submitFeedback } from "../api/evaluationApi";


// ════════════════════════════════════════
// Modal de signalement (apparaît si 👎)
// ════════════════════════════════════════

function FeedbackModal({ evalId, onClose, onSubmitted }) {
  const [issueType, setIssueType] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const issueTypes = [
    { id: "incorrect",  label: "❌ Information incorrecte",      desc: "La réponse contient des erreurs factuelles" },
    { id: "incomplete", label: "📝 Réponse incomplète",          desc: "Il manque des informations importantes" },
    { id: "irrelevant", label: "🎯 Hors-sujet",                  desc: "La réponse ne correspond pas à ma question" },
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-gray-800">Signaler un problème</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Aidez-nous à améliorer le chatbot en précisant le problème:
        </p>

        {/* Types de problèmes */}
        <div className="space-y-2 mb-4">
          {issueTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setIssueType(type.id)}
              className={`
                w-full text-left p-3 rounded-lg border-2 transition
                ${issueType === type.id
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-red-300 hover:bg-gray-50"}
              `}
            >
              <div className={`font-medium text-sm ${issueType === type.id ? "text-red-700" : "text-gray-700"}`}>
                {type.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{type.desc}</div>
            </button>
          ))}
        </div>

        {/* Commentaire (optionnel) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commentaire <span className="text-xs text-gray-400">(optionnel)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Décrivez le problème en quelques mots..."
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none resize-none text-sm"
          />
          <div className="text-xs text-gray-400 text-right mt-1">
            {comment.length}/500
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!issueType || submitting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
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
  const [feedback, setFeedback] = useState(null);  // null | "up" | "down"
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
    setFlash({ type: "success", text: "Merci, votre signalement nous aide à nous améliorer." });
    setTimeout(() => setFlash(null), 4000);
  };

  return (
    <>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Cette réponse vous a-t-elle aidé?</span>

        {/* Bouton 👍 */}
        <button
          onClick={handleThumbsUp}
          disabled={feedback !== null || submitting}
          className={`
            inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition text-xs font-medium
            ${feedback === "up"
              ? "bg-green-100 text-green-700 cursor-default"
              : feedback === "down"
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-700 border border-gray-200 hover:border-green-300"}
          `}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${feedback === "up" ? "fill-current" : ""}`} />
          <span>Oui</span>
        </button>

        {/* Bouton 👎 */}
        <button
          onClick={handleThumbsDown}
          disabled={feedback !== null || submitting}
          className={`
            inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition text-xs font-medium
            ${feedback === "down"
              ? "bg-red-100 text-red-700 cursor-default"
              : feedback === "up"
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-700 border border-gray-200 hover:border-red-300"}
          `}
        >
          <ThumbsDown className={`w-3.5 h-3.5 ${feedback === "down" ? "fill-current" : ""}`} />
          <span>Non</span>
        </button>

        {/* Feedback flash */}
        {flash && (
          <span
            className={`
              ml-2 inline-flex items-center gap-1 text-xs font-medium
              ${flash.type === "success" ? "text-green-600" : "text-red-600"}
            `}
          >
            {flash.type === "success" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
            <span>{flash.text}</span>
          </span>
        )}
      </div>

      {/* Modal */}
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