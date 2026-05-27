const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const monthLabel = (date) => date.toLocaleDateString([], {
  month: 'long',
  year: 'numeric'
});

const buildCalendarCells = (visibleMonth) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
};

export default function AppointmentCalendar({
  appointments = [],
  selectedDate,
  visibleMonth,
  onSelectDate,
  onChangeMonth
}) {
  const appointmentCountByDate = appointments.reduce((map, appointment) => {
    map[appointment.date] = (map[appointment.date] || 0) + 1;
    return map;
  }, {});

  const todayKey = toDateKey(new Date());
  const cells = buildCalendarCells(visibleMonth);
  const currentMonth = visibleMonth.getMonth();

  return (
    <section className="motion-card rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeMonth?.(-1)}
          className="rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
        >
          Previous
        </button>
        <h2 className="text-xl font-bold text-brand-primary">{monthLabel(visibleMonth)}</h2>
        <button
          type="button"
          onClick={() => onChangeMonth?.(1)}
          className="rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-2 text-sm font-bold text-gray-500">
            {label}
          </div>
        ))}

        {cells.map((date) => {
          const dateKey = toDateKey(date);
          const count = appointmentCountByDate[dateKey] || 0;
          const isSelected = dateKey === selectedDate;
          const isToday = dateKey === todayKey;
          const isCurrentMonth = date.getMonth() === currentMonth;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate?.(dateKey)}
              className={`min-h-20 rounded-xl border p-2 text-left transition ${
                isSelected
                  ? 'border-green-600 bg-green-50 ring-2 ring-green-500'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              } ${isCurrentMonth ? 'text-brand-primary' : 'text-gray-400'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${isToday ? 'text-green-700' : ''}`}>
                  {date.getDate()}
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                    {count}
                  </span>
                )}
              </div>
              {count > 0 && (
                <p className="mt-2 text-xs font-semibold text-green-700">
                  {count} appointment{count > 1 ? 's' : ''}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export { toDateKey };
