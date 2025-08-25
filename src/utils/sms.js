import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// sendSms: calls a Firebase Cloud Function named 'sendSms'
// You must implement this callable on the server side to actually send SMS via a provider (e.g., Twilio).
export const sendSms = async (phoneNumber, message) => {
  try {
    if (!phoneNumber || !message) return { success: false, error: new Error('Missing phone or message') };
    const callable = httpsCallable(functions, 'sendSms');
    const res = await callable({ phoneNumber, message });
    return res?.data || { success: true };
  } catch (error) {
    console.error('sendSms error:', error);
    return { success: false, error };
  }
};
