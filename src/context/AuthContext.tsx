import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, ExamSubmission } from '../types';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  currentUser: AppUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAccountBlocked: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateName: (newName: string) => Promise<void>;
  recordWatchVideo: (videoId: string) => Promise<boolean>;
  recordExamSubmission: (examId: string, examTitle: string, score: number, totalQuestions: number, passed: boolean) => Promise<void>;
  needsNamePrompt: boolean;
  setNeedsNamePrompt: (val: boolean) => void;
}

const LOCAL_STUDENT_KEY = 'alpha_active_student_session';
const LOCAL_PROFILE_KEY = 'alpha_active_student_profile';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization from localStorage for instant, zero-flicker persistent session
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STUDENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppUser;
        if (parsed && parsed.uid) return parsed;
      }
    } catch {}
    return null;
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_PROFILE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        if (parsed && parsed.id) return parsed;
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [needsNamePrompt, setNeedsNamePrompt] = useState(false);
  const [isAccountBlocked, setIsAccountBlocked] = useState(false);

  // Helper to sync user profile into Firestore and keep localStorage updated
  const syncUserToFirestore = async (user: User | AppUser, desiredName?: string, password?: string) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      const chosenName = (desiredName || user.displayName || user.email?.split('@')[0] || 'طالب ألفا').trim();

      if (!snap.exists()) {
        const newProfile: UserProfile = {
          id: user.uid,
          name: chosenName,
          email: user.email || '',
          password: password || '',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isBanned: false,
          watchedVideoIds: [],
          completedTestsCount: 0,
          totalScoreSum: 0,
          averageScore: 0,
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProfile));
      } else {
        const existingData = snap.data() as UserProfile;
        if (existingData.isBanned) {
          setIsAccountBlocked(true);
          localStorage.removeItem(LOCAL_STUDENT_KEY);
          localStorage.removeItem(LOCAL_PROFILE_KEY);
          await signOut(auth).catch(() => {});
          setCurrentUser(null);
          setUserProfile(null);
          return;
        }
        const updatedName = desiredName?.trim() || existingData.name || chosenName;
        const updatePayload: any = {
          lastLoginAt: new Date().toISOString(),
          name: updatedName,
          email: user.email || existingData.email || '',
        };
        if (password) updatePayload.password = password;

        await updateDoc(userDocRef, updatePayload);
        const merged = {
          ...existingData,
          name: updatedName,
          lastLoginAt: new Date().toISOString(),
        };
        setUserProfile(merged);
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(merged));
      }
    } catch (err) {
      console.warn('Error syncing user profile in Firestore:', err);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const setupProfileListener = (uid: string) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      const userDocRef = doc(db, 'users', uid);
      unsubscribeProfile = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            // Check if student was explicitly banned by admin
            if (data.isBanned) {
              setIsAccountBlocked(true);
              localStorage.removeItem(LOCAL_STUDENT_KEY);
              localStorage.removeItem(LOCAL_PROFILE_KEY);
              signOut(auth).catch(() => {});
              setCurrentUser(null);
              setUserProfile(null);
              return;
            }
            setUserProfile(data);
            localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(data));
            setIsAccountBlocked(false);
          } else {
            // Document not found in Firestore yet (e.g. slight sync latency)
            // DO NOT wipe the session or log out! Re-sync document if needed:
            const stored = localStorage.getItem(LOCAL_STUDENT_KEY);
            if (stored) {
              try {
                const parsed = JSON.parse(stored) as AppUser;
                if (parsed && parsed.uid === uid) {
                  syncUserToFirestore(parsed).catch(() => {});
                }
              } catch {}
            }
          }
        },
        (error) => {
          console.warn('Profile listener notice:', error);
        }
      );
    };

    // If we already have a stored student session, immediately listen to their profile
    if (currentUser?.uid) {
      setupProfileListener(currentUser.uid);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const sessionUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
        };
        localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(sessionUser));
        setCurrentUser(sessionUser);
        await syncUserToFirestore(fbUser);
        setupProfileListener(fbUser.uid);
      } else {
        // Fallback: If Firebase memory has no user, check persistent localStorage
        const stored = localStorage.getItem(LOCAL_STUDENT_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as AppUser;
            if (parsed && parsed.uid) {
              setCurrentUser(parsed);
              setupProfileListener(parsed.uid);
            }
          } catch (e) {
            console.warn('Session parse note:', e);
          }
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithGoogle = async () => {
    setIsAccountBlocked(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const sessionUser: AppUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
        };
        localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(sessionUser));
        setCurrentUser(sessionUser);
        await syncUserToFirestore(result.user);
        if (!result.user.displayName) {
          setNeedsNamePrompt(true);
        }
      }
    } catch (err: any) {
      console.warn('Google login issue:', err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsAccountBlocked(false);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. First try standard Firebase email authentication
    try {
      const result = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (result.user) {
        await syncUserToFirestore(result.user, undefined, cleanPass);
        const sessionUser: AppUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
        };
        localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(sessionUser));
        setCurrentUser(sessionUser);
        return;
      }
    } catch (fbAuthErr: any) {
      console.warn('Firebase direct signIn note:', fbAuthErr);
    }

    // 2. Seamlessly authenticate against Firestore users collection
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      throw new Error('البريد الإلكتروني غير مسجل، يرجى إنشاء حساب جديد');
    }

    const docSnap = querySnap.docs[0];
    const student = docSnap.data() as UserProfile;

    if (student.isBanned) {
      setIsAccountBlocked(true);
      throw new Error('تم إيقاف هذا الحساب من قِبل إدارة المنصة');
    }

    if (student.password && student.password !== cleanPass) {
      throw new Error('كلمة المرور غير صحيحة، يرجى التأكد والمحاولة مرة أخرى');
    }

    // Update last login timestamp in Firestore
    await updateDoc(doc(db, 'users', docSnap.id), {
      lastLoginAt: new Date().toISOString(),
    });

    const studentUid = student.id || docSnap.id;
    const sessionUser: AppUser = {
      uid: studentUid,
      email: student.email,
      displayName: student.name,
    };
    const updatedProfile: UserProfile = {
      ...student,
      id: studentUid,
      lastLoginAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(sessionUser));
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile));
    setCurrentUser(sessionUser);
    setUserProfile(updatedProfile);
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setIsAccountBlocked(false);
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Verify if email is already registered in Firestore
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const existingSnap = await getDocs(q);
      if (!existingSnap.empty) {
        throw new Error('هذا البريد مسجل مسبقاً، يمكنك تسجيل الدخول به مباشرة');
      }
    } catch (err: any) {
      if (err.message?.includes('مسجل مسبقاً')) {
        throw err;
      }
    }

    // 2. Try standard Firebase account creation
    let firebaseUid: string | null = null;
    try {
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (result.user) {
        firebaseUid = result.user.uid;
        updateProfile(result.user, { displayName: cleanName }).catch(() => {});
      }
    } catch (fbErr: any) {
      console.warn('Firebase direct account creation bypassed or not enabled, registering in platform store:', fbErr);
    }

    // 3. Register student reliably in Firestore users collection
    const studentId = firebaseUid || `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newProfile: UserProfile = {
      id: studentId,
      name: cleanName,
      email: cleanEmail,
      password: cleanPass,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isBanned: false,
      watchedVideoIds: [],
      completedTestsCount: 0,
      totalScoreSum: 0,
      averageScore: 0,
    };

    await setDoc(doc(db, 'users', studentId), newProfile);

    // 4. Set persistent session
    const sessionUser: AppUser = {
      uid: studentId,
      email: cleanEmail,
      displayName: cleanName,
    };
    localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(sessionUser));
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProfile));
    setCurrentUser(sessionUser);
    setUserProfile(newProfile);
  };

  const logout = async () => {
    localStorage.removeItem(LOCAL_STUDENT_KEY);
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    try {
      await signOut(auth);
    } catch (_) {}
    setCurrentUser(null);
    setUserProfile(null);
    setIsAccountBlocked(false);
  };

  const updateName = async (newName: string) => {
    if (!currentUser) return;
    const cleanName = newName.trim();
    if (!cleanName) return;

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: cleanName }).catch(() => {});
      }
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { name: cleanName });

      const updatedUser: AppUser = { ...currentUser, displayName: cleanName };
      localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setUserProfile((prev) => (prev ? { ...prev, name: cleanName } : null));
      setNeedsNamePrompt(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const recordWatchVideo = async (videoId: string): Promise<boolean> => {
    if (!currentUser) return false;
    if (userProfile?.watchedVideoIds?.includes(videoId)) {
      return true;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        watchedVideoIds: arrayUnion(videoId),
      });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      return false;
    }
  };

  const recordExamSubmission = async (
    examId: string,
    examTitle: string,
    score: number,
    totalQuestions: number,
    passed: boolean
  ) => {
    if (!currentUser) return;

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const submission: Omit<ExamSubmission, 'id'> = {
      userId: currentUser.uid,
      userName: userProfile?.name || currentUser.displayName || 'طالب ألفا',
      userEmail: userProfile?.email || currentUser.email || '',
      examId,
      examTitle,
      score,
      totalQuestions,
      percentage,
      passed,
      completedAt: new Date().toISOString(),
    };

    try {
      // 1. Save submission record in Firestore
      await addDoc(collection(db, 'exam_submissions'), submission);

      // 2. Update user profile stats in Firestore
      const currentCount = userProfile?.completedTestsCount || 0;
      const newCount = currentCount + 1;
      const currentSum = userProfile?.totalScoreSum || 0;
      const newSum = currentSum + percentage;
      const newAverage = Math.round(newSum / newCount);

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        completedTestsCount: newCount,
        totalScoreSum: newSum,
        averageScore: newAverage,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'exam_submissions');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAccountBlocked,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateName,
        recordWatchVideo,
        recordExamSubmission,
        needsNamePrompt,
        setNeedsNamePrompt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
