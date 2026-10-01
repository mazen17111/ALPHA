export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: string;
  lastLoginAt?: string;
  isBanned?: boolean;
  isLocked?: boolean; // قفل الحساب للطالب الفردي
  lockReason?: 'maintenance' | 'subscription' | 'admin_action' | null; // سبب القفل
  lockMessage?: string;
  watchedVideoIds: string[];
  completedTestsCount: number;
  totalScoreSum: number;
  averageScore: number;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  url: string;
  isUploadedFile?: boolean;
  duration?: string;
  thumbnailUrl?: string;
  linkedFileIds?: string[];
  linkedExamIds?: string[];
  customBlockId?: string | null; // إذا كان مخصصاً لملحق معين
  createdAt: string;
}

export interface FileResource {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  isUploadedFile?: boolean;
  fileType: string;
  category?: string;
  size?: string;
  customBlockId?: string | null; // إذا كان مخصصاً لملحق معين
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  notes?: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  examType?: 'external' | 'platform';
  passingPercentage?: number; // نسبة النجاح
  externalExamUrl?: string; // رابط الاختبار الخارجي الكامل
  linkedVideoId?: string | null; // ربط الاختبار بفيديو معين
  customBlockId?: string | null; // إذا تم إسناده لملحق معين يختفي من قسم الاختبارات العام
  questions: Question[];
  category?: string;
  createdAt: string;
}

export interface StudentFolder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  questions: Question[];
  createdAt: string;
}

export interface ExamSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  examId: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed?: boolean;
  completedAt: string;
}

export interface CustomBlockItem {
  id: string;
  title: string;
  url: string;
  type?: string;
  description?: string;
  isUploadedFile?: boolean;
}

export interface CustomBlock {
  id: string;
  title: string;
  description: string;
  badge?: string;
  icon?: string;
  content?: string;
  linkUrl?: string;
  color?: string;
  linkedVideoIds?: string[];
  linkedFileIds?: string[];
  linkedExamIds?: string[];
  directVideos?: CustomBlockItem[];
  directFiles?: CustomBlockItem[];
  directExams?: CustomBlockItem[];
  createdAt: string;
}

export interface LiveStreamConfig {
  isActive: boolean;
  title: string;
  streamUrl: string;
  description?: string;
  updatedAt: string;
}

export interface PlatformLockConfig {
  isLocked: boolean; // هل المنصة مقفلة
  lockType: 'maintenance' | 'subscription'; // 'صيانة' أو 'اشتراك'
  lockTitle?: string;
  lockMessage?: string;
  whitelistedStudentIds: string[]; // مسموح لهم بالدخول حتى والمنصة مقفلة عالجميع
  blacklistedStudentIds: string[]; // مقفول عليهم حتى والمنصة مفتوحة للجميع
  updatedAt: string;
}
