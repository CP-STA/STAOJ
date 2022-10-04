// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { browser } from '$app/env';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: 'AIzaSyAx7IuEW24_yQDmJZ_h1U0VOkZbxXWz1ho',
	authDomain: 'staoj-backend-testing.firebaseapp.com',
	projectId: 'staoj-backend-testing',
	storageBucket: 'staoj-backend-testing.appspot.com',
	messagingSenderId: '814273570261',
	appId: '1:814273570261:web:595a3129fe93ac3682c95c'
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
