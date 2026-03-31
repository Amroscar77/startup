importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAa0K3wQVY_hnx6xR0JVlRA7paIB79Cj4k",
  authDomain: "ai-studio-applet-webapp-6e126.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-6e126",
  storageBucket: "ai-studio-applet-webapp-6e126.firebasestorage.app",
  messagingSenderId: "95336338547",
  appId: "1:95336338547:web:18665308800925077f8606"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
