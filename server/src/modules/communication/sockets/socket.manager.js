let ioInstance = null;

const userRoom = (userId) => `user:${userId}`;

const setSocketServer = (io) => {
  ioInstance = io;
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(userRoom(userId)).emit(event, payload);
};

const emitNewMessage = (message) => {
  emitToUser(String(message.receiverId), 'newMessage', message);
};

const emitNotification = (userId, notification) => {
  emitToUser(String(userId), 'newNotification', {
    _id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    conversationId: notification.conversationId,
    groupId: notification.groupId,
    messageId: notification.messageId,
    taskId: notification.taskId,
    callSessionId: notification.callSessionId,
    emergencyId: notification.emergencyId,
    entityType: notification.entityType,
    entityId: notification.entityId,
    fromUserId: notification.fromUserId,
    toUserId: notification.toUserId,
    alertType: notification.alertType,
    taskAction: notification.taskAction,
    task: notification.task,
    senior: notification.senior,
    isRead: notification.isRead,
    createdAt: notification.createdAt
  });
};

const emitMessageDeleted = ({ userId, messageId, chatType, deleteType }) => {
  emitToUser(String(userId), 'message-deleted', {
    messageId: String(messageId),
    userId: String(userId),
    chatType,
    deleteType
  });
};

const emitItemReactionUpdated = ({ message, itemType, updatedBy }) => {
  const payload = {
    itemType,
    itemId: String(message._id),
    reactions: message.reactions || [],
    updatedBy: String(updatedBy)
  };

  emitToUser(String(message.senderId), 'ITEM_REACTION_UPDATED', payload);
  emitToUser(String(message.receiverId), 'ITEM_REACTION_UPDATED', payload);
};

const emitGroupItemReactionUpdated = ({ group, message, updatedBy }) => {
  const payload = {
    itemType: 'groupMessage',
    groupId: String(message.groupId),
    itemId: String(message._id),
    reactions: message.reactions || [],
    updatedBy: String(updatedBy)
  };

  (group.members || []).forEach((member) => {
    emitToUser(String(member.userId?._id || member.userId), 'ITEM_REACTION_UPDATED', payload);
  });
};

const emitGroupUpdated = ({ group, removedUserId }) => {
  if (!group) return;

  const payload = {
    groupId: String(group._id),
    group
  };

  (group.members || []).forEach((member) => {
    emitToUser(String(member.userId?._id || member.userId), 'group-updated', payload);
  });

  if (removedUserId) {
    emitConversationDeleted({
      userId: removedUserId,
      conversationId: group._id,
      chatType: 'group'
    });
  }
};

const emitSeniorLocationUpdated = ({ senior, location }) => {
  if (!senior || !location) return;

  const [lng, lat] = location.coordinates || [];
  const payload = {
    userId: String(senior._id),
    latitude: Number(lat),
    longitude: Number(lng),
    updatedAt: location.lastUpdated || new Date()
  };

  emitToUser(String(senior._id), 'SENIOR_LOCATION_UPDATED', payload);
  (senior.linkedCaregivers || []).forEach((caregiverId) => {
    emitToUser(String(caregiverId), 'SENIOR_LOCATION_UPDATED', payload);
  });
};

const emitSeniorTelemetryUpdated = ({ senior, telemetry }) => {
  if (!senior || !telemetry) return;

  const payload = {
    userId: String(senior._id),
    ...telemetry
  };

  emitToUser(String(senior._id), 'SENIOR_TELEMETRY_UPDATED', payload);
  (senior.linkedCaregivers || []).forEach((caregiverId) => {
    emitToUser(String(caregiverId), 'SENIOR_TELEMETRY_UPDATED', payload);
  });
};

const emitMedicationReminderStatusUpdated = ({ senior, medication, reminder }) => {
  if (!senior || !medication || !reminder) return;

  const payload = {
    seniorId: String(senior._id),
    medicationId: String(medication._id),
    reminder
  };

  emitToUser(String(senior._id), 'MEDICATION_REMINDER_STATUS_UPDATED', payload);
  (senior.linkedCaregivers || []).forEach((caregiverId) => {
    emitToUser(String(caregiverId), 'MEDICATION_REMINDER_STATUS_UPDATED', payload);
  });
};

const emitTaskEvent = ({ userIds = [], event, task }) => {
  if (!event || !task) return;
  userIds.forEach((userId) => {
    emitToUser(String(userId), event, { task });
  });
};

const emitConversationDeleted = ({ userId, conversationId, chatType }) => {
  emitToUser(String(userId), 'conversation-deleted', {
    conversationId: String(conversationId),
    userId: String(userId),
    chatType
  });
};

module.exports = {
  userRoom,
  setSocketServer,
  emitToUser,
  emitNewMessage,
  emitNotification,
  emitMessageDeleted,
  emitItemReactionUpdated,
  emitGroupItemReactionUpdated,
  emitGroupUpdated,
  emitSeniorLocationUpdated,
  emitSeniorTelemetryUpdated,
  emitMedicationReminderStatusUpdated,
  emitTaskEvent,
  emitConversationDeleted
};
