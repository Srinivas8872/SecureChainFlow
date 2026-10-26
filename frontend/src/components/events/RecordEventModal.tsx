import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../common/Button';
import { AlertCircle, PlusCircle, Thermometer, Droplets, MapPin, Building, FileText } from 'lucide-react';

interface RecordEventModalProps {
  batchId: string;
  batchCode: string;
  currentStatus: string;
  isOpen: boolean;
  onClose: () => void;
  onEventRecorded: () => void;
}

export const RecordEventModal: React.FC<RecordEventModalProps> = ({
  batchId,
  batchCode,
  currentStatus,
  isOpen,
  onClose,
  onEventRecorded,
}) => {
  const [eventType, setEventType] = useState<string>('');
  const [facility, setFacility] = useState('');
  const [location, setLocation] = useState('');
  const [temperature, setTemperature] = useState<string>('');
  const [humidity, setHumidity] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Determine allowed event transitions based on current status
  const transitionMatrix: Record<string, string[]> = {
    REGISTERED: ['PROCESSED', 'QUALITY_CHECKED', 'DISPATCHED', 'RECALLED'],
    IN_PROCESSING: ['QUALITY_CHECKED', 'DISPATCHED', 'RECALLED'],
    QUALITY_APPROVED: ['DISPATCHED', 'STORED', 'IN_TRANSIT', 'RECALLED'],
    IN_TRANSIT: ['RECEIVED', 'RECALLED'],
    STORED: ['DISPATCHED', 'QUALITY_CHECKED', 'RETAILED', 'RECALLED'],
    AVAILABLE_FOR_SALE: ['DELIVERED', 'RECALLED'],
    DELIVERED: ['RECALLED'],
    RECALLED: [],
  };

  const allowedEvents = transitionMatrix[currentStatus] || [];
  const selectedEvent = eventType || (allowedEvents.length > 0 ? allowedEvents[0] : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setLoading(true);
    setError(null);

    const idempotencyKey = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      await api.post(`/batches/${batchId}/events`, {
        eventType: selectedEvent,
        facility: facility.trim() || undefined,
        location: location.trim() || undefined,
        temperature: temperature !== '' ? parseFloat(temperature) : undefined,
        humidity: humidity !== '' ? parseFloat(humidity) : undefined,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });

      onEventRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record supply chain event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-sky-400" />
              <span>Record Custody Event</span>
            </h2>
            <p className="text-xs text-slate-400">
              Batch: <span className="font-mono text-sky-400">{batchCode}</span> (Current State: {currentStatus})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {allowedEvents.length === 0 ? (
          <div className="py-6 text-center text-slate-400 space-y-2">
            <p>No further state transitions permitted from status &lsquo;{currentStatus}&rsquo;.</p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="evType">
                Permitted Event Transition *
              </label>
              <select
                id="evType"
                required
                value={selectedEvent}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {allowedEvents.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="facility">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    Facility Name
                  </span>
                </label>
                <input
                  id="facility"
                  type="text"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  placeholder="e.g. Apex Central Refinery Lab"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="loc">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Geographic Location
                  </span>
                </label>
                <input
                  id="loc"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Portland, OR"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Sensor Readings */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Environmental Telemetry (Optional)
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1" htmlFor="temp">
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                      Temperature (°C)
                    </span>
                  </label>
                  <input
                    id="temp"
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="e.g. 4.2"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1" htmlFor="hum">
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-indigo-400" />
                      Relative Humidity (%)
                    </span>
                  </label>
                  <input
                    id="hum"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={humidity}
                    onChange={(e) => setHumidity(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="notes">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Audit Notes & Inspection Remarks
                </span>
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dispatched via temperature-controlled reefer truck #TR-904..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={loading}>
                Record & Notarize Event
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
