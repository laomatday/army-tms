
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
importScripts('./sw.js');

firebase.initializeApp({
  apiKey: "AIzaSyD0NtXfJf3RMaeX79BZzkcLqgBQKHskxlo",
  authDomain: "army-hrm-70615.firebaseapp.com",
  projectId: "army-hrm-70615",
  storageBucket: "army-hrm-70615.firebasestorage.app",
  messagingSenderId: "600287950138",
  appId: "1:600287950138:web:21de7495932c5b5f5acc03"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://lh3.googleusercontent.com/d/1r_FuqN4QJbch0FYXAwX8efW9s0ucreiO=w500'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
