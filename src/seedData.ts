import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { VideoItem, FileResource, Exam } from './types';

export async function checkAndSeedInitialData() {
  try {
    const seedRef = doc(db, 'settings', 'seed_status');
    const seedSnap = await getDoc(seedRef);

    // If seed already happened once in this project, do not re-insert deleted items!
    // This strictly respects: "واي شيء احذفه من المنصة لا يعود ابدا"
    if (seedSnap.exists() && seedSnap.data()?.seeded === true) {
      return;
    }

    // Check if videos collection has any documents
    const videosSnap = await getDocs(collection(db, 'videos'));
    if (!videosSnap.empty) {
      // Mark as seeded so we never overwrite user's deleted items
      await setDoc(seedRef, { seeded: true, timestamp: new Date().toISOString() });
      return;
    }

    // 1. Initial Files
    const initialFiles: Omit<FileResource, 'id'>[] = [
      {
        title: 'مذكرة القوانين الذهبية الشاملة - طريقك للمئوية',
        description: 'ملخص شامل لأهم القواعد والقوانين الرياضية مع أمثلة محلولة وطرق الحل السريع.',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType: 'PDF',
        category: 'ملخصات شاملة',
        size: '2.4 MB',
        createdAt: new Date().toISOString(),
      },
      {
        title: 'بنك أسئلة وتجميعات ألفا للتدريب المكثف',
        description: 'تجميعة أسئلة النماذج السابقة مع مفاتيح الإجابة ونماذج تدريبية وافية.',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType: 'مذكرة تدريب',
        category: 'تجميعات',
        size: '4.1 MB',
        createdAt: new Date().toISOString(),
      },
    ];

    const fileIds: string[] = [];
    for (const f of initialFiles) {
      const docRef = await addDoc(collection(db, 'files'), f);
      fileIds.push(docRef.id);
    }

    // 2. Initial Exam with Question Image
    const initialExam: Omit<Exam, 'id'> = {
      title: 'اختبار تشخيصي تمهيدي - مستوى متقدم',
      description: 'اختبار قياس سرعة ودقة الحل في المسائل الذهنية والهندسية نحو المئوية.',
      durationMinutes: 15,
      questions: [
        {
          id: 'q_seed_1',
          text: 'إذا كان محيط دائرة يساوي 20π سم، فما هي مساحة هذه الدائرة؟',
          imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
          options: ['50π سم²', '100π سم²', '25π سم²', '200π سم²'],
          correctOptionIndex: 1,
          explanation: 'المحيط = 2 × ط × نق = 20π ، إذن نصف القطر نق = 10 سم. المساحة = ط × نق² = 100π سم².',
        },
        {
          id: 'q_seed_2',
          text: 'اشترى طالب كتاباً وحقيبة بمبلغ 120 ريالاً، فإذا كان سعر الحقيبة ثلاثة أضعاف سعر الكتاب، فما هو سعر الكتاب؟',
          options: ['20 ريالاً', '30 ريالاً', '40 ريالاً', '50 ريالاً'],
          correctOptionIndex: 1,
          explanation: 'نفرض سعر الكتاب س، سعر الحقيبة 3س. س + 3س = 120 => 4س = 120 => س = 30 ريالاً.',
        },
        {
          id: 'q_seed_3',
          text: 'ما قيمة المقدار (2⁴ × 2³) ÷ 2⁵ ؟',
          options: ['2', '4', '8', '16'],
          correctOptionIndex: 1,
          explanation: 'في الضرب نجمع الأسس 4+3=7، وفي القسمة نطرح الأسس 7-5=2. إذن 2² = 4.',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const examDoc = await addDoc(collection(db, 'exams'), initialExam);
    const examId = examDoc.id;

    // 3. Initial Video with linked files & exams
    const initialVideo: Omit<VideoItem, 'id'> = {
      title: 'المحاضرة التأسيسية الأولى: أسرار التميز وحصد المئوية',
      description: 'شرح تفاعلي مكثف لمفاتيح التفوق وطرق التفكير الإبداعي السريع في حل المسائل المعقدة.',
      url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      duration: '45 دقيقة',
      linkedFileIds: fileIds,
      linkedExamIds: [examId],
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'videos'), initialVideo);

    // 4. Default Live Stream record (inactive initially)
    await setDoc(doc(db, 'live_stream', 'current'), {
      isActive: false,
      title: 'بث المراجعة المباشرة لطلاب ألفا',
      streamUrl: 'https://www.youtube.com/watch?v=live_stream_demo',
      description: 'بث مباشر تفاعلي لحل المسائل واستقبال أسئلة الطلاب',
      updatedAt: new Date().toISOString(),
    });

    // Mark as seeded
    await setDoc(seedRef, { seeded: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Initial data check/seed error:', err);
  }
}
