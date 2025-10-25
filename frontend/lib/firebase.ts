import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAnspXb1NxGZptqehFCAloZop6gk_YbJRs",
  authDomain: "politik-547d6.firebaseapp.com",
  projectId: "politik-547d6",
  storageBucket: "politik-547d6.firebasestorage.app",
  messagingSenderId: "315357631277",
  appId: "1:315357631277:web:c4e0dd8c84e62b0d5e39a4",
};

const creating = getApps().length === 0;
const app = creating ? initializeApp(firebaseConfig) : getApp();

export const auth = creating
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export default app;
