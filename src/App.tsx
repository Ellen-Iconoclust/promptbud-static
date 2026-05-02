import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Eye, 
  X, 
  Menu, 
  TrendingUp, 
  Users, 
  Layers, 
  ArrowRight,
  LogOut,
  Star,
  Shield,
  Trash2,
  Image as ImageIcon,
  BookOpen,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  increment,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { useAuth, AuthProvider } from './context/AuthContext';

// --- Constants & Types ---
interface Prompt {
  id: string;
  title: string;
  tagline: string;
  model: string;
  text: string;
  image_url: string;
  username: string;
  userId: string;
  accepted: boolean;
  isTrending: boolean;
  likes?: number;
  createdAt: any;
}

interface Stats {
  total_prompts: number;
  total_users: number;
  categories: number;
  accepted_prompts: number;
  pending_prompts: number;
  trending_prompts: number;
}

// --- Components ---

const Toast: React.FC<{ message: string; visible: boolean }> = ({ message, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed right-5 bottom-5 bg-[#222]/95 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl z-[10002] pointer-events-none"
      >
        <Check className="text-green-400 w-5 h-5" />
        <span className="text-sm font-medium">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const ModalPage: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
  subtitle?: string;
}> = ({ isOpen, onClose, title, subtitle, children }) => {
  if (!isOpen) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-[#f6efe9] z-[1000] overflow-y-auto"
    >
      <div className="max-w-[1200px] mx-auto px-5 py-5">
        <div className="flex justify-between items-center mb-10">
          <div className="w-10" /> {/* Spacer */}
          <div className="text-center">
            <h2 className="font-space text-3xl font-bold">{title}</h2>
            {subtitle && <p className="text-muted text-sm mt-2">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#A46BF5] hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </motion.div>
  );
};

const PromptCard: React.FC<{ 
  prompt: Prompt; 
  onCopy: (text: string) => void;
  isAdmin?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onToggleTrending?: (id: string) => void;
  onViewImage: (url: string, title: string, model: string) => void;
  onLike?: (id: string) => void;
  isLiked?: boolean;
}> = ({ prompt, onCopy, isAdmin, onApprove, onReject, onToggleTrending, onViewImage, onLike, isLiked }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(prompt.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      layout
      className="bg-white rounded-[14px] p-4 shadow-[0_10px_30px_rgba(20,20,30,0.06)] flex flex-col relative group transition-all duration-350 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_25px_60px_rgba(20,20,30,0.15)] min-h-[550px]"
    >
      {prompt.isTrending && (
        <div className="absolute top-2.5 right-2.5 z-10 bg-[#fff3f1] text-[#FF7B65] font-bold text-[12px] px-2.5 py-1.5 rounded-full">
          Trending
        </div>
      )}
      {!prompt.accepted && (
        <div className="absolute top-2.5 left-2.5 z-10 bg-[#fff8e6] text-[#f59e0b] font-bold text-[12px] px-2.5 py-1.5 rounded-full">
          Pending
        </div>
      )}

      {/* Like Button */}
      {prompt.accepted && onLike && (
        <button 
          onClick={(e) => { e.stopPropagation(); onLike(prompt.id); }}
          className={`absolute top-2.5 left-2.5 z-10 p-2 rounded-full shadow-md backdrop-blur-md transition-all ${isLiked ? 'bg-[#FF7B65] text-white scale-110' : 'bg-white/80 text-muted hover:text-[#FF7B65] hover:scale-110'}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          {prompt.likes && prompt.likes > 0 && <span className="absolute -bottom-1 -right-1 bg-white text-[#FF7B65] text-[9px] font-bold px-1 rounded-full border border-black/5">{prompt.likes}</span>}
        </button>
      )}

      {/* Image Wrap */}
      <div 
        className="w-full h-[200px] rounded-[10px] overflow-hidden relative bg-[#eee] flex-shrink-0 cursor-pointer"
        onClick={() => onViewImage(prompt.image_url, prompt.title, prompt.model)}
      >
        {prompt.image_url ? (
          <img 
            src={prompt.image_url} 
            alt={prompt.title} 
            className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-[1.08]" 
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted">No image</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
          <Eye className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 transition-opacity" />
        </div>
      </div>

      <h4 className="mt-4 mb-1.5 font-space font-bold text-center text-[#333] text-lg leading-snug transition-colors group-hover:text-[#ff6040]">
        {prompt.title}
      </h4>
      <div className="text-xs text-muted text-center mb-3">
        By {prompt.username} • {prompt.createdAt?.toDate ? prompt.createdAt.toDate().toLocaleDateString() : 'Just now'}
      </div>

      <div className="bg-[#fff6ef] p-3 rounded-[10px] border border-[#f2e0d6] text-[#4b4b5b] text-sm leading-relaxed mb-3 overflow-y-auto max-h-[120px] flex-grow whitespace-pre-wrap">
        {prompt.text}
      </div>

      <div className="flex items-center gap-2 mt-auto p-2 bg-[#f8f9fa] rounded-lg text-[13px] text-muted">
        <Layers className="w-4 h-4 flex-shrink-0" />
        <span>Works with: {prompt.model}</span>
      </div>

      <div className="mt-4 space-y-2">
        {prompt.accepted && (
          <button 
            onClick={handleCopy}
            className="bg-[#FF7B65] text-white w-full py-3 rounded-[10px] font-semibold flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(255,123,101,0.2)] transition-all hover:bg-[#A46BF5] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(164,107,245,0.3)]"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy the Prompt'}
          </button>
        )}

        {isAdmin && (
          <div className="grid grid-cols-2 gap-2">
            {!prompt.accepted && (
              <button 
                onClick={() => onApprove?.(prompt.id)}
                className="bg-[#10b981] text-white py-2 rounded-lg font-bold text-xs hover:opacity-90"
              >
                Approve
              </button>
            )}
            <button 
              onClick={() => onReject?.(prompt.id)}
              className={`${!prompt.accepted ? 'bg-[#ef4444]' : 'bg-[#ef4444] col-span-2'} text-white py-2 rounded-lg font-bold text-xs hover:opacity-90`}
            >
              Delete
            </button>
            {prompt.accepted && (
              <button 
                onClick={() => onToggleTrending?.(prompt.id)}
                className="col-span-2 bg-[#A46BF5] text-white py-2 rounded-lg font-bold text-xs hover:opacity-90"
              >
                {prompt.isTrending ? 'Remove Trending' : 'Make Trending'}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- Main App Logic ---

const AppContent: React.FC = () => {
  const { user, profile, isAdmin, loading, login, logout } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_prompts: 0,
    total_users: 0,
    categories: 8,
    accepted_prompts: 0,
    pending_prompts: 0,
    trending_prompts: 0
  });

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewerImage, setViewerImage] = useState<{ url: string; title: string; model: string } | null>(null);
  const [likedPromptIds, setLikedPromptIds] = useState<Set<string>>(new Set());
  const [likeLoading, setLikeLoading] = useState<Set<string>>(new Set());

  // Firestore Error Handler
  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user?.uid,
        email: user?.email,
        emailVerified: user?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
  };

  const handleLike = async (id: string) => {
    if (!user) {
      login();
      return;
    }

    if (likeLoading.has(id)) return;

    const isLiked = likedPromptIds.has(id);
    const likeDocRef = doc(db, 'users', user.uid, 'likedPrompts', id);
    const promptDocRef = doc(db, 'prompts', id);

    setLikeLoading(prev => new Set(prev).add(id));

    try {
      if (isLiked) {
        // Unlike
        await deleteDoc(likeDocRef);
        await updateDoc(promptDocRef, { likes: increment(-1) });
        showMessage('Removed from favorites');
      } else {
        // Like - Using setDoc to ensure it's unique per user/prompt
        await setDoc(likeDocRef, { likedAt: serverTimestamp() });
        await updateDoc(promptDocRef, { likes: increment(1) });
        showMessage('Added to favorites!');
      }
    } catch (err) {
      console.error('Like action failed:', err);
      handleFirestoreError(err, 'write', `like/${id}`);
    } finally {
      setLikeLoading(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const [form, setForm] = useState({
    title: '',
    tagline: '',
    model: '',
    text: '',
    image_url: '',
    username: profile?.username || ''
  });
  const [uploadProgress, setUploadProgress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 800 * 1024) { // 800KB limit for base64 in Firestore
      alert('File is too large. Final images are limited to 800KB. Please compress or choose a smaller image.');
      return;
    }

    setUploadProgress(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm({ ...form, image_url: event.target?.result as string });
      setUploadProgress(false);
      showMessage('Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  // Easter Egg States
  const [logoClicks, setLogoClicks] = useState(0);
  const [starPlacerActive, setStarPlacerActive] = useState(false);
  const [stars, setStars] = useState<{ x: number; y: number; id: number }[]>([]);
  const [showTTT, setShowTTT] = useState(false);
  const [isBookUnlocked, setIsBookUnlocked] = useState(false);
  const [tttBoard, setTTTBoard] = useState(Array(9).fill(''));
  const [tttPlayer, setTTTPlayer] = useState<'X' | 'O'>('X');
  const [tttStatus, setTTTStatus] = useState("Player X's turn");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (searchQuery === '\\c0d3:bud') {
      setIsBookUnlocked(true);
      showMessage('Easter Egg Unlocked! Look at the bottom left.');
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showMessage('Right-click is disabled on this site');
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Fetch Stats
  useEffect(() => {
    if (loading) return;
    const unsub = onSnapshot(doc(db, 'stats', 'global'), (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as Stats);
      }
    }, (err) => {
      handleFirestoreError(err, 'get', 'stats/global');
    });
    return unsub;
  }, [loading]);

  // Fetch Prompts
  useEffect(() => {
    if (loading) return;

    let q;
    if (isAdmin) {
      q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'prompts'), where('accepted', '==', true), orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
      setPrompts(pData);
      
      const accepted = pData.filter(p => p.accepted);
      const pending = pData.filter(p => !p.accepted);
      const trending = pData.filter(p => p.isTrending && p.accepted);
      
      setStats(prev => ({
        ...prev,
        total_prompts: pData.length,
        accepted_prompts: accepted.length,
        pending_prompts: pending.length,
        trending_prompts: trending.length
      }));
    }, (err) => {
      handleFirestoreError(err, 'list', 'prompts');
    });
    return unsub;
  }, [loading, isAdmin]);

  // Fetch My Pending Prompts (specifically for the owner to see their own drafts)
  const [myPendingPrompts, setMyPendingPrompts] = useState<Prompt[]>([]);

  // Real-time Total Users Count Sync (Admin Only)
  useEffect(() => {
    if (loading || !isAdmin || !user) return;
    
    // Check if user matches the admin email in rules for safety
    if (user.email !== 'elleniconoclust@gmail.com') return;

    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      // Sync the true count to global stats
      updateDoc(doc(db, 'stats', 'global'), {
        total_users: snapshot.size
      }).catch(err => handleFirestoreError(err, 'write', 'stats/global'));
    }, (err) => {
      handleFirestoreError(err, 'list', 'users');
    });
    return unsub;
  }, [loading, isAdmin, user]);

  useEffect(() => {
    if (loading || !user || isAdmin) {
      setMyPendingPrompts([]);
      return;
    }

    const q = query(
      collection(db, 'prompts'), 
      where('userId', '==', user.uid),
      where('accepted', '==', false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
      setMyPendingPrompts(pData);
    }, (err) => {
      handleFirestoreError(err, 'list', 'prompts (pending)');
    });
    return unsub;
  }, [loading, user, isAdmin]);

  // Fetch Liked Prompt IDs
  useEffect(() => {
    if (loading || !user) {
      setLikedPromptIds(new Set());
      return;
    }

    const unsub = onSnapshot(collection(db, 'users', user.uid, 'likedPrompts'), (snapshot) => {
      setLikedPromptIds(new Set(snapshot.docs.map(doc => doc.id)));
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/likedPrompts`);
    });
    return unsub;
  }, [loading, user]);

  const showMessage = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showMessage('Copied to clipboard');
  };

  const trendingPrompts = useMemo(() => prompts.filter(p => p.accepted && p.isTrending), [prompts]);
  const galleryPrompts = useMemo(() => {
    let filtered = prompts.filter(p => p.accepted);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.text.toLowerCase().includes(q) || 
        p.tagline.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [prompts, searchQuery]);

  const pendingPrompts = useMemo(() => prompts.filter(p => !p.accepted), [prompts]);
  const myPrompts = useMemo(() => {
    const combined = [...prompts, ...myPendingPrompts];
    // De-duplicate if needed (though prompts and myPendingPrompts shouldn't overlap)
    return combined.filter(p => p.userId === user?.uid);
  }, [prompts, myPendingPrompts, user]);

  const likedPrompts = useMemo(() => {
    return prompts.filter(p => likedPromptIds.has(p.id));
  }, [prompts, likedPromptIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      login();
      return;
    }
    if (!form.title || !form.text || !form.model) {
      alert('Please fill all required fields');
      return;
    }
    if (!form.image_url) {
      alert('Please upload an image or provide an image URL. Images are mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'prompts'), {
        ...form,
        username: profile?.username || user.displayName || 'Anonymous',
        userId: user.uid,
        accepted: isAdmin,
        isTrending: false,
        createdAt: serverTimestamp()
      });
      
      showMessage('Prompt submitted successfully!');
      setForm({ title: '', tagline: '', model: '', text: '', image_url: '', username: profile?.username || '' });
    } catch (err) {
      console.error(err);
      alert('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Actions
  const approvePrompt = async (id: string) => {
    await updateDoc(doc(db, 'prompts', id), { accepted: true });
    showMessage('Prompt approved');
  };

  const rejectPrompt = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'prompts', id));
      showMessage('Prompt deleted');
    } catch (err) {
      console.error(err);
      alert('Failed to delete prompt');
    }
  };

  const toggleTrending = async (id: string) => {
    const p = prompts.find(pr => pr.id === id);
    await updateDoc(doc(db, 'prompts', id), { isTrending: !p?.isTrending });
  };

  // Easter Eggs
  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (newCount >= 6) {
      setStarPlacerActive(true);
      setLogoClicks(0);
      showMessage('Star Placer Activated! Click anywhere.');
    }
    setTimeout(() => setLogoClicks(0), 2000);
  };

  const placeStar = (e: React.MouseEvent) => {
    if (!starPlacerActive) return;
    setStars([...stars, { x: e.clientX, y: e.clientY, id: Date.now() }]);
  };

  const handleTTTMove = (idx: number) => {
    if (tttBoard[idx] || tttStatus.includes('wins') || tttStatus.includes('draw')) return;
    const newBoard = [...tttBoard];
    newBoard[idx] = tttPlayer;
    setTTTBoard(newBoard);
    
    // Check win
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const won = wins.some(([a,b,c]) => newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]);
    
    if (won) {
      setTTTStatus(`Player ${tttPlayer} wins!`);
    } else if (newBoard.every(b => b)) {
      setTTTStatus("It's a draw!");
    } else {
      const next = tttPlayer === 'X' ? 'O' : 'X';
      setTTTPlayer(next);
      setTTTStatus(`Player ${next}'s turn`);
    }
  };

  return (
    <div className="min-h-screen relative font-sans" onClick={placeStar}>
      {/* Background Blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
      <div className="blob blob-4"></div>

      {/* Nav */}
      <div className="sticky top-0 z-[999] backdrop-blur-md bg-white/80 border-b border-black/5 shadow-sm">
        <header className="max-w-[1200px] mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex gap-3 items-center cursor-pointer group" onClick={handleLogoClick}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shadow-lg bg-[radial-gradient(circle_at_30%_30%,#ffd6c6,#ff8b6b)]">
              <Star className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="font-space font-bold text-xl text-[#ff6d57]">PromptBud</h1>
              <div className="text-[12px] text-muted -mt-0.5">By Code Ronins</div>
            </div>
          </div>

          <nav className="hidden md:flex gap-3 items-center">
            <button onClick={() => setActiveModal(null)} className={`px-3.5 py-2.5 rounded-xl font-semibold transition-all hover:bg-[#A46BF5] hover:text-white ${!activeModal ? 'bg-[#FF7B65] text-white shadow-lg shadow-[#FF7B65]/20' : ''}`}>Home</button>
            <button onClick={() => setActiveModal('gallery')} className="px-3.5 py-2.5 rounded-xl font-semibold transition-all hover:bg-[#A46BF5] hover:text-white">Gallery</button>
            <button onClick={() => setActiveModal('submit')} className="px-3.5 py-2.5 rounded-xl font-semibold transition-all hover:bg-[#A46BF5] hover:text-white">My Prompts</button>
            <button onClick={() => setActiveModal('about')} className="px-3.5 py-2.5 rounded-xl font-semibold transition-all hover:bg-[#A46BF5] hover:text-white">About</button>
            {isAdmin && <button onClick={() => setActiveModal('admin')} className="px-3.5 py-2.5 rounded-xl font-semibold transition-all hover:bg-[#A46BF5] hover:text-white">Admin</button>}
            <button 
              onClick={user ? logout : login} 
              className="ml-2 flex items-center gap-2 font-semibold text-sm bg-accent-2 px-4 py-2.5 rounded-xl hover:bg-[#A46BF5] hover:text-white transition-all"
            >
              {user ? <><LogOut className="w-4 h-4" /> Logout</> : 'Login'}
            </button>
          </nav>

          <button className="md:hidden p-2 text-muted" onClick={() => setMobileNavOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
        </header>
      </div>

      {/* Hero */}
      <section className="min-h-[85vh] flex flex-col justify-center items-center text-center px-5 py-12 md:py-16 pt-32 sm:pt-48 md:pt-[124px] relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1200px] mx-auto mt-4 md:mt-[-4px]"
        >
          <h2 className="font-space font-bold text-[calc(10vw+2px)] sm:text-7xl md:text-8xl leading-tight sm:leading-[1.05] text-[#111]">
            <span className="whitespace-nowrap">Discover & Share</span><br />
            <span className="block mt-2 sm:mt-4 text-[#FF7B65]">AI Prompts</span>
          </h2>
          <p className="text-muted text-base sm:text-lg md:text-xl mt-8 sm:text-6 max-w-2xl mx-auto leading-relaxed px-4">
            Discover, submit, and manage creative AI prompts. Join a community of prompt engineers and creators.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center w-full max-w-[340px] sm:max-w-none mx-auto">
            <button 
              onClick={() => setActiveModal('submit')}
              className="w-full sm:w-auto bg-[#FF7B65] text-white px-8 py-2.5 sm:px-10 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(255,123,101,0.18)] transition-all hover:bg-gradient-to-r hover:from-[#FF7B65] hover:to-[#A46BF5] hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(164,107,245,0.3)] text-base"
            >
              Submit Your Prompt <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveModal('gallery')}
              className="w-full sm:w-auto bg-[#fff3f1] text-[#FF7B65] px-8 py-2.5 sm:px-10 sm:py-3 rounded-xl font-bold flex items-center justify-center hover:bg-[#A46BF5] hover:text-white hover:-translate-y-0.5 transition-all text-base"
            >
              Explore Gallery
            </button>
          </div>

          <div className="mt-12 sm:mt-14 grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 justify-center max-w-[1000px] mx-auto px-2">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] border border-black/5 hover:border-[#FF7B65]/20 transition-all hover:scale-[1.02]">
              <h3 className="text-[#FF7B65] text-2xl md:text-3xl font-bold tracking-tight">{stats.total_prompts}</h3>
              <p className="text-muted text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] mt-1 md:mt-2">Prompts</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] border border-black/5 hover:border-[#FF7B65]/20 transition-all hover:scale-[1.02]">
              <h3 className="text-[#FF7B65] text-2xl md:text-3xl font-bold tracking-tight">{stats.total_users}</h3>
              <p className="text-muted text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] mt-1 md:mt-2">Users</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] border border-black/5 hover:border-[#FF7B65]/20 transition-all hover:scale-[1.02]">
              <h3 className="text-[#FF7B65] text-2xl md:text-3xl font-bold tracking-tight">{stats.categories}</h3>
              <p className="text-muted text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] mt-1 md:mt-2">Models</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trending */}
      <section className="max-w-[1200px] mx-auto px-5 mt-20 mb-10 text-center">
        <h3 className="font-space text-3xl md:text-4xl font-bold mb-1.5">Trending Prompts</h3>
        <p className="text-muted mb-7 text-base md:text-lg">Explore verified AI prompts with stunning visuals — copy any prompt instantly</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trendingPrompts.map(p => (
            <PromptCard 
              key={p.id} 
              prompt={p} 
              onCopy={handleCopy} 
              isAdmin={isAdmin}
              onReject={rejectPrompt}
              onToggleTrending={toggleTrending}
              onViewImage={(url, title, model) => setViewerImage({ url, title, model })}
              onLike={handleLike}
              isLiked={likedPromptIds.has(p.id)}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-10 pb-10 border-t border-black/5">
        <div className="max-w-[1200px] mx-auto px-5 text-center text-muted text-sm">
          <div>&copy; 2026 PromptBud — by <a href="https://coderonins.vercel.app" className="text-[#FF7B65] hover:text-[#A46BF5]" target="_blank" rel="noreferrer">Code Ronins</a></div>
          <div className="flex justify-center gap-6 mt-4">
            <button onClick={() => setActiveModal('terms')} className="hover:text-[#FF7B65] transition-colors">Terms & Conditions</button>
            <button onClick={() => setActiveModal('privacy')} className="hover:text-[#FF7B65] transition-colors">Privacy Policy</button>
          </div>
          <div className="mt-4 text-sm">Made with ♥</div>
        </div>
      </footer>

      {/* Modals */}
      <ModalPage 
        isOpen={activeModal === 'gallery'} 
        onClose={() => setActiveModal(null)} 
        title="Gallery"
        subtitle="All community prompts with sample images"
      >
        <div className="max-w-xl mx-auto mb-8 relative">
          <input 
            type="text" 
            placeholder="Search prompts by title, tagline, or content..."
            className="w-full px-5 py-3.5 border-2 border-[#FF7B65] rounded-full text-base bg-white focus:border-[#A46BF5] outline-none shadow-sm transition-all pr-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-[#FF7B65]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {galleryPrompts.map(p => (
            <PromptCard 
              key={p.id} 
              prompt={p} 
              onCopy={handleCopy}
              isAdmin={isAdmin}
              onReject={rejectPrompt}
              onToggleTrending={toggleTrending}
              onViewImage={(url, title, model) => setViewerImage({ url, title, model })}
              onLike={handleLike}
              isLiked={likedPromptIds.has(p.id)}
            />
          ))}
        </div>
        {galleryPrompts.length === 0 && (
          <div className="text-center py-10 text-muted">
            <h3 className="text-xl font-bold">No results found</h3>
            <p>Try searching with different keywords</p>
          </div>
        )}
      </ModalPage>

            <ModalPage 
              isOpen={activeModal === 'submit'} 
              onClose={() => setActiveModal(null)} 
              title="My Prompts"
            >
              <div className="flex flex-wrap gap-5">
                <div className="flex-1 min-w-[320px]">
                  <div className="bg-white p-5 rounded-2xl shadow-sm">
                    <h4 className="font-space font-bold text-lg mb-1.5">Submit Prompt</h4>
                    <p className="text-muted text-sm mb-4">Enter prompt details and upload an image</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-1.5 block">Prompt Title *</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-black/5 outline-none focus:border-[#FF7B65] transition-colors"
                          placeholder="Catchy title"
                          required
                          value={form.title}
                          onChange={(e) => setForm({...form, title: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-1.5 block">Tagline *</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-black/5 outline-none focus:border-[#FF7B65] transition-colors"
                          placeholder="Short description"
                          required
                          value={form.tagline}
                          onChange={(e) => setForm({...form, tagline: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-1.5 block">AI Model *</label>
                        <select 
                          className="w-full p-2.5 rounded-xl border border-black/5 outline-none focus:border-[#FF7B65] transition-colors bg-white"
                          required
                          value={form.model}
                          onChange={(e) => setForm({...form, model: e.target.value})}
                        >
                          <option value="">Select AI Model</option>
                          <option value="ChatGPT">ChatGPT</option>
                          <option value="Gemini">Gemini</option>
                          <option value="Midjourney">Midjourney</option>
                          <option value="DALL-E">DALL-E</option>
                          <option value="Stable Diffusion">Stable Diffusion</option>
                          <option value="Claude">Claude</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-1.5 block">Prompt Text *</label>
                        <textarea 
                          className="w-full p-2.5 rounded-xl border border-black/5 outline-none focus:border-[#FF7B65] transition-colors min-h-[140px]"
                          placeholder="Describe the prompt in detail..."
                          required
                          value={form.text}
                          onChange={(e) => setForm({...form, text: e.target.value})}
                        />
                      </div>

                      <div 
                        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-[#fafafa] hover:border-[#FF7B65] transition-colors cursor-pointer group relative overflow-hidden"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          className="hidden" 
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                        {form.image_url && form.image_url.startsWith('data:') ? (
                          <div className="relative h-32">
                            <img src={form.image_url} alt="Uploaded" className="h-full mx-auto rounded-lg object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                              <span className="text-white text-xs font-bold">Change Image</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            {uploadProgress ? (
                              <div className="w-8 h-8 border-4 border-[#FF7B65] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            ) : (
                              <ImageIcon className="w-12 h-12 mx-auto text-gray-400 group-hover:text-[#FF7B65] mb-2" />
                            )}
                            <p className="text-muted text-sm font-medium">Click to upload or drag and drop</p>
                            <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, GIF up to 800KB</p>
                          </>
                        )}
                      </div>

                      <div className="text-center text-muted text-xs font-bold py-1">OR</div>

                      <div>
                        <label className="text-sm font-semibold mb-1.5 block">Image URL (alternative)</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-black/5 outline-none focus:border-[#FF7B65] transition-colors"
                          placeholder="https://example.com/image.jpg"
                          value={form.image_url}
                          onChange={(e) => setForm({...form, image_url: e.target.value})}
                        />
                        {form.image_url && (
                          <div className="mt-4 rounded-xl overflow-hidden border border-black/5">
                            <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <button 
                          type="submit" 
                          disabled={submitting}
                          className="flex-1 bg-[#FF7B65] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Submitting...' : (
                            <>Submit <ArrowRight className="w-4 h-4" /></>
                          )}
                        </button>
                        <button type="button" onClick={() => setForm({ title: '', tagline: '', model: '', text: '', image_url: '', username: profile?.username || '' })} className="bg-accent-2 px-6 py-3 rounded-xl font-bold">Clear</button>
                      </div>
                    </form>
                  </div>
                </div>

          <div className="w-full lg:w-[380px]">
            <div className="bg-white p-5 rounded-2xl shadow-sm h-full">
              <h4 className="font-space font-bold text-lg mb-2">My Submitted Prompts</h4>
              <p className="text-muted text-sm mb-4">Tracking your submissions</p>
              
              <div className="space-y-3">
                {user ? (
                  myPrompts.length > 0 ? (
                    myPrompts.map(p => (
                      <div key={p.id} className={`p-3 rounded-xl border-l-[4px] ${p.accepted ? 'bg-blue-50 border-blue-500' : 'bg-orange-50 border-orange-500'}`}>
                        <div className="font-semibold text-sm line-clamp-1">{p.title}</div>
                        <div className="text-[11px] text-muted mt-1">
                          {p.createdAt?.toDate?.().toLocaleDateString() || 'Just now'} • 
                          <span className={`ml-1 font-bold ${p.accepted ? 'text-green-600' : 'text-orange-600'}`}>
                            {p.accepted ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted">You haven't submitted any prompts yet.</p>
                  )
                ) : (
                  <button onClick={login} className="text-sm font-bold text-[#FF7B65]">Login to see your history</button>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm mt-5">
              <h4 className="font-space font-bold text-lg mb-2">Liked Prompts</h4>
              <p className="text-muted text-sm mb-6">Your favorite prompts</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user ? (
                  likedPrompts.length > 0 ? (
                    likedPrompts.map(p => (
                      <PromptCard
                        key={p.id}
                        prompt={p}
                        onCopy={handleCopy}
                        isAdmin={isAdmin}
                        onApprove={approvePrompt}
                        onReject={rejectPrompt}
                        onToggleTrending={toggleTrending}
                        onViewImage={(url, title, model) => setViewerImage({ url, title, model })}
                        onLike={handleLike}
                        isLiked={likedPromptIds.has(p.id)}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Heart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-muted">You haven't liked any prompts yet.</p>
                    </div>
                  )
                ) : (
                  <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-muted">Login to see your favorites.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ModalPage>

      <ModalPage 
        isOpen={activeModal === 'about'} 
        onClose={() => setActiveModal(null)} 
        title="About PromptBud"
      >
        <div className="max-w-[800px] mx-auto text-center py-5">
          <h2 className="text-3xl font-bold mb-4">Welcome to PromptBud</h2>
          <div className="inline-block bg-[#FF7B65] text-white px-4 py-2 rounded-full font-bold text-sm mb-8 shadow-md">Version: Alpha_04.00</div>
          <div className="text-left space-y-6 text-muted text-lg leading-relaxed">
            <p>PromptBud is a revolutionary platform designed for AI enthusiasts, prompt engineers, and creative minds to discover, share, and collaborate on the most effective AI prompts. In the rapidly evolving world of artificial intelligence, the quality of prompts determines the quality of outputs. PromptBud serves as a centralized hub where the community can contribute their most successful prompts across various AI models including ChatGPT, Midjourney, DALL-E, Stable Diffusion, and more.</p>
            <p>Our mission is to democratize access to high-quality AI prompts and foster a community where both beginners and experts can learn from each other. Whether you're looking to generate stunning visual art, craft compelling stories, solve complex problems, or simply explore the capabilities of modern AI systems, PromptBud provides the tools and community support to help you achieve your creative goals.</p>
            <p>The platform features a curated gallery of trending prompts, user submission system with admin moderation, and an intuitive interface that makes prompt discovery and sharing seamless. Every prompt on our platform is carefully reviewed to ensure quality and relevance, maintaining a high standard for our growing community of AI practitioners.</p>
            <p>Join us in shaping the future of human-AI collaboration. Share your insights, learn from others, and be part of the movement that's pushing the boundaries of what's possible with artificial intelligence.</p>
          </div>
          <div className="mt-12 px-12 py-5 bg-white rounded-2xl shadow-sm border border-black/5 inline-block">
            <h3 className="font-space font-bold text-xl text-[#FF7B65]">Ellen Iconoclust</h3>
            <p className="text-base text-muted">Lead Developer @ Code Ronins</p>
          </div>
        </div>
      </ModalPage>

      <ModalPage 
        isOpen={activeModal === 'terms'} 
        onClose={() => setActiveModal(null)} 
        title="Terms & Conditions"
      >
        <div className="max-w-[800px] mx-auto py-5">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
            <p className="text-muted mb-6">Last Updated: May 2026</p>
            
            <div className="space-y-8 text-muted leading-relaxed">
              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">1. Acceptance of Terms</h3>
                <p>By accessing and using PromptBud, you accept and agree to be bound by the terms and provision of this agreement. Additionally, when using this website's particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">2. User Accounts</h3>
                <p>When you create an account with us, you guarantee that information you provide is accurate, complete, and current at all times. You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">3. Content Policy</h3>
                <p>Users may submit prompts and images to the platform. By submitting content, you grant PromptBud a worldwide, non-exclusive, royalty-free license to use, reproduce, adapt, and display such content on our platform. You retain ownership of your original content.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">4. Intellectual Property</h3>
                <p>The PromptBud platform and its original content, features, and functionality are owned by Code Ronins and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">5. Termination</h3>
                <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">6. Changes to Terms</h3>
                <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our service after those revisions become effective, you agree to be bound by the revised terms.</p>
              </section>
            </div>
          </div>
        </div>
      </ModalPage>

      <ModalPage 
        isOpen={activeModal === 'privacy'} 
        onClose={() => setActiveModal(null)} 
        title="Privacy Policy"
      >
        <div className="max-w-[800px] mx-auto py-5">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
            <p className="text-muted mb-6">Last Updated: May 2026</p>
            
            <div className="space-y-8 text-muted leading-relaxed">
              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">1. Information We Collect</h3>
                <p>We collect information that you provide directly to us, including username, email address, password, and any prompts or images you submit to the platform.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">2. How We Use Your Information</h3>
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Monitor and analyze trends and usage</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">3. Information Sharing</h3>
                <p>We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners and advertisers.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">4. Data Security</h3>
                <p>We implement appropriate security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information and data stored on our platform.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">5. Cookies</h3>
                <p>PromptBud uses cookies to enhance user experience. Your web browser places cookies on your hard drive for record-keeping purposes and sometimes to track information about them.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">6. Your Rights</h3>
                <p>You have the right to access, correct, or delete your personal information. You can update your account information through your account settings or contact us directly.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#333] mb-3">7. Changes to This Policy</h3>
                <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
              </section>
            </div>
          </div>
        </div>
      </ModalPage>

      {isAdmin && (
        <ModalPage 
          isOpen={activeModal === 'admin'} 
          onClose={() => setActiveModal(null)} 
          title="Admin Dashboard"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            <div className="bg-white p-5 rounded-2xl shadow-sm text-center">
              <h3 className="text-2xl font-bold text-[#FF7B65]">{stats.total_prompts}</h3>
              <p className="text-[11px] font-bold text-muted uppercase">Total</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm text-center">
              <h3 className="text-2xl font-bold text-green-500">{stats.accepted_prompts}</h3>
              <p className="text-[11px] font-bold text-muted uppercase">Approved</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm text-center">
              <h3 className="text-2xl font-bold text-orange-500">{stats.pending_prompts}</h3>
              <p className="text-[11px] font-bold text-muted uppercase">Pending</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm text-center">
              <h3 className="text-2xl font-bold text-[#A46BF5]">{stats.trending_prompts}</h3>
              <p className="text-[11px] font-bold text-muted uppercase">Trending</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm text-center">
              <h3 className="text-2xl font-bold">{stats.total_users}</h3>
              <p className="text-[11px] font-bold text-muted uppercase">Users</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h4 className="font-bold text-lg mb-6">Pending Review</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pendingPrompts.map(p => (
                <PromptCard 
                  key={p.id} 
                  prompt={p} 
                  onCopy={handleCopy} 
                  isAdmin
                  onApprove={approvePrompt}
                  onReject={rejectPrompt}
                  onToggleTrending={toggleTrending}
                  onViewImage={(url, title, model) => setViewerImage({ url, title, model })}
                />
              ))}
              {pendingPrompts.length === 0 && <p className="col-span-full py-10 text-center text-muted">No pending prompts!</p>}
            </div>
          </div>
        </ModalPage>
      )}

      {/* Image Viewer */}
      <AnimatePresence>
        {viewerImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-5 backdrop-blur-xl"
            onClick={() => setViewerImage(null)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setViewerImage(null)}
                className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img src={viewerImage.url} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl bg-[#1a1a1a] p-1" />
              <div className="absolute -bottom-15 left-0 right-0 text-center bg-black/50 p-3 rounded-lg backdrop-blur-sm">
                <div className="text-white font-bold">{viewerImage.title}</div>
                <div className="text-white/60 text-xs mt-1">Model: {viewerImage.model}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed inset-0 bg-[#f6efe9] z-[2000] flex flex-col items-center justify-center gap-6"
          >
            <button className="absolute top-5 right-5 p-2 text-muted" onClick={() => setMobileNavOpen(false)}>
              <X className="w-8 h-8" />
            </button>
            <button onClick={() => { setActiveModal(null); setMobileNavOpen(false); }} className="text-2xl font-bold">Home</button>
            <button onClick={() => { setActiveModal('gallery'); setMobileNavOpen(false); }} className="text-2xl font-bold">Gallery</button>
            <button onClick={() => { setActiveModal('submit'); setMobileNavOpen(false); }} className="text-2xl font-bold">My Prompts</button>
            <button onClick={() => { setActiveModal('about'); setMobileNavOpen(false); }} className="text-2xl font-bold">About</button>
            {isAdmin && <button onClick={() => { setActiveModal('admin'); setMobileNavOpen(false); }} className="text-2xl font-bold">Admin</button>}
            <button 
              onClick={() => { user ? logout() : login(); setMobileNavOpen(false); }} 
              className="text-2xl font-bold text-[#FF7B65]"
            >
              {user ? 'Logout' : 'Login'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Easter Egg Modals */}
      <AnimatePresence>
        {stars.map(star => (
          <div key={star.id} className="fixed text-3xl pointer-events-none z-[9998]" style={{ left: star.x, top: star.y }}>⭐</div>
        ))}
        {starPlacerActive && (
          <button 
            onClick={(e) => { e.stopPropagation(); setStarPlacerActive(false); setStars([]); }}
            className="fixed bottom-5 right-5 bg-orange-500 text-white p-3 rounded-xl font-bold z-[9999]"
          >
            Clear Stars
          </button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBookUnlocked && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className="fixed bottom-5 left-5 z-[9999] flex flex-col items-center gap-2"
          >
            <button 
              onClick={() => setIsBookUnlocked(false)}
              className="bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
              title="Hide Secret"
            >
              <X className="w-3 h-3" />
            </button>
            <div 
              className="bg-white p-3 rounded-full shadow-xl cursor-pointer hover:scale-110 transition-transform border border-[#FF7B65]" 
              onClick={() => setShowTTT(true)}
            >
              <BookOpen className="w-8 h-8 text-[#FF7B65]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTTT && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10001] p-5"
          >
            <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center">
              <h2 className="text-2xl font-space font-bold text-[#FF7B65] mb-4">Tic Tac Toe</h2>
              <div className="text-lg font-bold text-muted mb-4">{tttStatus}</div>
              <div className="tictactoe-grid">
                {tttBoard.map((val, i) => (
                  <div key={i} className={`tictactoe-cell ${val.toLowerCase()}`} onClick={() => handleTTTMove(i)}>{val}</div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button 
                  onClick={() => { setTTTBoard(Array(9).fill('')); setTTTStatus("Player X's turn"); setTTTPlayer('X'); }} 
                  className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex-1"
                >
                  New Game
                </button>
                <button onClick={() => setShowTTT(false)} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex-1">Close</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message={toast || ''} visible={!!toast} />

      {/* Back to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-[#FF7B65] text-white flex items-center justify-center shadow-lg hover:bg-[#A46BF5] transition-colors z-[1000]"
          >
            <ArrowRight className="w-6 h-6 -rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
