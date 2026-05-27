const formatTime = (time) => {
  if (!time) return 'Not set';
  const [hour, minute] = time.split(':');
  if (!hour || !minute) return time;

  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const scheduleLabels = {
  once_daily: 'Once daily',
  multiple_times_daily: 'Multiple times daily',
  interval_hours: 'Interval schedule',
  weekly: 'Weekly',
  as_needed: 'As needed'
};

const formatSchedule = (medication) => {
  if (medication.scheduleType === 'interval_hours') {
    return `Every ${medication.intervalHours} hours`;
  }

  if (medication.scheduleType === 'weekly') {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Weekly on ${(medication.daysOfWeek || []).map((day) => labels[day]).join(', ')}`;
  }

  return scheduleLabels[medication.scheduleType] || medication.frequency || 'Not set';
};

const formatReminderTimes = (medication) => {
  const times = medication.reminderTimes?.length ? medication.reminderTimes : medication.time ? [medication.time] : [];
  if (!times.length) return medication.scheduleType === 'as_needed' ? 'No scheduled reminders' : 'Not set';
  return times.map(formatTime).join(', ');
};

const statusStyles = {
  pending: 'bg-blue-50 text-blue-700 border-blue-100',
  active: 'bg-yellow-50 text-yellow-800 border-yellow-100',
  dismissed: 'bg-gray-100 text-gray-700 border-gray-200',
  taken: 'bg-green-50 text-green-700 border-green-100',
  skipped: 'bg-orange-50 text-orange-700 border-orange-100',
  expired: 'bg-red-50 text-red-700 border-red-100'
};

const statusLabels = {
  pending: 'Pending',
  active: 'Pending',
  dismissed: 'Dismissed',
  taken: 'Taken',
  skipped: 'Skipped',
  expired: 'Missed'
};

const getActionTimestamp = (occurrence) => (
  occurrence?.takenAt
    || occurrence?.dismissedAt
    || occurrence?.skippedAt
    || occurrence?.expiredAt
    || occurrence?.activatedAt
    || occurrence?.scheduledFor
);

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getLatestReminderStatus = (medication) => {
  const occurrences = [...(medication.reminderOccurrences || [])].sort((a, b) => (
    new Date(b.scheduledFor || 0) - new Date(a.scheduledFor || 0)
  ));
  const latest = occurrences[0];

  if (!latest) {
    return {
      status: 'pending',
      label: 'Pending',
      detail: 'No reminder interaction recorded yet'
    };
  }

  const status = latest.status || 'pending';
  const timestamp = formatDateTime(getActionTimestamp(latest));
  const scheduled = formatDateTime(latest.scheduledFor);
  const label = statusLabels[status] || status;

  return {
    status,
    label,
    detail: timestamp
      ? `${label} at ${timestamp}`
      : scheduled
        ? `Scheduled for ${scheduled}`
        : label
  };
};

const getReminderStatusTimeline = (medication) => (
  [...(medication.reminderOccurrences || [])]
    .sort((a, b) => new Date(b.scheduledFor || 0) - new Date(a.scheduledFor || 0))
    .slice(0, 5)
    .map((occurrence) => {
      const status = occurrence.status || 'pending';
      const label = statusLabels[status] || status;
      const actionTime = formatDateTime(getActionTimestamp(occurrence));
      const scheduledTime = formatDateTime(occurrence.scheduledFor);

      return {
        occurrenceKey: occurrence.occurrenceKey,
        status,
        label,
        actionTime,
        scheduledTime,
        detail: actionTime
          ? `${label} at ${actionTime}`
          : scheduledTime
            ? `Scheduled for ${scheduledTime}`
            : label
      };
    })
);

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
                <p><span className="font-semibold text-brand-primary">Schedule:</span> {formatSchedule(medication)}</p>
                <p><span className="font-semibold text-brand-primary">Reminder times:</span> {formatReminderTimes(medication)}</p>
              </div>
              {medication.notes && (
                <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{medication.notes}</p>
              )}
              {readOnly && (() => {
                const reminderStatus = getLatestReminderStatus(medication);
                const reminderTimeline = getReminderStatusTimeline(medication);
                return (
                  <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-brand-primary">Latest reminder status</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[reminderStatus.status] || statusStyles.pending}`}>
                        {reminderStatus.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{reminderStatus.detail}</p>
                    {reminderTimeline.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reminderTimeline.map((item) => (
                          <span
                            key={item.occurrenceKey}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[item.status] || statusStyles.pending}`}
                            title={item.detail}
                          >
                            {item.label}
                            {item.scheduledTime ? ` - ${item.scheduledTime}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
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
