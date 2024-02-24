// Give this file an empty array of importScripts to initialize it if you're not using it yet.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyD0_Y6czXNM6N3cAPYiWMGSqJX779-VP0g",
    authDomain: "eoschatapp.firebaseapp.com",
    projectId: "eoschatapp",
    storageBucket: "eoschatapp.appspot.com",
    messagingSenderId: "528614198164",
    appId: "1:528614198164:web:023f8263ad3cea9ea39d81"
});

const messaging = firebase.messaging();