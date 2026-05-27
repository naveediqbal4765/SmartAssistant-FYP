const formatTime = (time) => {
  if (!time) return 'Not set';
  const [hour, minute] = time.split(':');
  if (!hour || !minute) return time;

  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function MedicationList({
  medications = [],
  readOnly = false,
  onEdit,
  onDelete,
  deletingId = ''
}) {
  if (!medications.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
        No medications added yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {medications.map((medication) => (
        <div key={medication._id} className="motion-card rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-brand-primary">{medication.name}</h3>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-3">
                <p><span className="font-semibold text-brand-primary">Dosage:</span> {medication.dosage}</p>
                <p><span className="font-semibold text-brand-primary">Frequency:</span> {medication.frequency}</p>
                <p><span className="font-semibold text-brand-primary">Time:</span> {formatTime(medication.time)}</p>
              </div>
              {medication.notes && (
                <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{medication.notes}</p>
              )}
            </div>

            {!readOnly && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit?.(medication)}
                  className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(medication)}
                  disabled={deletingId === medication._id}
                  className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {deletingId === medication._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
