export const taskCategoryUi = {
  medical: { emoji: '🏥', label: 'Medical' },
  grocery: { emoji: '🛒', label: 'Grocery Shopping' },
  transport: { emoji: '🚗', label: 'Transport' },
  household: { emoji: '🧹', label: 'Household' },
  companionship: { emoji: '🤝', label: 'Companionship' },
  emergency: { emoji: '🚨', label: 'Emergency' },
  other: { emoji: '📌', label: 'Other' }
};

export const categoryEmojiMap = Object.fromEntries(
  Object.entries(taskCategoryUi).map(([category, config]) => [category, config.emoji])
);

export const taskPriorityUi = {
  low: {
    label: 'Low',
    badgeClass: 'bg-[#dfe9e2] text-[#1c382a] border-[#b9cdbc]'
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-[#fef3c7] text-[#854d0e] border-[#facc15]'
  },
  high: {
    label: 'High',
    badgeClass: 'bg-[#ffedd5] text-[#9a3412] border-[#f97316]'
  },
  emergency: {
    label: 'Emergency',
    badgeClass: 'bg-[#fee2e2] text-[#991b1b] border-[#ef4444]'
  }
};

export const priorityColorMap = Object.fromEntries(
  Object.entries(taskPriorityUi).map(([priority, config]) => [priority, config.badgeClass])
);

export const getTaskCategoryUi = (category = 'other') => (
  taskCategoryUi[category] || taskCategoryUi.other
);

export const getTaskPriorityUi = (priority = 'medium') => (
  taskPriorityUi[priority] || taskPriorityUi.medium
);

export const formatTaskCategory = (category) => {
  const config = getTaskCategoryUi(category);
  return `${config.emoji} ${config.label}`;
};
