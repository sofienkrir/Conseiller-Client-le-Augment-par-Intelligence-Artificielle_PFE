// client/src/pages/PrendreRDV.jsx
// Page de prise de rendez-vous pour les clients

import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  fetchMotifs,
  fetchMonthAvailability,
  fetchDayAvailability,
  requestAppointment,
} from "../api/appointmentsApi";

// ════════════════════════════════════════
// Helpers de date (pas de lib externe)
// ════════════════════════════════════════
const FRENCH_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FRENCH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const formatDateISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isSameDay = (d1, d2) => d1 && d2 && formatDateISO(d1) === formatDateISO(d2);

const getMonthGrid = (year, month) => {
  // month: 0-11
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // weekday du 1er (en mode Lun=0)
  let firstWeekday = firstDay.getDay() - 1;
  if (firstWeekday < 0) firstWeekday = 6;
  
  const grid = [];
  let week = Array(firstWeekday).fill(null);
  
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(new Date(year, month, day));
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
};


// ════════════════════════════════════════
// Composant principal
// ════════════════════════════════════════
export default function PrendreRDV() {
  // États
  const [motifs, setMotifs] = useState([]);
  const [selectedMotif, setSelectedMotif] = useState(null);
  
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthAvailability, setMonthAvailability] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  
  const [daySlots, setDaySlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [notes, setNotes] = useState("");
  
  const [loadingMotifs, setLoadingMotifs] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ════════════════════════════════════════
  // Charger les motifs au montage
  // ════════════════════════════════════════
  useEffect(() => {
    fetchMotifs()
      .then((data) => setMotifs(data.motifs || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingMotifs(false));
  }, []);

  // ════════════════════════════════════════
  // Charger la disponibilité du mois
  // ════════════════════════════════════════
  useEffect(() => {
    setLoadingMonth(true);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    fetchMonthAvailability(year, month)
      .then((data) => setMonthAvailability(data.availability || {}))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingMonth(false));
  }, [currentMonth]);

  // ════════════════════════════════════════
  // Charger les créneaux du jour sélectionné
  // ════════════════════════════════════════
  useEffect(() => {
    if (!selectedDate) {
      setDaySlots([]);
      return;
    }
    setLoadingDay(true);
    setSelectedSlot(null);
    fetchDayAvailability(formatDateISO(selectedDate))
      .then((data) => setDaySlots(data.slots || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDay(false));
  }, [selectedDate]);

  // ════════════════════════════════════════
  // Calendrier — état d'un jour
  // ════════════════════════════════════════
  const getDayInfo = (date) => {
    if (!date) return null;
    const key = formatDateISO(date);
    const info = monthAvailability[key];
    if (!info) return null;
    
    const isPast = info.is_past;
    const isWeekend = !info.is_working_day;
    const totalSlots = info.total_slots;
    const availableSlots = info.available_slots;
    
    let status = "available";
    if (isPast) status = "past";
    else if (isWeekend) status = "weekend";
    else if (availableSlots === 0) status = "full";
    else if (availableSlots <= 3) status = "few";
    
    return { ...info, status, isPast, isWeekend };
  };

  // ════════════════════════════════════════
  // Soumission
  // ════════════════════════════════════════
  const canSubmit = selectedMotif && selectedDate && selectedSlot && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    
    try {
      const result = await requestAppointment({
        date: formatDateISO(selectedDate),
        start_time: selectedSlot.start,
        motif_id: selectedMotif.id,
        notes_client: notes.trim(),
      });
      
      setSuccess(result);
      // Reset
      setSelectedMotif(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setNotes("");
      
      // Recharger la disponibilité
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      fetchMonthAvailability(year, month).then((d) => setMonthAvailability(d.availability || {}));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ════════════════════════════════════════
  // Rendu
  // ════════════════════════════════════════
  const monthGrid = useMemo(
    () => getMonthGrid(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const morningSlots = daySlots.filter((s) => parseInt(s.start.split(":")[0]) < 12);
  const afternoonSlots = daySlots.filter((s) => parseInt(s.start.split(":")[0]) >= 12);

  const goToPrevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    if (prev.getMonth() < today.getMonth() && prev.getFullYear() <= today.getFullYear()) return;
    setCurrentMonth(prev);
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
    setSelectedDate(null);
  };

  const isPrevMonthDisabled =
    currentMonth.getMonth() === today.getMonth() &&
    currentMonth.getFullYear() === today.getFullYear();

  // ════════════════════════════════════════
  // UI
  // ════════════════════════════════════════
  if (success) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Demande envoyée!</h2>
          <p className="text-gray-700 mb-6">
            Votre demande de RDV pour le <strong>{success.date}</strong> à{" "}
            <strong>{success.start_time}</strong> a été enregistrée.
            Un conseiller la validera prochainement et vous recevrez une notification.
          </p>
          <div className="bg-white rounded-lg p-4 text-left max-w-md mx-auto mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{success.motif_icon}</span>
              <div>
                <div className="font-semibold">{success.motif_label}</div>
                <div className="text-sm text-gray-500">
                  {success.date} • {success.start_time} - {success.end_time}
                </div>
              </div>
            </div>
            {success.notes_client && (
              <div className="text-sm text-gray-600 italic mt-3 pt-3 border-t border-gray-200">
                « {success.notes_client} »
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSuccess(null)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
            >
              Prendre un autre RDV
            </button>
            <a
              href="/my-appointments"
              className="px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-medium transition"
            >
              Voir mes RDV
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 rounded-full p-3">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Prendre un Rendez-vous</h1>
            <p className="text-red-100 text-sm mt-1">
              Réservez un créneau avec un conseiller Attijari Bank
            </p>
          </div>
        </div>
      </div>

      {/* Erreur globale */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* ÉTAPE 1: Choix du motif */}
      <section className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">
            1
          </span>
          Quel est l'objet de votre RDV?
        </h2>
        {loadingMotifs ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {motifs.map((motif) => {
              const isSelected = selectedMotif?.id === motif.id;
              return (
                <button
                  key={motif.id}
                  onClick={() => setSelectedMotif(motif)}
                  className={`
                    p-4 rounded-xl border-2 transition-all text-left
                    ${isSelected
                      ? "border-red-600 bg-red-50 shadow-md"
                      : "border-gray-200 hover:border-red-300 hover:bg-gray-50"}
                  `}
                >
                  <div className="text-3xl mb-2">{motif.icon}</div>
                  <div className={`font-medium text-sm ${isSelected ? "text-red-700" : "text-gray-700"}`}>
                    {motif.label}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-red-600 mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ÉTAPE 2: Choix de la date */}
      {selectedMotif && (
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">
              2
            </span>
            Choisissez une date
          </h2>

          {/* Navigation mois */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              disabled={isPrevMonthDisabled}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-gray-700">
              {FRENCH_MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Grille calendrier */}
          {loadingMonth ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Header jours */}
              {FRENCH_DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}

              {/* Cases */}
              {monthGrid.flat().map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;
                const info = getDayInfo(date);
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                
                let classes = "aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition relative ";
                let disabled = false;
                
                if (isSelected) {
                  classes += "bg-red-600 text-white shadow-lg ring-2 ring-red-300 ";
                } else if (info?.status === "past") {
                  classes += "bg-gray-50 text-gray-300 cursor-not-allowed ";
                  disabled = true;
                } else if (info?.status === "weekend") {
                  classes += "bg-gray-50 text-gray-300 cursor-not-allowed ";
                  disabled = true;
                } else if (info?.status === "full") {
                  classes += "bg-red-50 text-red-300 cursor-not-allowed line-through ";
                  disabled = true;
                } else if (info?.status === "few") {
                  classes += "bg-amber-50 hover:bg-amber-100 text-amber-700 ";
                } else if (info?.status === "available") {
                  classes += "bg-green-50 hover:bg-green-100 text-green-700 ";
                } else {
                  classes += "bg-gray-50 text-gray-400 cursor-not-allowed ";
                  disabled = true;
                }

                if (isToday && !isSelected) classes += "ring-2 ring-red-400 ";

                return (
                  <button
                    key={`day-${idx}`}
                    onClick={() => !disabled && setSelectedDate(date)}
                    disabled={disabled}
                    className={classes}
                    title={info?.available_slots ? `${info.available_slots} créneaux libres` : ""}
                  >
                    <span className="text-sm font-medium">{date.getDate()}</span>
                    {info && info.available_slots > 0 && !isSelected && (
                      <span className="text-[10px] mt-0.5">
                        {info.available_slots} libres
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Légende */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-green-100 rounded" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-100 rounded" />
              <span>Peu de créneaux</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-red-50 rounded" />
              <span>Complet</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-gray-100 rounded" />
              <span>Indisponible</span>
            </div>
          </div>
        </section>
      )}

      {/* ÉTAPE 3: Choix du créneau */}
      {selectedDate && (
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">
              3
            </span>
            Choisissez un créneau
            <span className="ml-auto text-sm font-normal text-gray-500">
              {selectedDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </h2>

          {loadingDay ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : daySlots.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Aucun créneau disponible pour cette date
            </p>
          ) : (
            <>
              {/* Matin */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Matin
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {morningSlots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        onClick={() => slot.available && setSelectedSlot(slot)}
                        disabled={!slot.available}
                        className={`
                          py-3 rounded-lg font-medium text-sm transition
                          ${isSelected
                            ? "bg-red-600 text-white shadow-md"
                            : slot.available
                            ? "bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700"
                            : "bg-gray-50 text-gray-300 cursor-not-allowed line-through"}
                        `}
                      >
                        {slot.start}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Après-midi */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Après-midi
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        onClick={() => slot.available && setSelectedSlot(slot)}
                        disabled={!slot.available}
                        className={`
                          py-3 rounded-lg font-medium text-sm transition
                          ${isSelected
                            ? "bg-red-600 text-white shadow-md"
                            : slot.available
                            ? "bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700"
                            : "bg-gray-50 text-gray-300 cursor-not-allowed line-through"}
                        `}
                      >
                        {slot.start}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* ÉTAPE 4: Notes */}
      {selectedSlot && (
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">
              4
            </span>
            Notes additionnelles <span className="text-sm font-normal text-gray-500">(optionnel)</span>
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Décrivez en quelques mots votre besoin (ex: J'aimerais discuter du Crédit Melki pour l'achat d'une maison)..."
            maxLength={500}
            rows={3}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition resize-none"
          />
          <div className="text-xs text-gray-400 mt-1 text-right">
            {notes.length} / 500 caractères
          </div>
        </section>
      )}

      {/* RÉCAPITULATIF + BOUTON SUBMIT */}
      {selectedSlot && (
        <section className="bg-gradient-to-br from-gray-50 to-white border-2 border-red-200 rounded-2xl p-6">
          <h3 className="font-bold text-gray-800 mb-3">📋 Récapitulatif</h3>
          <div className="space-y-2 text-sm mb-6">
            <div className="flex">
              <span className="text-gray-500 w-32">Motif:</span>
              <span className="font-medium">
                {selectedMotif.icon} {selectedMotif.label}
              </span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-32">Date:</span>
              <span className="font-medium">
                {selectedDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-32">Horaire:</span>
              <span className="font-medium">
                {selectedSlot.start} - {selectedSlot.end} (30 min)
              </span>
            </div>
            {notes && (
              <div className="flex">
                <span className="text-gray-500 w-32">Notes:</span>
                <span className="font-medium italic">« {notes} »</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`
              w-full py-4 rounded-xl font-semibold text-white transition flex items-center justify-center gap-2
              ${canSubmit
                ? "bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl"
                : "bg-gray-300 cursor-not-allowed"}
            `}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Confirmer ma demande de RDV
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-3">
            Votre demande sera examinée par un conseiller. Vous recevrez une notification dès validation.
          </p>
        </section>
      )}
    </div>
  );
}