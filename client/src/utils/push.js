import { notificationsAPI } from '../services/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (error) {
    console.warn('Service worker registration failed:', error.message);
    return null;
  }
}

export async function getPushRegistration() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/') || await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

export async function subscribeToPush() {
  if (!isPushSupported()) throw new Error('Push notifications are not supported in this browser.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const registration = await registerServiceWorker();
  const readyRegistration = registration || (await getPushRegistration());
  if (!readyRegistration) throw new Error('Service worker is not ready.');

  const { data } = await notificationsAPI.getPushKey();
  if (!data?.configured || !data?.publicKey) {
    throw new Error('Browser push is not configured on the server yet.');
  }

  let subscription = await readyRegistration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey)
    });
  }

  await notificationsAPI.subscribePush(subscription.toJSON());
  return subscription;
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;
  const registration = await getPushRegistration();
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await notificationsAPI.unsubscribePush({ endpoint: subscription.endpoint });
  } catch {}
  try {
    await subscription.unsubscribe();
  } catch {}
}

export async function getPushStatus() {
  if (!isPushSupported()) return { supported: false, subscribed: false, permission: Notification.permission };
  try {
    const registration = await getPushRegistration();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    const { data } = await notificationsAPI.getPushStatus();
    return {
      supported: true,
      subscribed: Boolean(subscription),
      permission: Notification.permission,
      configured: data?.configured,
      subscriptions: data?.subscriptions
    };
  } catch {
    return { supported: true, subscribed: false, permission: Notification.permission };
  }
}
