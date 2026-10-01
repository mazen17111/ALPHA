import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { LiveStreamBanner } from './components/LiveStreamBanner';
import { DashboardBlocks } from './components/DashboardBlocks';
import { MyStatsBlock } from './components/MyStatsBlock';
import { VideosSection } from './components/VideosSection';
import { FilesSection } from './components/FilesSection';
import { ExamsSection } from './components/ExamsSection';
import { FoldersSection } from './components/FoldersSection';
import { AdminPanel } from './components/AdminPanel';
import { AdminLoginModal } from './components/AdminLoginModal';
import { NamePromptModal } from './components/NamePromptModal';
import { CustomBlockSection } from './components/CustomBlockSection';
import { LockScreen } from './components/LockScreen';
import { Footer } from './components/Footer';
import {
  VideoItem,
  FileResource,
  Exam,
  StudentFolder,
  CustomBlock,
  LiveStreamConfig,
  ExamSubmission,
  UserProfile,
  PlatformLockConfig,
} from './types';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { checkAndSeedInitialData } from './seedData';
import { motion } from 'motion/react';
import { Sparkles, ShieldAlert, LogOut } from 'lucide-react';
import { AnimatedButton } from './components/AnimatedButton';
import alphaLogo from './assets/images/alpha_logo_1790678223903.jpg';

function MainAppContent() {
  const { currentUser, userProfile, loading, isAccountBlocked, logout } = useAuth();
  const { theme } = useTheme();

  // Firestore Real-time states
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [files, setFiles] = useState<FileResource[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentFolders, setStudentFolders] = useState<StudentFolder[]>([]);
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([]);
  const [liveStream, setLiveStream] = useState<LiveStreamConfig | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<ExamSubmission[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [platformLock, setPlatformLock] = useState<PlatformLockConfig>({
    isLocked: false,
    lockType: 'maintenance',
    whitelistedStudentIds: [],
    blacklistedStudentIds: [],
    lockTitle: '',
    lockMessage: '',
    updatedAt: new Date().toISOString(),
  });

  // Navigation and active view
  const [activeView, setActiveView] = useState<'dashboard' | 'videos' | 'files' | 'exams' | 'folders' | 'customBlock'>('dashboard');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [selectedCustomBlock, setSelectedCustomBlock] = useState<CustomBlock | null>(null);

  // Admin state
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);

  // Seed check on mount
  useEffect(() => {
    checkAndSeedInitialData();
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    // 1. Videos
    const unsubVideos = onSnapshot(
      collection(db, 'videos'),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VideoItem));
        setVideos(items);
      },
      (error) => console.warn('Videos sync notice:', error)
    );

    // 2. Files
    const unsubFiles = onSnapshot(
      collection(db, 'files'),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FileResource));
        setFiles(items);
      },
      (error) => console.warn('Files sync notice:', error)
    );

    // 3. Exams
    const unsubExams = onSnapshot(
      collection(db, 'exams'),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
        setExams(items);
      },
      (error) => console.warn('Exams sync notice:', error)
    );

    // 4. Custom Blocks (المستطيلات الإضافية)
    const unsubCustomBlocks = onSnapshot(
      collection(db, 'custom_blocks'),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomBlock));
        setCustomBlocks(items);
      },
      (error) => console.warn('Blocks sync notice:', error)
    );

    // 5. Live Stream configuration
    const unsubLive = onSnapshot(
      doc(db, 'live_stream', 'current'),
      (snap) => {
        if (snap.exists()) {
          setLiveStream(snap.data() as LiveStreamConfig);
        } else {
          setLiveStream(null);
        }
      },
      (error) => console.warn('Live stream sync notice:', error)
    );

    // 6. Platform Access Lock Configuration (قفل المنصة)
    const unsubLock = onSnapshot(
      doc(db, 'settings', 'platform_lock'),
      (snap) => {
        if (snap.exists()) {
          setPlatformLock(snap.data() as PlatformLockConfig);
        }
      },
      (error) => console.warn('Platform lock sync notice:', error)
    );

    return () => {
      unsubVideos();
      unsubFiles();
      unsubExams();
      unsubCustomBlocks();
      unsubLive();
      unsubLock();
    };
  }, []);

  // Performance Optimization: Only load and listen to full students list when Admin Panel is open
  useEffect(() => {
    if (!isAdminOpen) return;
    const unsubStudents = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
        setAllStudents(items);
      },
      (error) => console.warn('Users sync notice:', error)
    );

    return () => {
      unsubStudents();
    };
  }, [isAdminOpen]);

  // Listeners for Current User's Specific Folders & Submissions
  useEffect(() => {
    if (!currentUser) {
      setStudentFolders([]);
      setRecentSubmissions([]);
      return;
    }

    const qFolders = query(
      collection(db, 'student_folders'),
      where('userId', '==', currentUser.uid)
    );
    const unsubFolders = onSnapshot(
      qFolders,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentFolder));
        setStudentFolders(items);
      },
      (error) => console.warn('Folders sync notice:', error)
    );

    const qSubmissions = query(
      collection(db, 'exam_submissions'),
      where('userId', '==', currentUser.uid)
    );
    const unsubSubmissions = onSnapshot(
      qSubmissions,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExamSubmission));
        items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        setRecentSubmissions(items);
      },
      (error) => console.warn('Submissions sync notice:', error)
    );

    return () => {
      unsubFolders();
      unsubSubmissions();
    };
  }, [currentUser]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-amber-400 shadow-2xl shadow-amber-500/40 p-0.5 bg-black ring-4 ring-amber-500/20 mb-5"
        >
          <img
            src={alphaLogo}
            alt="شعار منصة ALPHA"
            className="w-full h-full object-cover rounded-[22px]"
          />
        </motion.div>
        <h2 className="text-2xl font-black bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
          منصة ALPHA التعليمية
        </h2>
        <p className="text-xs text-zinc-400 mt-1 font-medium">جاري تحميل البيانات وتجهيز تجربة التعلم...</p>
      </div>
    );
  }

  // Evaluate if platform is locked for the current student
  const getStudentLockState = (): {
    isLocked: boolean;
    reason: 'maintenance' | 'subscription' | 'banned';
    message?: string;
  } => {
    // If Admin mode is currently opened via password: NEVER locked!
    if (isAdminOpen) {
      return { isLocked: false, reason: 'maintenance' };
    }

    // 1. Account blocked / deleted by admin specifically for this student
    if (isAccountBlocked || userProfile?.isBanned) {
      return {
        isLocked: true,
        reason: 'banned',
        message: 'عذراً، لقد تم إيقاف أو حذف هذا الحساب من قِبل إدارة منصة ALPHA.',
      };
    }

    // 2. Individual student lock explicitly set on userProfile by admin
    if (userProfile?.isLocked) {
      const resolvedReason =
        userProfile.lockReason === 'subscription' ? 'subscription' : 'maintenance';
      return {
        isLocked: true,
        reason: resolvedReason,
        message: userProfile.lockMessage,
      };
    }

    // 3. Global platform lock evaluation
    if (currentUser) {
      const studentId = currentUser.uid;

      if (platformLock.isLocked) {
        // Platform is locked for all, EXCEPT whitelisted students
        const isWhitelisted = platformLock.whitelistedStudentIds?.includes(studentId);
        if (!isWhitelisted) {
          return {
            isLocked: true,
            reason: platformLock.lockType || 'maintenance',
            message: platformLock.lockMessage,
          };
        }
      } else {
        // Platform is open for all, EXCEPT blacklisted students
        const isBlacklisted = platformLock.blacklistedStudentIds?.includes(studentId);
        if (isBlacklisted) {
          return {
            isLocked: true,
            reason: platformLock.lockType || 'subscription',
            message: platformLock.lockMessage,
          };
        }
      }
    }

    return { isLocked: false, reason: 'maintenance' };
  };

  const studentLock = getStudentLockState();

  // If Admin Mode is Open directly
  if (isAdminOpen) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 dark:bg-zinc-950 light:bg-[#fcfbf9] text-zinc-100 dark:text-zinc-100 light:text-zinc-900 transition-colors duration-200">
        <Navbar
          activeTab="dashboard"
          setActiveTab={() => {
            setIsAdminOpen(false);
            setActiveView('dashboard');
          }}
          onLogoClick={() => {
            setIsAdminOpen(false);
            setActiveView('dashboard');
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          }}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminPanel
            videos={videos}
            files={files}
            exams={exams}
            customBlocks={customBlocks}
            liveStream={liveStream}
            students={allStudents}
            platformLock={platformLock}
            onExitAdmin={() => setIsAdminOpen(false)}
          />
        </main>
        <Footer onAdminClick={() => setIsAdminPasswordModalOpen(true)} />
      </div>
    );
  }

  // Account / Platform Blocked Screen for students
  if (studentLock.isLocked) {
    return (
      <>
        <LockScreen
          reason={studentLock.reason}
          customMessage={studentLock.message}
          onLogout={logout}
          onAdminClick={() => setIsAdminPasswordModalOpen(true)}
        />
        <AdminLoginModal
          isOpen={isAdminPasswordModalOpen}
          onClose={() => setIsAdminPasswordModalOpen(false)}
          onSuccess={() => {
            setIsAdminPasswordModalOpen(false);
            setIsAdminOpen(true);
          }}
        />
      </>
    );
  }

  // If still loading session and not logged in yet
  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-amber-400">
        <div className="flex flex-col items-center gap-3">
          <img src={alphaLogo} alt="Alpha" className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 animate-pulse" />
          <span className="text-xs font-bold text-zinc-400">جاري استرجاع جلستك المحفوظة...</span>
        </div>
      </div>
    );
  }

  // Not Logged In -> Show Landing Page
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 dark:bg-zinc-950 light:bg-[#fcfbf9] text-zinc-100 dark:text-zinc-100 light:text-zinc-900 transition-colors duration-200">
        <Navbar
          onLogoClick={() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          }}
        />
        <main className="flex-1">
          <LandingPage />
        </main>
        
        {/* Footer placed at the end of the platform with 2-click admin access */}
        <Footer onAdminClick={() => setIsAdminPasswordModalOpen(true)} />

        <AdminLoginModal
          isOpen={isAdminPasswordModalOpen}
          onClose={() => setIsAdminPasswordModalOpen(false)}
          onSuccess={() => {
            setIsAdminPasswordModalOpen(false);
            setIsAdminOpen(true);
          }}
        />
      </div>
    );
  }

  // Logged In -> Student / Admin Interface
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 dark:bg-zinc-950 light:bg-[#fcfbf9] text-zinc-100 dark:text-zinc-100 light:text-zinc-900 transition-colors duration-200">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeView}
        setActiveTab={(t) => {
          setIsAdminOpen(false);
          setActiveExam(null);
          setSelectedCustomBlock(null);
          setActiveView(t === 'home' ? 'dashboard' : (t as any));
        }}
        onLogoClick={() => {
          setIsAdminOpen(false);
          setActiveExam(null);
          setSelectedCustomBlock(null);
          setActiveView('dashboard');
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* If Admin Mode is Open */}
        {isAdminOpen ? (
          <AdminPanel
            videos={videos}
            files={files}
            exams={exams}
            customBlocks={customBlocks}
            liveStream={liveStream}
            students={allStudents}
            platformLock={platformLock}
            onExitAdmin={() => setIsAdminOpen(false)}
          />
        ) : (
          /* Student Experience */
          <div>
            {/* Live Stream Banner (المستطيل الأخضر) */}
            <LiveStreamBanner streamConfig={liveStream} />

            {/* Dashboard OR Specific Section */}
            {activeView === 'dashboard' && (
              <div>
                {/* Greeting */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 text-right">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                      أهلاً بك، {userProfile?.name || 'طالب ألفا'}!
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                      اختر قسماً من الأقسام الأربعة لبدء رحلتك ومتابعة تقدمك نحو المئوية 100%
                    </p>
                  </div>

                  <div className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>أقسام الفا طريقك للمئوية</span>
                  </div>
                </div>

                {/* The 4 Rectangles: الفيديوهات، الملفات، الاختبارات، مجلداتي + الأقسام الإضافية */}
                <DashboardBlocks
                  onSelectBlock={(b) => {
                    setActiveView(b as any);
                  }}
                  activeBlock={activeView}
                  videosCount={videos.length}
                  filesCount={files.length}
                  examsCount={exams.filter((e) => !e.customBlockId).length}
                  foldersCount={studentFolders.length}
                  customBlocks={customBlocks}
                  onOpenCustomBlock={(block) => {
                    setSelectedCustomBlock(block);
                    setActiveView('customBlock');
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  }}
                />

                {/* المستطيل الكبير "إحصائياتي" */}
                <MyStatsBlock
                  userProfile={userProfile}
                  recentSubmissions={recentSubmissions}
                  totalVideosCount={videos.length}
                />
              </div>
            )}

            {/* Detail Section: Videos */}
            {activeView === 'videos' && (
              <VideosSection
                videos={videos}
                allFiles={files}
                allExams={exams}
                onStartExam={(exam) => {
                  setActiveExam(exam);
                  setActiveView('exams');
                }}
                onBack={() => setActiveView('dashboard')}
              />
            )}

            {/* Detail Section: Files */}
            {activeView === 'files' && (
              <FilesSection
                files={files}
                onBack={() => setActiveView('dashboard')}
              />
            )}

            {/* Detail Section: Exams with Folder Bookmark */}
            {activeView === 'exams' && (
              <ExamsSection
                exams={exams.filter((e) => !e.customBlockId)}
                studentFolders={studentFolders}
                activeExamToTake={activeExam}
                onClearActiveExam={() => setActiveExam(null)}
                onBack={() => {
                  setActiveExam(null);
                  setActiveView('dashboard');
                }}
              />
            )}

            {/* Detail Section: Folders */}
            {activeView === 'folders' && (
              <FoldersSection
                folders={studentFolders}
                onTakeFolderExam={(folderExam) => {
                  setActiveExam(folderExam);
                  setActiveView('exams');
                }}
                onBack={() => setActiveView('dashboard')}
              />
            )}

            {/* Detail Section: Custom Block (الملحق) - First Class Integrated Section */}
            {activeView === 'customBlock' && selectedCustomBlock && (
              <CustomBlockSection
                block={selectedCustomBlock}
                allVideos={videos}
                allFiles={files}
                allExams={exams}
                onStartExam={(exam) => {
                  setActiveExam(exam);
                  setActiveView('exams');
                }}
                onBack={() => {
                  setSelectedCustomBlock(null);
                  setActiveView('dashboard');
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Secret Clickable Footer - Fixed at bottom, 2 clicks to open */}
      <Footer onAdminClick={() => setIsAdminPasswordModalOpen(true)} />

      {/* Admin Login Modal (password: ishhd882gk#) */}
      <AdminLoginModal
        isOpen={isAdminPasswordModalOpen}
        onClose={() => setIsAdminPasswordModalOpen(false)}
        onSuccess={() => {
          setIsAdminPasswordModalOpen(false);
          setIsAdminOpen(true);
        }}
      />

      {/* Name prompt for Google users */}
      <NamePromptModal />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
