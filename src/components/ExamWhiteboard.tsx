import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  Grid,
  Square,
  Sparkles,
  Maximize2,
  Minimize2,
  Download,
  Highlighter,
  Check,
  AlertCircle,
  Lock,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
  isHighlighter?: boolean;
}

interface ExamWhiteboardProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ExamWhiteboard: React.FC<ExamWhiteboardProps> = ({
  className = '',
  isOpen = true,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Tools state - Default to 'plain' (سادة بدون مربعات)
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState<string>('#F59E0B'); // Default gold
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [eraserWidth, setEraserWidth] = useState<number>(20);
  const [backgroundType, setBackgroundType] = useState<'grid' | 'plain'>('plain');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const redoStrokesRef = useRef<Stroke[]>([]);
  const clearedBackupRef = useRef<Stroke[] | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Color palette for student calculations
  const colors = [
    { name: 'ذهبي', value: '#F59E0B' },
    { name: 'أبيض', value: '#FFFFFF' },
    { name: 'أزرق سماوي', value: '#38BDF8' },
    { name: 'أخضر زمردي', value: '#10B981' },
    { name: 'أحمر', value: '#EF4444' },
    { name: 'برتقالي', value: '#F97316' },
  ];

  const strokeSizes = [
    { name: 'رفيع', size: 2 },
    { name: 'متوسط', size: 4 },
    { name: 'عريض', size: 7 },
  ];

  const eraserSizes = [
    { name: 'دقيق', size: 12 },
    { name: 'عريض', size: 28 },
  ];

  // Helper to show temporary feedback
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // Clear the scaled canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw all completed strokes
    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 1) continue;

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else if (stroke.isHighlighter) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 1.0;
      }

      const pts = stroke.points;
      if (pts.length === 1) {
        ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const xc = (pts[i - 1].x + pts[i].x) / 2;
          const yc = (pts[i - 1].y + pts[i].y) / 2;
          ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, []);

  // Resize canvas according to container using ResizeObserver
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    resizeCanvas();

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(wrapper);

    window.addEventListener('resize', resizeCanvas);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas, isExpanded]);

  // Coordinates helper
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Pointer event handlers with smooth drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only main button
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCanvasCoordinates(e);
    currentStrokeRef.current = [pt];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    const effectiveWidth =
      tool === 'eraser' ? eraserWidth : tool === 'highlighter' ? 14 : strokeWidth;
    ctx.lineWidth = effectiveWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
    }

    ctx.arc(pt.x, pt.y, effectiveWidth / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pt = getCanvasCoordinates(e);
    const pts = currentStrokeRef.current;
    pts.push(pt);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (pts.length < 2) return;

    ctx.save();
    ctx.beginPath();
    const effectiveWidth =
      tool === 'eraser' ? eraserWidth : tool === 'highlighter' ? 14 : strokeWidth;
    ctx.lineWidth = effectiveWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
    }

    const prev = pts[pts.length - 2];
    const curr = pts[pts.length - 1];
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if already released
    }

    if (currentStrokeRef.current.length > 0) {
      const effectiveWidth =
        tool === 'eraser' ? eraserWidth : tool === 'highlighter' ? 14 : strokeWidth;

      strokesRef.current.push({
        points: [...currentStrokeRef.current],
        color,
        width: effectiveWidth,
        isEraser: tool === 'eraser',
        isHighlighter: tool === 'highlighter',
      });
      currentStrokeRef.current = [];
      redoStrokesRef.current = []; // Reset redo stack on new stroke
      clearedBackupRef.current = null;
      setCanUndo(true);
      setCanRedo(false);
      redrawCanvas();
    }
  };

  // Clear all with undoable safety
  const handleClear = () => {
    if (strokesRef.current.length === 0) return;
    clearedBackupRef.current = [...strokesRef.current];
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    redrawCanvas();
    showToast('تم مسح السبورة (يمكنك التراجع لاستعادتها)');
  };

  // Undo last stroke or restore cleared board
  const handleUndo = () => {
    if (clearedBackupRef.current && strokesRef.current.length === 0) {
      strokesRef.current = [...clearedBackupRef.current];
      clearedBackupRef.current = null;
      setCanUndo(true);
      redrawCanvas();
      showToast('تمت استعادة المسودة');
      return;
    }

    if (strokesRef.current.length === 0) return;
    const popped = strokesRef.current.pop();
    if (popped) {
      redoStrokesRef.current.push(popped);
    }
    setCanUndo(strokesRef.current.length > 0 || clearedBackupRef.current !== null);
    setCanRedo(redoStrokesRef.current.length > 0);
    redrawCanvas();
  };

  // Redo stroke
  const handleRedo = () => {
    if (redoStrokesRef.current.length === 0) return;
    const restored = redoStrokesRef.current.pop();
    if (restored) {
      strokesRef.current.push(restored);
    }
    setCanUndo(true);
    setCanRedo(redoStrokesRef.current.length > 0);
    redrawCanvas();
  };

  // Download / Save scratchpad snapshot as PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) {
      showToast('السبورة فارغة، اكتب خطوة أولاً لتحميلها');
      return;
    }

    try {
      // Create offscreen canvas with background
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const oCtx = offscreen.getContext('2d');
      if (!oCtx) return;

      // Fill dark background
      oCtx.fillStyle = '#0c0d0e';
      oCtx.fillRect(0, 0, offscreen.width, offscreen.height);

      // If grid, draw grid dots
      if (backgroundType === 'grid') {
        oCtx.fillStyle = '#27272a';
        const dpr = window.devicePixelRatio || 1;
        const step = 20 * dpr;
        for (let x = 0; x < offscreen.width; x += step) {
          for (let y = 0; y < offscreen.height; y += step) {
            oCtx.beginPath();
            oCtx.arc(x, y, 1 * dpr, 0, Math.PI * 2);
            oCtx.fill();
          }
        }
      }

      // Draw the student strokes
      oCtx.drawImage(canvas, 0, 0);

      // Add watermark
      oCtx.fillStyle = '#d97706';
      oCtx.font = 'bold 16px sans-serif';
      oCtx.fillText('منصة ALPHA التعليمية • مسودة حل الاختبار', 20, offscreen.height - 20);

      // Trigger download
      const dataUrl = offscreen.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `مسودة-حل-اختبار-ألفا-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('تم تحميل مسودة الحل بنجاح ✓');
    } catch (err) {
      console.error('Download whiteboard error:', err);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-3xl border-2 border-amber-500/35 bg-zinc-950/95 dark:bg-zinc-950/95 light:bg-zinc-900 text-white shadow-2xl flex flex-col overflow-hidden relative transition-all ${className} ${
        isExpanded ? 'fixed inset-3 sm:inset-6 z-50 shadow-2xl ring-4 ring-amber-500/30' : 'h-[580px] lg:h-[640px]'
      }`}
    >
      {/* Board Header Bar */}
      <div className="p-3 sm:p-4 bg-zinc-900/90 border-b border-amber-500/25 flex flex-wrap items-center justify-between gap-2.5 text-right select-none">
        {/* Title & Badge */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-amber-400">
                سبورة الحل والمسودات
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                تفاعلية
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 hidden sm:block">
              اكتب خطواتك الرياضية واختصر مسوداتك مباشرة أثناء الاختبار
            </p>
          </div>
        </div>

        {/* Board Tools & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Tool: Pen */}
          <button
            type="button"
            onClick={() => setTool('pen')}
            title="قلم للكتابة والحل"
            className={`p-2 rounded-xl transition-all font-bold text-xs flex items-center gap-1 cursor-pointer ${
              tool === 'pen'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span className="hidden sm:inline">القلم</span>
          </button>

          {/* Tool: Highlighter */}
          <button
            type="button"
            onClick={() => setTool('highlighter')}
            title="قلم تحديد وتظليل شفاف"
            className={`p-2 rounded-xl transition-all font-bold text-xs flex items-center gap-1 cursor-pointer ${
              tool === 'highlighter'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden sm:inline">تظليل</span>
          </button>

          {/* Tool: Eraser */}
          <button
            type="button"
            onClick={() => setTool('eraser')}
            title="ممحاة"
            className={`p-2 rounded-xl transition-all font-bold text-xs flex items-center gap-1 cursor-pointer ${
              tool === 'eraser'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">ممحاة</span>
          </button>

          <div className="h-5 w-px bg-zinc-700 mx-0.5" />

          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="تراجع عن آخر خطوة"
            className="p-2 rounded-xl text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 disabled:opacity-25 disabled:hover:text-zinc-300 cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            title="إعادة الخطوة"
            className="p-2 rounded-xl text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 disabled:opacity-25 disabled:hover:text-zinc-300 cursor-pointer transition-all"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Clear Board */}
          <button
            type="button"
            onClick={handleClear}
            disabled={strokesRef.current.length === 0}
            title="مسح السبورة بالكامل"
            className="p-2 rounded-xl text-zinc-300 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-25 cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Background Toggle (Grid vs Plain) */}
          <button
            type="button"
            onClick={() => setBackgroundType((prev) => (prev === 'grid' ? 'plain' : 'grid'))}
            title={backgroundType === 'grid' ? 'تبديل لسبورة بدون شبكة' : 'تبديل لشبكة مربعات رياضية'}
            className="p-2 rounded-xl text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 cursor-pointer transition-all"
          >
            {backgroundType === 'grid' ? <Square className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>

          {/* Download Snapshot */}
          <button
            type="button"
            onClick={handleDownload}
            title="تحميل المسودة كصورة"
            className="p-2 rounded-xl text-zinc-300 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Expand / Minimize Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'تصغير السبورة' : 'تكبير السبورة بملء الشاشة'}
            className="p-2 rounded-xl text-amber-400 hover:bg-amber-500/20 cursor-pointer transition-all"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close / Lock Whiteboard */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="قفل السبورة وإخفائها"
              className="px-2.5 py-1.5 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 flex items-center gap-1 text-xs font-bold cursor-pointer transition-all ml-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>قفل السبورة</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Controls (Colors & Stroke Sizes) */}
      <div className="px-3 sm:px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between gap-3 text-xs overflow-x-auto scrollbar-none select-none">
        {/* Colors (visible in Pen or Highlighter mode) */}
        {tool !== 'eraser' ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-bold hidden sm:inline">اللون:</span>
            {colors.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                title={c.name}
                style={{ backgroundColor: c.value }}
                className={`w-6 h-6 rounded-full transition-all border-2 cursor-pointer shadow-sm ${
                  color === c.value
                    ? 'border-white scale-125 ring-2 ring-amber-500/40'
                    : 'border-transparent hover:scale-110 opacity-80'
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <span className="font-bold">حجم الممحاة:</span>
            {eraserSizes.map((es) => (
              <button
                key={es.size}
                type="button"
                onClick={() => setEraserWidth(es.size)}
                className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                  eraserWidth === es.size
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'text-zinc-400 hover:text-white bg-zinc-800/50'
                }`}
              >
                {es.name} ({es.size}px)
              </button>
            ))}
          </div>
        )}

        {/* Thickness for Pen */}
        {tool === 'pen' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 font-bold hidden sm:inline">السمك:</span>
            {strokeSizes.map((s) => (
              <button
                key={s.size}
                type="button"
                onClick={() => setStrokeWidth(s.size)}
                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                  strokeWidth === s.size
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'text-zinc-400 hover:text-white bg-zinc-800/50'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The Interactive Canvas Area */}
      <div
        ref={canvasWrapperRef}
        className={`flex-1 relative w-full overflow-hidden select-none touch-none ${
          tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
        } ${
          backgroundType === 'grid'
            ? 'bg-[radial-gradient(#3f3f46_1px,transparent_1px)] bg-[size:20px_20px] bg-[#0c0d0e]'
            : 'bg-[#0c0d0e]'
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="absolute inset-0 block w-full h-full"
        />

        {/* Toast Notice */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/40 text-amber-400 text-xs font-bold shadow-xl pointer-events-none flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Watermark in corner */}
        <div className="absolute bottom-2 left-3 text-[10px] text-zinc-600 font-mono pointer-events-none select-none">
          ALPHA Scratchpad • مسودة ألفا
        </div>
      </div>
    </div>
  );
};
