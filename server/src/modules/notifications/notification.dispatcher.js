const mongoose = require('mongoose');
const notificationService = require('../communication/notifications/notification.service');
const NotificationDispatchLog = require('./notificationDispatchLog.model');

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const VALID_NOTIFICATION_TYPES = ['chat', 'task', 'system'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const serializeError = (err) => err?.message || String(err || 'Unknown notification dispatch error');

const validatePayload = (payload = {}) => {
  if (!payload.userId || !mongoose.Types.ObjectId.isValid(payload.userId)) {
    return 'Valid userId is required';
  }

  if (!VALID_NOTIFICATION_TYPES.includes(payload.type)) {
    return 'Valid notification type is required';
  }

  if (!payload.title || typeof payload.title !== 'string') {
    return 'Notification title is required';
  }

  if (!payload.message || typeof payload.message !== 'string') {
    return 'Notification message is required';
  }

  return null;
};

const logDispatch = async ({ payload, error = null, retryCount, status }) => {
  const logEntry = {
    userId: payload?.userId || null,
    type: payload?.type || null,
    payload,
    error,
    timestamp: new Date(),
    retryCount,
    status
  };

  try {
    await NotificationDispatchLog.create(logEntry);
  } catch (logErr) {
    console.error('Notification dispatch log failed:', {
      ...logEntry,
      logError: serializeError(logErr)
    });
  }
};

const dispatchNotificationSafely = async (payload) => {
  console.log('EMERGENCY PAYLOAD RECEIVED:', payload);

  const validationError = validatePayload(payload);
  if (validationError) {
    await logDispatch({
      payload,
      error: validationError,
      retryCount: 0,
      status: 'FAILED'
    });

    return {
      ok: false,
      error: validationError,
      retryCount: 0,
      validationError: true
    };
  }

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const notification = await notificationService.createNotification(payload);

      if (!notification) {
        throw new Error('Notification service returned no notification');
      }

      await logDispatch({
        payload,
        retryCount: attempt,
        status: 'SUCCESS'
      });

      return {
        ok: true,
        notification,
        retryCount: attempt
      };
    } catch (err) {
      lastError = err;

      if (attempt < MAX_RETRIES) {
        await sleep(BASE_RETRY_DELAY_MS * (2 ** attempt));
      }
    }
  }

  const error = serializeError(lastError);
  await logDispatch({
    payload,
    error,
    retryCount: MAX_RETRIES,
    status: 'FAILED'
  });

  return {
    ok: false,
    error,
    retryCount: MAX_RETRIES
  };
};

module.exports = {
  dispatchNotificationSafely
};
