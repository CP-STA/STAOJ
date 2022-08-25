// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { browser } from '$app/env';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: 'AIzaSyCOHc3CptFHnmuSeYL4yLPfnVNeqp7NC-A',
	authDomain: 'staoj-database.firebaseapp.com',
	projectId: 'staoj-database',
	storageBucket: 'staoj-database.appspot.com',
	messagingSenderId: '585343608721',
	appId: '1:585343608721:web:e28b77e70ad93b4f669c30',
	measurementId: 'G-FYHX7X3D4F'
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
if (browser) {
	const appCheck = initializeAppCheck(app, {
		provider: new ReCaptchaV3Provider('6LdXz2shAAAAANnaaEK3VyOkHp4-16jo-c18elp9'),
		isTokenAutoRefreshEnabled: true
	});
}
