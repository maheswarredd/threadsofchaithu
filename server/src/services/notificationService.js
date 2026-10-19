import Notification from '../models/Notification.js';

export async function createNotification({ recipient = null, targetRole = 'customer', title, message, type = 'general', data = {} }) {
  try {
    const notification = await Notification.create({
      recipient,
      targetRole,
      title,
      message,
      type,
      data
    });
    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}
