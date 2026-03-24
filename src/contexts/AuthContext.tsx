import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserProfile } from "../types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: Initializing onAuthStateChanged...");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged fired, user:", firebaseUser?.uid);
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          console.log("AuthContext: Fetching profile for user:", firebaseUser.uid);
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            console.log("AuthContext: Profile found");
            setProfile(docSnap.data() as UserProfile);
          } else {
            console.log("AuthContext: Profile not found, creating default...");
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? "Invitado" : ""),
              email: firebaseUser.email || "",
              photoURL: firebaseUser.photoURL || null,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              palette: "salvia",
              theme: "auto",
              notifications: {
                taskReminder: true,
                taskReminderTime: "08:00",
                habitAlert: true,
                dailySummary: true,
                dailySummaryTime: "21:00",
                weeklyReview: true,
                weeklyReviewDay: "sunday",
                weeklyReviewTime: "19:00",
              },
              role: "user",
              rachaActual: 0,
              focoTotalMinutos: 0,
              ultimaActividad: Date.now(),
              createdAt: Date.now(),
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
            console.log("AuthContext: Default profile created");
          }
        } else {
          console.log("AuthContext: No user authenticated");
          setProfile(null);
        }
      } catch (error) {
        console.error("AuthContext: Auth initialization error:", error);
      } finally {
        console.log("AuthContext: Setting loading to false");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
