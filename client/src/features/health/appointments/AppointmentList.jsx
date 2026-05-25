const formatTime = (time) => {
  if (!time) return 'Not set';
  const [hour, minute] = time.split(':');
  if (!hour || !minute) return time;

  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function AppointmentList({
  appointments = [],
  selectedDate,
  readOnly = false,
  onEdit,
  onDelete,
  deletingId = ''
}) {
  if (!appointments.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
        No appointments for {selectedDate}.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <div key={appointment._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{appointment.title}</h3>
              <p className="mt-1 text-sm font-semibold text-green-700">
                {appointment.date} at {formatTime(appointment.time)}
              </p>
              {appointment.notes && (
                <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                  {appointment.notes}
                </p>
              )}
            </div>

            {!readOnly && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit?.(appointment)}
                  className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(appointment)}
                  disabled={deletingId === appointment._id}
                  className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {deletingId === appointment._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
