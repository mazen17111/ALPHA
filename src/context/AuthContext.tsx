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

// Unified points calculation adhering strictly to user requirements:
// If percentage < 50%: deducts 20 points!
// If percentage === 100%: awards maximum 20 points
// From 50% to 99%: unified points per percentage score range so any student scoring that percentage receives identical points
export function calculateExamPointsEarned(percentage: number): number {
  const p = Math.round(percentage);
  if (p < 50) {
    return -20; // يخصم منه تلقائياً 20 نقطة لأي درجة أقل من 50%
  }
  if (p >= 100) {
    return 20; // أعلى درجة ممكن يأخذها هي 20 نقطة في الاختبار عند 100%
  }
  if (p >= 95) return 18;
  if (p >= 90) return 15;
  if (p >= 85) return 12;
  if (p >= 80) return 10;
  if (p >= 75) return 8;
  if (p >= 70) return 6;
  if (p >= 65) return 4;
  if (p >= 60) return 3;
  if (p >= 55) return 2;
  return 1; // 50% إلى 54%
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
      // Check if this student account was permanently deleted by admin
      const deletedUidSnap = await getDoc(doc(db, 'deleted_users', user.uid));
      let isAccountDeleted = deletedUidSnap.exists();
      if (!isAccountDeleted && user.email) {
        const deletedEmailSnap = await getDoc(doc(db, 'deleted_users', user.email.trim().toLowerCase()));
        isAccountDeleted = deletedEmailSnap.exists();
      }

      if (isAccountDeleted) {
        setIsAccountBlocked(true);
        localStorage.removeItem(LOCAL_STUDENT_KEY);
        localStorage.removeItem(LOCAL_PROFILE_KEY);
        await signOut(auth).catch(() => {});
        setCurrentUser(null);
        setUserProfile(null);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      const chosenName = (desiredName || user.displayName || user.email?.split('@')[0] || 'طالب ألفا').trim();

      if (!snap.exists()) {
        // Also check if an account with this email already exists under a different doc ID
        let existingDocByEmail: any = null;
        if (user.email) {
          const q = query(collection(db, 'users'), where('email', '==', user.email.trim().toLowerCase()));
          const existingSnap = await getDocs(q);
          if (!existingSnap.empty) {
            existingDocByEmail = existingSnap.docs[0];
          }
        }

        if (existingDocByEmail) {
          const exData = existingDocByEmail.data() as UserProfile;
          const merged: UserProfile = {
            ...exData,
            id: user.uid,
            name: desiredName || exData.name || chosenName,
            password: password || exData.password || '',
            lastLoginAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, merged);
          setUserProfile(merged);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(merged));
          return;
        }

        const newProfile: UserProfile = {
          id: user.uid,
          name: chosenName,
          email: user.email ? user.email.trim().toLowerCase() : '',
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
        const resolvedPassword = password || existingData.password || '';

        const updatePayload: any = {
          lastLoginAt: new Date().toISOString(),
          name: updatedName,
          email: user.email ? user.email.trim().toLowerCase() : (existingData.email || ''),
        };
        if (resolvedPassword) {
          updatePayload.password = resolvedPassword;
        }

        await updateDoc(userDocRef, updatePayload);
        const merged: UserProfile = {
          ...existingData,
          name: updatedName,
          password: resolvedPassword,
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
            // Check if student was explicitly deleted or banned by admin
            if (data.isBanned || (data as any).isDeleted) {
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
            // Student account was deleted from Firestore by Admin!
            // Requirement: "أول حاجة، خليني أقدر أحذف حساب الطالب حتى وهو مسجل دخوله في المنصة"
            setIsAccountBlocked(true);
            localStorage.removeItem(LOCAL_STUDENT_KEY);
            localStorage.removeItem(LOCAL_PROFILE_KEY);
            signOut(auth).catch(() => {});
            setCurrentUser(null);
            setUserProfile(null);
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

    if (!cleanEmail) {
      throw new Error('يرجى إدخال البريد الإلكتروني');
    }
    if (!cleanPass) {
      throw new Error('يرجى إدخال كلمة المرور');
    }

    // Check if this account was deleted by admin
    const deletedSnap = await getDoc(doc(db, 'deleted_users', cleanEmail));
    if (deletedSnap.exists()) {
      setIsAccountBlocked(true);
      throw new Error('تم حذف هذا الحساب نهائياً بواسطة إدارة المنصة ولا يمكن استخدامه مجدداً');
    }

    // 1. Search for the student in Firestore users collection
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const querySnap = await getDocs(q);

    let matchedDoc: any = null;
    let studentData: UserProfile | null = null;

    if (!querySnap.empty) {
      matchedDoc = querySnap.docs[0];
      studentData = matchedDoc.data() as UserProfile;
    } else {
      // Fallback: check all users case-insensitively in case of casing mismatch
      const allUsersSnap = await getDocs(collection(db, 'users'));
      for (const d of allUsersSnap.docs) {
        const dData = d.data() as UserProfile;
        if (dData.email && dData.email.trim().toLowerCase() === cleanEmail) {
          matchedDoc = d;
          studentData = dData;
          break;
        }
      }
    }

    if (!studentData || !matchedDoc) {
      // 1. Try Firebase Auth in case student was registered via Auth directly
      try {
        const fbRes = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        if (fbRes.user) {
          await syncUserToFirestore(fbRes.user, fbRes.user.displayName || cleanEmail.split('@')[0], cleanPass);
          return;
        }
      } catch (_) {}

      // 2. Seamless auto-registration for new students:
      // If student enters email & password on login, create account smoothly without error!
      if (cleanPass.length < 4) {
        throw new Error('كلمة المرور يجب ألا تقل عن 4 خانات');
      }

      const studentId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const usernamePart = cleanEmail.split('@')[0];
      const derivedName = usernamePart
        .replace(/[._-]+/g, ' ')
        .replace(/\d+/g, '')
        .trim() || usernamePart;

      const newProfile: UserProfile = {
        id: studentId,
        name: derivedName,
        email: cleanEmail,
        password: cleanPass,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isBanned: false,
        watchedVideoIds: [],
        completedTestsCount: 0,
        totalScoreSum: 0,
        averageScore: 0,
        points: 0,
      };

      await setDoc(doc(db, 'users', studentId), newProfile);

      // Also try Firebase account creation in background
      try {
        const fbReg = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        if (fbReg.user) {
          updateProfile(fbReg.user, { displayName: derivedName }).catch(() => {});
        }
      } catch (_) {}

      const sessionUser: AppUser = {
        uid: studentId,
        email: cleanEmail,
        displayName: derivedName,
      };
      localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(sessionUser));
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProfile));
      setCurrentUser(sessionUser);
      setUserProfile(newProfile);
      setNeedsNamePrompt(true);
      return;
    }

    if (studentData.isBanned) {
      setIsAccountBlocked(true);
      throw new Error('تم إيقاف هذا الحساب من قِبل إدارة المنصة');
    }

    // STRICT PASSWORD VERIFICATION:
    // If student has a password, it MUST match the exact password created during registration!
    if (studentData.password) {
      if (studentData.password !== cleanPass) {
        throw new Error('كلمة المرور غير صحيحة، يرجى كتابة نفس كلمة المرور التي تم إنشاؤها أثناء التسجيل');
      }
    } else {
      // Legacy user without stored password: check Firebase Auth
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      } catch (fbAuthErr: any) {
        if (fbAuthErr.code === 'auth/wrong-password' || fbAuthErr.code === 'auth/invalid-credential') {
          throw new Error('كلمة المرور غير صحيحة، يرجى التأكد من كلمة المرور');
        }
      }
      // Save password for future logins
      await updateDoc(doc(db, 'users', matchedDoc.id), { password: cleanPass });
    }

    // Also attempt Firebase Auth sign-in to sync session tokens if account exists in Auth
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
    } catch (_) {}

    // Update last login timestamp in Firestore
    await updateDoc(doc(db, 'users', matchedDoc.id), {
      lastLoginAt: new Date().toISOString(),
    });

    const studentUid = studentData.id || matchedDoc.id;
    const sessionUser: AppUser = {
      uid: studentUid,
      email: studentData.email,
      displayName: studentData.name,
    };
    const updatedProfile: UserProfile = {
      ...studentData,
      id: studentUid,
      password: studentData.password || cleanPass,
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

    if (!cleanName) throw new Error('يرجى كتابة اسم الطالب الكامل');
    if (!cleanEmail) throw new Error('يرجى إدخال البريد الإلكتروني');
    if (!cleanPass) throw new Error('يرجى إدخال كلمة المرور');
    if (cleanPass.length < 4) throw new Error('يجب ألا تقل كلمة المرور عن 4 أحرف أو أرقام');

    // Check if account was deleted by admin
    const deletedSnap = await getDoc(doc(db, 'deleted_users', cleanEmail));
    if (deletedSnap.exists()) {
      throw new Error('هذا الحساب محذوف من قِبل إدارة المنصة ولا يمكن إعادة التسجيل بهذا البريد');
    }

    // 1. Verify if email is already registered in Firestore
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const existingSnap = await getDocs(q);
      if (!existingSnap.empty) {
        throw new Error('هذا البريد مسجل مسبقاً، يمكنك التبديل لتسجيل الدخول به مباشرة');
      }

      const allUsersSnap = await getDocs(collection(db, 'users'));
      for (const d of allUsersSnap.docs) {
        const uData = d.data() as UserProfile;
        if (uData.email && uData.email.trim().toLowerCase() === cleanEmail) {
          throw new Error('هذا البريد مسجل مسبقاً، يمكنك التبديل لتسجيل الدخول به مباشرة');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('مسجل مسبقاً')) {
        throw err;
      }
    }

    // 2. Register student reliably in Firestore users collection FIRST
    const studentId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newProfile: UserProfile = {
      id: studentId,
      name: cleanName,
      email: cleanEmail,
      password: cleanPass, // Stored with 100% certainty!
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isBanned: false,
      watchedVideoIds: [],
      completedTestsCount: 0,
      totalScoreSum: 0,
      averageScore: 0,
    };

    await setDoc(doc(db, 'users', studentId), newProfile);

    // 3. Also try Firebase account creation in background
    try {
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (result.user) {
        updateProfile(result.user, { displayName: cleanName }).catch(() => {});
      }
    } catch (fbErr: any) {
      console.warn('Firebase direct account creation note:', fbErr);
    }

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

    // Optimistically update local state immediately so stats reflect it in 0ms
    const updatedWatched = Array.from(new Set([...(userProfile?.watchedVideoIds || []), videoId]));
    setUserProfile((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        watchedVideoIds: updatedWatched,
      };
      try {
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

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

      // Exact points formula per user specification:
      // Percentage >= 50%: awards points according to score up to max 20 points at 100%
      // Percentage < 50%: deducts 20 points!
      const pointsDelta = calculateExamPointsEarned(percentage);
      const currentPoints = userProfile?.points ?? 0;
      const newPoints = Math.max(0, currentPoints + pointsDelta);

      // Optimistically update local userProfile immediately
      setUserProfile((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          completedTestsCount: newCount,
          totalScoreSum: newSum,
          averageScore: newAverage,
          points: newPoints,
        };
        try {
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      const targetDocId = userProfile?.id || currentUser.uid;
      const userDocRef = doc(db, 'users', targetDocId);
      await updateDoc(userDocRef, {
        completedTestsCount: newCount,
        totalScoreSum: newSum,
        averageScore: newAverage,
        points: newPoints,
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
