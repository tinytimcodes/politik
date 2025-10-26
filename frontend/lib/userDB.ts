import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type OnboardingData = {
  fullName?: string;
  state?: string;
  zip?: string;
  interests?: string[];
  newsPreferences?: string[];
};

export async function saveOnboardingStep(uid: string, data: Partial<OnboardingData>) {
  await setDoc(
    doc(db, "users", uid),
    {
      ...data,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function completeOnboarding(uid: string) {
  await setDoc(
    doc(db, "users", uid),
    { onboarded: true, onboardedAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true }
  );
}
