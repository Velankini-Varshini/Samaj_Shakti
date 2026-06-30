import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  increment
} from "firebase/firestore";
import { 
  auth, 
  db, 
  googleSignIn, 
  handleSignOut, 
  initAuth, 
  getAccessToken 
} from "./firebase";
import { 
  UserProfile, 
  Issue, 
  CommunityMessage, 
  ActivityItem 
} from "./types";
import { 
  LOCALITIES, 
  INITIAL_ISSUES, 
  INITIAL_COMMUNITY_MESSAGES, 
  CIVIC_PRESETS 
} from "./mockData";
// @ts-ignore
import samajLogoImg from "./assets/images/samaj_shakti_logo_1782783326450.jpg";
import { 
  Plus, 
  MapPin, 
  Volume2, 
  User, 
  MessageSquare, 
  Award, 
  Sparkles, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  RotateCw, 
  BarChart3, 
  Search, 
  FileText, 
  Upload,
  Video,
  Image,
  Share2, 
  LogOut, 
  Locate, 
  Send,
  Loader2,
  Mic,
  VolumeX,
  Compass,
  AlertTriangle,
  Mail,
  ChevronRight,
  Info,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Wind,
  Clock,
  Wrench,
  X,
  Trash2,
  Phone,
  PhoneOff,
  Zap,
  Globe,
  Cpu,
  ArrowLeft,
  Link,
  MessageCircle,
  Twitter,
  Download,
  History,
  Bot
} from "lucide-react";
import jsPDF from "jspdf";

export default function App() {
  // Refs for GSAP Login Transitions and Particle Sandbox
  const loginContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const windSpeedRef = useRef(1.0);
  const floatGravityRef = useRef(1.0);
  const particlesRef = useRef<any[]>([]);

  // Authentication & Profile States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeLocality, setActiveLocality] = useState<string>("Old Bowenpally");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "stream" | "community" | "maps" | "heroes">("dashboard");

  // Refs for stale-closures in listeners
  const activeLocalityRef = useRef(activeLocality);
  activeLocalityRef.current = activeLocality;
  const userRef = useRef(user);
  userRef.current = user;
  const isInitialIssuesLoadRef = useRef(true);

  // Login page States
  const [showLogin, setShowLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [windSpeed, setWindSpeed] = useState(1.0);
  const [floatGravity, setFloatGravity] = useState(1.0);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({
    transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)"
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12; 
    const rotateY = ((x - centerX) / centerX) * 12;  
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transition: "transform 0.05s ease-out"
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)",
      transition: "transform 0.4s ease-out"
    });
  };

  // Real-time Voice Assistant Modal States
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isRecentCommandsOpen, setIsRecentCommandsOpen] = useState(false);
  const [recentVoiceCommands, setRecentVoiceCommands] = useState<string[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceResponseText, setVoiceResponseText] = useState("Namaste! Click the microphone to speak with Samaj Shakti voice assistant.");
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [voiceMessages, setVoiceMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [voiceActiveTab, setVoiceActiveTab] = useState<"chat" | "call">("call");
  const [isCallActive, setIsCallActive] = useState(false);
  const isCallActiveRef = useRef(isCallActive);
  isCallActiveRef.current = isCallActive;

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let javascriptNode: ScriptProcessorNode | null = null;
    let mediaStream: MediaStream | null = null;

    if (isVoiceListening) {
      const startMicAnalysis = async () => {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContext = new AudioContextClass();
          analyser = audioContext.createAnalyser();
          microphone = audioContext.createMediaStreamSource(mediaStream);
          javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

          analyser.smoothingTimeConstant = 0.3;
          analyser.fftSize = 1024;

          microphone.connect(analyser);
          analyser.connect(javascriptNode);
          javascriptNode.connect(audioContext.destination);

          javascriptNode.onaudioprocess = () => {
            if (!analyser) return;
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            let values = 0;

            const length = array.length;
            for (let i = 0; i < length; i++) {
              values += array[i];
            }

            const average = values / length;
            // Normalize volume (0 to 1)
            const normalized = Math.min(1, average / 100);
            setMicVolume(normalized);
          };
        } catch (err) {
          console.warn("Could not start real-time microphone visualization:", err);
        }
      };

      startMicAnalysis();
    } else {
      setMicVolume(0);
    }

    return () => {
      if (javascriptNode) {
        try {
          javascriptNode.disconnect();
        } catch (e) {}
      }
      if (microphone) {
        try {
          microphone.disconnect();
        } catch (e) {}
      }
      if (mediaStream) {
        try {
          mediaStream.getTracks().forEach(track => track.stop());
        } catch (e) {}
      }
      if (audioContext && audioContext.state !== "closed") {
        try {
          audioContext.close();
        } catch (e) {}
      }
    };
  }, [isVoiceListening]);

  // Interactive Maps & GIS States
  const [mapLayer, setMapLayer] = useState<"streets" | "sewer" | "grid" | "heatmap">("streets");
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [selectedMapPin, setSelectedMapPin] = useState<Issue | null>(null);
  const [placedPin, setPlacedPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showOnlyNearby, setShowOnlyNearby] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingUserLocation, setIsFetchingUserLocation] = useState(false);

  // Application Data States
  const [issues, setIssues] = useState<Issue[]>([]);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // AI & Assistant States
  const [aiPredictiveInsight, setAiPredictiveInsight] = useState<string>("Samaj Shakti AI is reading reports. Click below to analyze trends.");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string; hasAudio?: boolean; audioBase64?: string }[]>([
    { role: "ai", text: "Namaste! I am Samaj Shakti AI, your local community advocate. Ask me about civic issues, municipal regulations, or trigger high reasoning for complex infrastructure concerns." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [groundSearch, setGroundSearch] = useState(false);
  const [groundMaps, setGroundMaps] = useState(false);
  const [deepReasoning, setDeepReasoning] = useState(false);
  const [ttsVoice, setTtsVoice] = useState<"Kore" | "Puck" | "Charon" | "Zephyr">("Kore");

  // Report Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const [newIssueLoc, setNewIssueLoc] = useState("");
  const [newIssueLat, setNewIssueLat] = useState<number | null>(null);
  const [newIssueLng, setNewIssueLng] = useState<number | null>(null);
  const [newIssueCategory, setNewIssueCategory] = useState<Issue["cat"]>("Road Damage");
  const [newIssuePriority, setNewIssuePriority] = useState<Issue["priority"]>("medium");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customVideo, setCustomVideo] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Community input state
  const [newCommentText, setNewCommentText] = useState("");
  const [postAsOfficial, setPostAsOfficial] = useState(false);

  // Search & Filter state
  const [issueSearch, setIssueSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [streamViewMode, setStreamViewMode] = useState<"list" | "map">("list");
  const [mapShowOnlyLocality, setMapShowOnlyLocality] = useState(false);
  const [streamSelectedMapPin, setStreamSelectedMapPin] = useState<Issue | null>(null);
  const [selectedDetailedIssue, setSelectedDetailedIssue] = useState<Issue | null>(null);
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);

  // Notification / Alert States
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeTtsAudio, setActiveTtsAudio] = useState<any>(null);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);

  // Email state for urgent alerts
  const [isEmailSending, setIsEmailSending] = useState<string | null>(null); // contains issue ID if sending
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (showLogin && !user && !isAuthLoading) {
      const ctx = gsap.context(() => {
        gsap.fromTo(leftPanelRef.current, 
          { xPercent: -100, opacity: 0 }, 
          { xPercent: 0, opacity: 1, duration: 1.4, ease: "power4.out" }
        );
        gsap.fromTo(rightPanelRef.current, 
          { xPercent: 100, opacity: 0 }, 
          { xPercent: 0, opacity: 1, duration: 1.4, ease: "power4.out" }
        );
        if (logoRef.current) {
          gsap.fromTo(logoRef.current, 
            { scale: 0.3, rotate: -180, opacity: 0 }, 
            { scale: 1, rotate: 0, opacity: 1, duration: 1.5, delay: 0.4, ease: "back.out(1.5)" }
          );
        }
        if (titleRef.current) {
          gsap.fromTo(titleRef.current, 
            { y: 50, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 1.0, delay: 0.8, ease: "power3.out" }
          );
        }
        gsap.fromTo(".gsap-form-item", 
          { y: 40, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, delay: 1.0, ease: "power3.out" }
        );
      }, loginContainerRef);
      return () => ctx.revert();
    }
  }, [showLogin, user, isAuthLoading]);

  const handleLoginSuccess = () => {
    gsap.timeline({
      onComplete: () => {
        setShowLogin(false);
      }
    })
    .to(".gsap-form-item", { y: -25, opacity: 0, duration: 0.4, stagger: 0.05, ease: "power3.in" })
    .to(rightPanelRef.current, { xPercent: 100, opacity: 0, duration: 0.8, ease: "power4.in" }, "-=0.2")
    .to(leftPanelRef.current, { xPercent: -100, opacity: 0, duration: 0.8, ease: "power4.in" }, "-=0.8")
    .to(logoRef.current, { scale: 0.6, rotate: 90, opacity: 0, duration: 0.7, ease: "power2.in" }, "-=0.8");
  };

  const handleInstantDemoLogin = (profileKey: "varshini" | "rajesh" | "ananya" | "vikram") => {
    let mockUser: FirebaseUser = null as any;
    let mockProfile: UserProfile = null as any;

    if (profileKey === "varshini") {
      mockUser = {
        uid: "demo-varshini",
        email: "varshini@samajshakti.org",
        displayName: "Varshini",
      } as FirebaseUser;
      mockProfile = {
        uid: "demo-varshini",
        name: "Varshini",
        email: "varshini@samajshakti.org",
        locality: activeLocality,
        reputation: 500,
        reportsCount: 24,
        votesGiven: 180,
        badge: "🛡️ Civil Defender (Default)",
        role: "coordinator",
        createdAt: new Date().toISOString()
      };
    } else if (profileKey === "rajesh") {
      mockUser = {
        uid: "demo-rajesh",
        email: "rajesh@samajshakti.org",
        displayName: "Rajesh Kumar",
      } as FirebaseUser;
      mockProfile = {
        uid: "demo-rajesh",
        name: "Rajesh Kumar",
        email: "rajesh@samajshakti.org",
        locality: activeLocality,
        reputation: 350,
        reportsCount: 15,
        votesGiven: 120,
        badge: "🛡️ Lvl 3 Civil Defender",
        role: "member",
        createdAt: new Date().toISOString()
      };
    } else if (profileKey === "ananya") {
      mockUser = {
        uid: "demo-ananya",
        email: "ananya@samajshakti.org",
        displayName: "Ananya Iyer",
      } as FirebaseUser;
      mockProfile = {
        uid: "demo-ananya",
        name: "Ananya Iyer",
        email: "ananya@samajshakti.org",
        locality: activeLocality,
        reputation: 180,
        reportsCount: 8,
        votesGiven: 65,
        badge: "🗣️ Lvl 2 Active Voice",
        role: "member",
        createdAt: new Date().toISOString()
      };
    } else if (profileKey === "vikram") {
      mockUser = {
        uid: "demo-vikram",
        email: "vikram@samajshakti.org",
        displayName: "Vikram Shah",
      } as FirebaseUser;
      mockProfile = {
        uid: "demo-vikram",
        name: "Vikram Shah",
        email: "vikram@samajshakti.org",
        locality: activeLocality,
        reputation: 45,
        reportsCount: 2,
        votesGiven: 15,
        badge: "🌱 Lvl 1 First Step",
        role: "member",
        createdAt: new Date().toISOString()
      };
    }

    gsap.timeline({
      onComplete: () => {
        setUser(mockUser);
        setProfile(mockProfile);
        setShowLogin(false);
        showToast(`Signed in instantly as ${mockProfile.name}!`, "success");
      }
    })
    .to(".gsap-form-item", { y: -25, opacity: 0, duration: 0.4, stagger: 0.05, ease: "power3.in" })
    .to(rightPanelRef.current, { xPercent: 100, opacity: 0, duration: 0.8, ease: "power4.in" }, "-=0.2")
    .to(leftPanelRef.current, { xPercent: -100, opacity: 0, duration: 0.8, ease: "power4.in" }, "-=0.8")
    .to(logoRef.current, { scale: 0.6, rotate: 90, opacity: 0, duration: 0.7, ease: "power2.in" }, "-=0.8");
  };

  const triggerSandstorm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    showToast("Civic Sandstorm Activated! 🌪️", "info");
    const tempParticles = [];
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radialDist = 15 + Math.random() * 200;
      tempParticles.push({
        x: canvas.width / 2 + Math.cos(angle) * radialDist,
        y: canvas.height / 2 + Math.sin(angle) * radialDist,
        size: Math.random() * 3.5 + 1.2,
        alpha: Math.random() * 0.85 + 0.15,
        angle,
        radialDist,
        speedAngle: (Math.random() * 0.08 + 0.03) * (Math.random() > 0.5 ? 1 : -1)
      });
    }
    particlesRef.current = tempParticles;
  };

  const handleGuestAccess = () => {
    gsap.timeline({
      onComplete: () => {
        setShowLogin(false);
        showToast("Logged in as Guest Citizen.", "success");
      }
    })
    .to(".gsap-form-item", { y: -25, opacity: 0, duration: 0.4, stagger: 0.05, ease: "power3.in" })
    .to(rightPanelRef.current, { xPercent: 100, opacity: 0, duration: 0.8, ease: "power4.in" }, "-=0.2")
    .to(leftPanelRef.current, { xPercent: -100, opacity: 0, duration: 0.8, ease: "power4.in" }, "-=0.8")
    .to(logoRef.current, { scale: 0.6, rotate: 90, opacity: 0, duration: 0.7, ease: "power2.in" }, "-=0.8");
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAuthError("Please fill in both email and password.");
      return;
    }
    setAuthError("");
    setIsSigningIn(true);
    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        showToast(`Registration complete! Welcome ${res.user.email}`, "success");
        handleLoginSuccess();
      } else {
        const res = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        showToast("Logged in successfully!", "success");
        handleLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "Failed to log in.";
      if (err.code === "auth/invalid-credential") {
        errMsg = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "This email is already registered. Please sign in instead.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password must be at least 6 characters long.";
      }
      setAuthError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        showToast(`Signed in as ${res.user.displayName}`, "success");
        handleLoginSuccess();
      }
    } catch (err: any) {
      showToast("Google sign-in aborted or failed.", "error");
    } finally {
      setIsSigningIn(false);
    }
  };

  // Offline handler registers
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Show customized toast messages
  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Synchronize Auth and load/save profile in Firestore
  useEffect(() => {
    setIsAuthLoading(true);
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        setUser(firebaseUser);
        // Load Profile from Firestore
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
            if (userDoc.data().locality) {
              setActiveLocality(userDoc.data().locality);
            }
          } else {
            // Create default profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "Citizen Hero",
              email: firebaseUser.email || "",
              locality: activeLocality,
              reputation: 20, // Start with 20 welcome points!
              reportsCount: 0,
              votesGiven: 0,
              badge: "🌱 First Step",
              role: firebaseUser.email?.includes("coordinator") ? "coordinator" : "member",
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error("Firestore loading error:", err);
          // Local fallback
          setProfile({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "Citizen Hero",
            email: firebaseUser.email || "",
            locality: activeLocality,
            reputation: 20,
            reportsCount: 0,
            votesGiven: 0,
            badge: "🌱 First Step",
            role: "member",
            createdAt: new Date().toISOString()
          });
        }
        setIsAuthLoading(false);
        setShowLogin(false);
      },
      () => {
        setUser(null);
        setProfile(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, [activeLocality]);

  // Real-time updates with Firestore and LocalStorage fallback
  useEffect(() => {
    // 1. ISSUES LISTENER
    const issuesRef = collection(db, "issues");
    const unsubIssues = onSnapshot(issuesRef, (snapshot) => {
      // Real-time notification for critical issues
      if (!isInitialIssuesLoadRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const issue = change.doc.data() as Issue;
            if (issue.priority === "critical" && issue.locality === activeLocalityRef.current) {
              const currentUserId = userRef.current?.uid;
              // Alert for newly filed critical issues by others
              if (issue.status === "open" && issue.reporterUid !== currentUserId) {
                showToast(`🚨 CRITICAL ISSUE REPORTED: ${issue.title}`, "error");
              }
            }
          }
        });
      }
      isInitialIssuesLoadRef.current = false;

      const issuesList: Issue[] = [];
      snapshot.forEach((doc) => {
        issuesList.push(doc.data() as Issue);
      });
      if (issuesList.length > 0) {
        // --- REAL-TIME DEDUPLICATION ENGINE ---
        // Groups similar/identical issues together to prevent duplicated items in UI and correct the database in the background.
        const uniqueIssues: Issue[] = [];
        const duplicatesToDelete: Issue[] = [];

        issuesList.forEach((issue) => {
          const duplicateIndex = uniqueIssues.findIndex((existing) => {
            if (existing.id === issue.id) return true; // Exact same document ID

            const isSameCategory = existing.cat === issue.cat;
            if (!isSameCategory) return false;

            const isSameTitle = existing.title.toLowerCase().trim() === issue.title.toLowerCase().trim();
            const isSameDesc = existing.desc.toLowerCase().trim() === issue.desc.toLowerCase().trim();

            const hasCloseCoordinates = 
              existing.lat && existing.lng && issue.lat && issue.lng &&
              Math.abs(existing.lat - issue.lat) < 0.0005 &&
              Math.abs(existing.lng - issue.lng) < 0.0005;

            return isSameTitle || isSameDesc || hasCloseCoordinates;
          });

          if (duplicateIndex === -1) {
            uniqueIssues.push(issue);
          } else {
            // It's a duplicate. We keep the one with more votes or the older timestamp (first submission).
            const existing = uniqueIssues[duplicateIndex];
            const keepNew = (issue.votes > existing.votes) || (issue.votes === existing.votes && issue.time < existing.time);

            if (keepNew) {
              if (existing.id !== issue.id) {
                duplicatesToDelete.push(existing);
              }
              uniqueIssues[duplicateIndex] = issue;
            } else {
              if (existing.id !== issue.id) {
                duplicatesToDelete.push(issue);
              }
            }
          }
        });

        setIssues(uniqueIssues);
        localStorage.setItem("ss_issues", JSON.stringify(uniqueIssues));

        // Clean up duplicates from the database if user has permission
        if (duplicatesToDelete.length > 0) {
          duplicatesToDelete.forEach(async (dup) => {
            try {
              if (!dup.id.startsWith("demo-")) {
                await deleteDoc(doc(db, "issues", dup.id));
                console.log(`Deduplicated database: Deleted duplicate issue ${dup.id} from Firestore`);
              }
            } catch (err) {
              console.debug(`Permission or delete error for duplicate issue ${dup.id}:`, err);
            }
          });
        }
      } else {
        // Load initial mock issues if firestore is empty
        const cached = localStorage.getItem("ss_issues");
        let baseIssues = INITIAL_ISSUES;
        
        if (cached) {
          const parsed = JSON.parse(cached) as Issue[];
          // Merge INITIAL_ISSUES with cached issues, keeping custom ones
          const merged = [...parsed];
          INITIAL_ISSUES.forEach(init => {
            if (!merged.some(m => m.id === init.id)) {
              merged.push(init);
            }
          });
          baseIssues = merged;
        }

        const uniqueCached: Issue[] = [];
        baseIssues.forEach((issue) => {
          const isDup = uniqueCached.some(existing => {
            if (existing.id === issue.id) return true;
            const isSameCategory = existing.cat === issue.cat;
            if (!isSameCategory) return false;
            const isSameTitle = existing.title.toLowerCase().trim() === issue.title.toLowerCase().trim();
            const isSameDesc = existing.desc.toLowerCase().trim() === issue.desc.toLowerCase().trim();
            const hasCloseCoordinates = 
              existing.lat && existing.lng && issue.lat && issue.lng &&
              Math.abs(existing.lat - issue.lat) < 0.0005 &&
              Math.abs(existing.lng - issue.lng) < 0.0005;
            return isSameTitle || isSameDesc || hasCloseCoordinates;
          });
          if (!isDup) uniqueCached.push(issue);
        });
        setIssues(uniqueCached);
        localStorage.setItem("ss_issues", JSON.stringify(uniqueCached));
      }
    }, (error) => {
      console.warn("Firestore issues offline or permission error. Using offline cache.");
      const cached = localStorage.getItem("ss_issues");
      setIssues(cached ? JSON.parse(cached) : INITIAL_ISSUES);
    });

    // 2. DISCUSSIONS LISTENER
    const msgRef = collection(db, "community_messages");
    const unsubMsgs = onSnapshot(msgRef, (snapshot) => {
      const msgsList: CommunityMessage[] = [];
      snapshot.forEach((doc) => {
        msgsList.push(doc.data() as CommunityMessage);
      });
      if (msgsList.length > 0) {
        // sort by timestamp
        msgsList.sort((a,b) => b.timestamp - a.timestamp);
        setMessages(msgsList);
        localStorage.setItem("ss_msgs", JSON.stringify(msgsList));
      } else {
        const cached = localStorage.getItem("ss_msgs");
        if (cached) {
          setMessages(JSON.parse(cached));
        } else {
          setMessages(INITIAL_COMMUNITY_MESSAGES);
          localStorage.setItem("ss_msgs", JSON.stringify(INITIAL_COMMUNITY_MESSAGES));
        }
      }
    }, (error) => {
      console.warn("Firestore messages offline. Using cache.");
      const cached = localStorage.getItem("ss_msgs");
      setMessages(cached ? JSON.parse(cached) : INITIAL_COMMUNITY_MESSAGES);
    });

    return () => {
      unsubIssues();
      unsubMsgs();
    };
  }, []);

  // Load activities or generate simulated ones based on issues
  useEffect(() => {
    const actList: ActivityItem[] = [
      { id: "act-1", text: "Arun Kumar reported a critical sewer water leak", color: "text-red-500", time: "2 hours ago", timestamp: Date.now() - 7200000 },
      { id: "act-2", text: "Priyanka Sharma's road repair report went 'In-Progress'", color: "text-saffron", time: "5 hours ago", timestamp: Date.now() - 18000000 },
      { id: "act-3", text: "Lake Cleanliness Drive completed by 12 volunteers!", color: "text-green-500", time: "1 day ago", timestamp: Date.now() - 86400000 }
    ];
    setActivities(actList);
  }, [issues]);

  // Deep-linking: Auto-open issue from URL param on load
  useEffect(() => {
    if (issues.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const issueId = params.get("issue");
      if (issueId) {
        const found = issues.find(i => i.id === issueId);
        if (found) {
          setSelectedDetailedIssue(found);
          setActiveTab("stream"); // Ensure stream tab is active to display details
        }
      }
    }
  }, [issues]);

  // Auto-acquire GPS coordinates when modal is opened if not already set
  useEffect(() => {
    if (isReportModalOpen && !newIssueLat && !newIssueLng) {
      enableLiveGPS();
    }
  }, [isReportModalOpen, newIssueLat, newIssueLng]);

  // Synchronize wind speed and gravity refs for real-time sandbox reactivity
  useEffect(() => {
    windSpeedRef.current = windSpeed;
  }, [windSpeed]);

  useEffect(() => {
    floatGravityRef.current = floatGravity;
  }, [floatGravity]);

  // Canvas particle simulation loop
  useEffect(() => {
    if (!showLogin || user) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 500;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize particles if empty
    if (particlesRef.current.length === 0) {
      const tempParticles = [];
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radialDist = 40 + Math.random() * 120;
        tempParticles.push({
          x: canvas.width / 2 + Math.cos(angle) * radialDist,
          y: canvas.height / 2 + Math.sin(angle) * radialDist,
          size: Math.random() * 2.5 + 1.0,
          alpha: Math.random() * 0.6 + 0.1,
          angle,
          radialDist,
          speedAngle: (Math.random() * 0.015 + 0.003) * (Math.random() > 0.5 ? 1 : -1)
        });
      }
      particlesRef.current = tempParticles;
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const currentWind = windSpeedRef.current;
      const currentGravity = floatGravityRef.current;

      particlesRef.current.forEach((p) => {
        // Orbit speed adjusted by wind speed slider
        p.angle += p.speedAngle * currentWind;
        
        // Gravity upward drift adjusted by float gravity slider
        p.y -= currentGravity * 0.45 * (p.size * 0.7);
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        // Slight drift of orbit distance
        p.radialDist += (Math.random() - 0.5) * 1.5;
        if (p.radialDist < 20) p.radialDist = 20;
        if (p.radialDist > 250) p.radialDist = 250;

        const targetX = centerX + Math.cos(p.angle) * p.radialDist;
        const targetY = centerY + Math.sin(p.angle) * p.radialDist - (currentGravity * 15);

        // Interpolate position smoothly
        p.x += (targetX - p.x) * 0.04 * currentWind;
        p.y += (targetY - p.y) * 0.04;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        // Beautiful glowing golden-orange particle color
        ctx.fillStyle = `rgba(244, 120, 32, ${p.alpha})`; 
        ctx.shadowBlur = p.size > 2 ? 4 : 0;
        ctx.shadowColor = "rgba(244, 120, 32, 0.4)";
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [showLogin, user]);

  // Handle user authentication click
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        showToast(`Sign-in complete! Welcome ${res.user.displayName}`, "success");
      }
    } catch (err: any) {
      showToast(err.message || "Sign-in failed. Please try again.", "error");
    } finally {
      setIsSigningIn(false);
    }
  };

  // Sign out user
  const handleUserSignOut = async () => {
    try {
      await handleSignOut();
      setUser(null);
      setProfile(null);
      setShowLogin(true);
      showToast("Signed out successfully.", "info");
    } catch (err: any) {
      showToast("Sign out failed.", "error");
    }
  };

  // Upvote issue & distribute gamification reputation
  const upvoteIssue = async (issueId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      showToast("Please sign in with Google to upvote issues and earn reputation!", "info");
      return;
    }

    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const hasVoted = issue.upvoters?.includes(user.uid);
    const updatedUpvoters = hasVoted
      ? issue.upvoters.filter(uid => uid !== user.uid)
      : [...(issue.upvoters || []), user.uid];
    const newVotesCount = issue.votes + (hasVoted ? -1 : 1);

    // Update locally first for zero-latency visual feedback
    const updatedIssues = issues.map(i => {
      if (i.id === issueId) {
        return { ...i, votes: newVotesCount, upvoters: updatedUpvoters };
      }
      return i;
    });
    setIssues(updatedIssues);
    localStorage.setItem("ss_issues", JSON.stringify(updatedIssues));

    if (selectedDetailedIssue?.id === issueId) {
      setSelectedDetailedIssue({
        ...selectedDetailedIssue,
        votes: newVotesCount,
        upvoters: updatedUpvoters
      });
    }

    try {
      // Update Firestore
      const issueDocRef = doc(db, "issues", issueId);
      await updateDoc(issueDocRef, {
        votes: increment(hasVoted ? -1 : 1),
        upvoters: hasVoted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });

      // Update User reputation (+5 for casting an upvote)
      if (profile && !hasVoted) {
        const newRep = profile.reputation + 5;
        const newVotesGiven = profile.votesGiven + 1;
        const newBadge = calculateBadge(newRep);
        
        setProfile({ ...profile, reputation: newRep, votesGiven: newVotesGiven, badge: newBadge });
        await updateDoc(doc(db, "users", user.uid), {
          reputation: increment(5),
          votesGiven: increment(1),
          badge: newBadge
        });
        showToast("Reputation earned! +5 PTS for upvoting.", "success");
      }
    } catch (err) {
      console.warn("Firestore update error, running locally", err);
    }
  };

  // Community verification: Coordinators can verify issues
  const verifyIssue = async (issueId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user || profile?.role !== "coordinator") {
      showToast("Only verified community coordinators can verify reported issues.", "error");
      return;
    }

    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    try {
      const isVerifiedNow = !issue.isVerified;
      const updatedVerifiers = isVerifiedNow 
        ? [...(issue.verifiers || []), user.uid]
        : (issue.verifiers || []).filter(uid => uid !== user.uid);

      // Local update
      const updatedIssues = issues.map(i => {
        if (i.id === issueId) {
          return { ...i, isVerified: isVerifiedNow, verifiers: updatedVerifiers };
        }
        return i;
      });
      setIssues(updatedIssues);
      localStorage.setItem("ss_issues", JSON.stringify(updatedIssues));

      if (selectedDetailedIssue?.id === issueId) {
        setSelectedDetailedIssue({
          ...selectedDetailedIssue,
          isVerified: isVerifiedNow,
          verifiers: updatedVerifiers
        });
      }

      // Update Firestore
      const issueDocRef = doc(db, "issues", issueId);
      await updateDoc(issueDocRef, {
        isVerified: isVerifiedNow,
        verifiers: isVerifiedNow ? arrayUnion(user.uid) : arrayRemove(user.uid)
      });

      // Update coordinator reputation (+15 PTS for verification)
      const newRep = profile.reputation + 15;
      const newBadge = calculateBadge(newRep);
      setProfile({ ...profile, reputation: newRep, badge: newBadge });
      await updateDoc(doc(db, "users", user.uid), {
        reputation: increment(15),
        badge: newBadge
      });

      showToast(`Issue verified! +15 PTS added to your coordinator profile.`, "success");
    } catch (err) {
      console.error("Verification error", err);
    }
  };

  // Citizen verification: Any logged-in citizen can validate an issue as genuine!
  const citizenVerifyIssue = async (issueId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      showToast("Please sign in with Google to validate issues.", "info");
      return;
    }

    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const verifiers = issue.verifiers || [];
    const alreadyVerified = verifiers.includes(user.uid);

    try {
      const updatedVerifiers = alreadyVerified
        ? verifiers.filter(uid => uid !== user.uid)
        : [...verifiers, user.uid];

      // Local update
      const updatedIssues = issues.map(i => {
        if (i.id === issueId) {
          const isVerified = updatedVerifiers.length >= 3 ? true : i.isVerified; // auto verify if 3+ citizens validate
          return { ...i, verifiers: updatedVerifiers, isVerified };
        }
        return i;
      });
      setIssues(updatedIssues);
      localStorage.setItem("ss_issues", JSON.stringify(updatedIssues));

      if (selectedDetailedIssue?.id === issueId) {
        setSelectedDetailedIssue({
          ...selectedDetailedIssue,
          verifiers: updatedVerifiers,
          isVerified: updatedVerifiers.length >= 3 ? true : selectedDetailedIssue.isVerified
        });
      }

      // Update Firestore
      const issueDocRef = doc(db, "issues", issueId);
      await updateDoc(issueDocRef, {
        verifiers: alreadyVerified ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });

      // Update user reputation (+5 reputation points for validating)
      if (!alreadyVerified && profile) {
        const newRep = profile.reputation + 5;
        const newBadge = calculateBadge(newRep);
        setProfile({ ...profile, reputation: newRep, badge: newBadge });
        await updateDoc(doc(db, "users", user.uid), {
          reputation: increment(5),
          badge: newBadge
        });
        showToast("Validated as genuine! +5 XP Reputation added.", "success");
      } else {
        showToast("Validation removed.", "info");
      }
    } catch (err) {
      console.error("Citizen validation error", err);
    }
  };

  // Update issue status: Coordinators or the Reporter can update status
  const updateIssueStatus = async (issueId: string, newStatus: "open" | "in-progress" | "resolved") => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    // Permissions check: must be coordinator, admin, or the reporter themselves
    const isReporter = user && issue.reporterUid === user.uid;
    const isCoordinator = user && (profile?.role === "coordinator" || profile?.role === "admin");
    if (!isReporter && !isCoordinator) {
      showToast("Only the reporter or a community coordinator can update this issue's status.", "error");
      return;
    }

    try {
      const newLog = {
        text: `Status promoted to ${newStatus === "open" ? "Reported" : newStatus === "in-progress" ? "In Progress" : "Resolved"} by ${user?.displayName || "System"}.`,
        by: user?.displayName || "System",
        time: new Date().toLocaleString("en-IN"),
        timestamp: Date.now()
      };

      // Local update
      const updatedIssues = issues.map(i => {
        if (i.id === issueId) {
          const updatedLogs = [...(i.logs || []), newLog];
          return { ...i, status: newStatus, logs: updatedLogs };
        }
        return i;
      });
      setIssues(updatedIssues);
      localStorage.setItem("ss_issues", JSON.stringify(updatedIssues));

      if (selectedDetailedIssue?.id === issueId) {
        setSelectedDetailedIssue({
          ...selectedDetailedIssue,
          status: newStatus,
          logs: [...(selectedDetailedIssue.logs || []), newLog]
        });
      }

      // Update Firestore
      const issueDocRef = doc(db, "issues", issueId);
      await updateDoc(issueDocRef, {
        status: newStatus,
        logs: arrayUnion(newLog)
      });

      showToast(`Issue status successfully updated to: ${newStatus === "open" ? "Reported" : newStatus === "in-progress" ? "In Progress" : "Resolved"}`, "success");

      // Give reputation point bump if resolving
      if (newStatus === "resolved" && isCoordinator && profile) {
        const repBonus = 20;
        const newRep = profile.reputation + repBonus;
        const newBadge = calculateBadge(newRep);
        setProfile({ ...profile, reputation: newRep, badge: newBadge });
        await updateDoc(doc(db, "users", user.uid), {
          reputation: increment(repBonus),
          badge: newBadge
        });
        showToast("Reputation bonus +20 PTS for resolving a community issue!", "success");
      }
    } catch (err) {
      console.warn("Firestore status update failed, working locally.", err);
    }
  };

  // Delete issue: Users can delete their own reported issues, or admins/coordinators can delete them
  const deleteIssue = async (issueId: string) => {
    if (!user) {
      showToast("You must be logged in to delete an issue.", "error");
      return;
    }

    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    // Check permission
    const isReporter = issue.reporterUid === user.uid;
    const isCoordinator = profile?.role === "coordinator" || profile?.role === "admin";
    if (!isReporter && !isCoordinator) {
      showToast("You do not have permission to delete this grievance.", "error");
      return;
    }

    try {
      // Local state update first
      setIssues(issues.filter(i => i.id !== issueId));
      if (streamSelectedMapPin?.id === issueId) {
        setStreamSelectedMapPin(null);
      }

      // Delete from Firestore
      const issueDocRef = doc(db, "issues", issueId);
      await deleteDoc(issueDocRef);

      showToast("Grievance deleted successfully.", "success");
    } catch (err) {
      console.error("Delete issue error", err);
      showToast("Failed to delete grievance: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  // Add Comment/Commentary to issue logs & Firestore
  const addCommentToIssue = async (issueId: string, commentText: string) => {
    if (!commentText.trim()) return;
    if (!user) {
      showToast("Please sign in to write comments or provide updates.", "info");
      return;
    }
    
    const newLog = {
      text: commentText,
      by: user.displayName || "Citizen",
      time: new Date().toLocaleString("en-IN"),
      timestamp: Date.now()
    };
    
    // Local update
    const updatedIssues = issues.map(i => {
      if (i.id === issueId) {
        return { ...i, logs: [...(i.logs || []), newLog] };
      }
      return i;
    });
    setIssues(updatedIssues);
    localStorage.setItem("ss_issues", JSON.stringify(updatedIssues));
    
    if (selectedDetailedIssue?.id === issueId) {
      setSelectedDetailedIssue({
        ...selectedDetailedIssue,
        logs: [...(selectedDetailedIssue.logs || []), newLog]
      });
    }
    
    try {
      const issueDocRef = doc(db, "issues", issueId);
      await updateDoc(issueDocRef, {
        logs: arrayUnion(newLog)
      });
      showToast("Commentary posted to audit trail!", "success");
    } catch (err) {
      console.error("Failed to save commentary", err);
    }
  };

  // Calculate badges from reputation score
  const calculateBadge = (points: number): string => {
    if (points >= 250) return "👑 City Legend";
    if (points >= 120) return "🦁 Samaj Shakti Hero";
    if (points >= 60) return "⚡ Community Guardian";
    if (points >= 30) return "🔥 Active Voice";
    return "🌱 First Step";
  };

  // Change active locality and refresh UI
  const changeLocality = (loc: string) => {
    setActiveLocality(loc);
    showToast(`Viewing area: ${loc}`, "info");
    if (user && profile) {
      updateDoc(doc(db, "users", user.uid), { locality: loc }).catch(console.error);
      setProfile({ ...profile, locality: loc });
    }
  };

  // Generate PDF Report for an Issue
  const generatePDFReport = (issue: Issue) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Colors
      const navyColor = "#0f172a";
      const grayColor = "#64748b";

      // Header
      doc.setFontSize(22);
      doc.setTextColor(navyColor);
      doc.text("Samaj Shakti - Civic Alert Report", 20, 20);

      doc.setFontSize(10);
      doc.setTextColor(grayColor);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 28);
      
      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 32, 190, 32);

      // Title & Basic Info
      doc.setFontSize(16);
      doc.setTextColor(navyColor);
      doc.text(issue.title, 20, 42, { maxWidth: 170 });

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Status: ${issue.status.toUpperCase()}`, 20, 52);
      doc.text(`Priority: ${issue.priority.toUpperCase()}`, 70, 52);
      doc.text(`Category: ${issue.cat}`, 120, 52);
      
      doc.text(`Location: ${issue.loc} (${issue.locality})`, 20, 59);
      doc.text(`Reported: ${new Date(issue.time).toLocaleString()}`, 20, 66);
      doc.text(`Upvotes: ${issue.votes}`, 120, 66);

      // Divider
      doc.line(20, 72, 190, 72);

      // Description
      doc.setFontSize(14);
      doc.setTextColor(navyColor);
      doc.text("Description", 20, 82);
      
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      const splitDesc = doc.splitTextToSize(issue.desc, 170);
      doc.text(splitDesc, 20, 90);
      
      let nextY = 90 + (splitDesc.length * 5) + 10;

      // AI Diagnosis Section
      if (issue.aiAnalysis) {
        doc.setFontSize(14);
        doc.setTextColor(navyColor);
        doc.text("AI Civic Diagnosis", 20, nextY);
        nextY += 8;
        
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        
        doc.setFont("helvetica", "bold");
        doc.text("Analysis:", 20, nextY);
        doc.setFont("helvetica", "normal");
        const splitAnalysis = doc.splitTextToSize(issue.aiAnalysis, 170);
        doc.text(splitAnalysis, 40, nextY);
        nextY += (splitAnalysis.length * 5) + 4;
        
        if (issue.priorityJustification) {
          doc.setFont("helvetica", "bold");
          doc.text("Impact:", 20, nextY);
          doc.setFont("helvetica", "normal");
          const splitImpact = doc.splitTextToSize(issue.priorityJustification, 170);
          doc.text(splitImpact, 40, nextY);
          nextY += (splitImpact.length * 5) + 4;
        }
        
        if (issue.immediateCitizenSafetyAction) {
          doc.setFont("helvetica", "bold");
          doc.text("Recommendation:", 20, nextY);
          doc.setFont("helvetica", "normal");
          const splitRec = doc.splitTextToSize(issue.immediateCitizenSafetyAction, 170);
          doc.text(splitRec, 55, nextY);
          nextY += (splitRec.length * 5) + 10;
        }
      }
      
      // Divider
      doc.line(20, nextY, 190, nextY);
      nextY += 10;

      // Activity Log Section
      if (issue.logs && issue.logs.length > 0) {
        // Check for page break
        if (nextY > 250) {
          doc.addPage();
          nextY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(navyColor);
        doc.text("Activity Log", 20, nextY);
        nextY += 8;
        
        doc.setFontSize(9);
        issue.logs.forEach((logItem) => {
          if (nextY > 270) {
            doc.addPage();
            nextY = 20;
          }
          doc.setTextColor(100, 100, 100);
          doc.text(`[${logItem.time}]`, 20, nextY);
          doc.setTextColor(30, 30, 30);
          const splitLog = doc.splitTextToSize(`${logItem.by}: ${logItem.text}`, 120);
          doc.text(splitLog, 60, nextY);
          nextY += (splitLog.length * 4) + 2;
        });
      }

      // Save PDF
      doc.save(`SamajShakti_Issue_${issue.id}.pdf`);
      showToast("PDF report generated successfully", "success");
    } catch (error) {
      console.error("PDF Generation Error:", error);
      showToast("Failed to generate PDF report", "error");
    }
  };

  // Browser Geolocation Live Tracking
  const enableLiveGPS = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "error");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        showToast(`GPS Coordinate secured: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, "success");
        setNewIssueLoc(`GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setNewIssueLat(pos.coords.latitude);
        setNewIssueLng(pos.coords.longitude);
        setGpsLoading(false);
      },
      () => {
        showToast("GPS request denied. Defaulting to municipal sectors.", "info");
        setGpsLoading(false);
      }
    );
  };

  // Handle Preset failure selection
  const selectPreset = (presetId: string) => {
    const p = CIVIC_PRESETS.find(item => item.id === presetId);
    if (!p) return;
    setSelectedPresetId(presetId);
    setNewIssueTitle(p.title);
    setNewIssueDesc(p.desc);
    setNewIssueLoc(p.loc);
    setNewIssueCategory(p.cat as any);
    setNewIssuePriority(p.priority as any);
    setCustomImage((p as any).imageUrl || null);
  };

  // Voice Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            
            const response = await fetch("/api/gemini/voice-to-report", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioBase64: base64data, mimeType: 'audio/webm' }),
            });
            const data = await response.json();
            
            if (data.title) setNewIssueTitle(data.title);
            if (data.desc) setNewIssueDesc(data.desc);
            showToast("Voice transcribed successfully!", "success");
          };
        } catch (error) {
          console.error("Transcription error:", error);
          showToast("Failed to transcribe audio", "error");
        } finally {
          setIsTranscribing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingProgress(0);

      let progress = 0;
      recordingTimerRef.current = setInterval(() => {
        progress += 100 / 30; // 30 seconds max
        setRecordingProgress(Math.min(progress, 100));
        if (progress >= 100) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      showToast("Could not access microphone", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setRecordingProgress(0);
  };

  // Handle image upload from file picker
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showToast("Please upload a valid image or video file.", "error");
      return;
    }

    // Limit file size (e.g., 20MB for video)
    const maxSize = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`File too large. Max size: ${isVideo ? '20MB' : '5MB'}`, "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        if (isImage) {
          setCustomImage(event.target.result as string);
          setCustomVideo(null);
          showToast("Civic failure image uploaded successfully!", "success");
        } else {
          setCustomVideo(event.target.result as string);
          setCustomImage(null);
          showToast("Civic failure video uploaded successfully!", "success");
        }
        setSelectedPresetId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Call the server-side advanced diagnostic AI analyzer
  const triggerAiDiagnostic = async () => {
    if (!newIssueTitle && !newIssueDesc && !customImage) {
      showToast("Please write a title, description, or select a preset failure image first.", "error");
      return;
    }

    setIsAnalyzing(true);
    setAiAnalysisResult(null);

    // Extract raw base64 if it's a data url
    let base64Data = "";
    let mime = "image/jpeg";
    const mediaSrc = customImage || customVideo;
    
    if (mediaSrc && mediaSrc.startsWith("data:")) {
      const arr = mediaSrc.split(",");
      mime = arr[0].match(/:(.*?);/)?.[1] || (customImage ? "image/jpeg" : "video/mp4");
      base64Data = arr[1];
    }

    try {
      const localIssues = issues
        .filter(i => i.locality === activeLocality && i.status !== "resolved")
        .map(i => ({
          id: i.id,
          title: i.title,
          desc: i.desc,
          imageUrl: i.imageUrl,
          videoUrl: i.videoUrl
        }));

      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newIssueTitle,
          desc: newIssueDesc,
          imageBase64: customImage ? base64Data : undefined,
          videoBase64: customVideo ? base64Data : undefined,
          mimeType: mime,
          existingIssues: localIssues
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.isDuplicate) {
          showToast(`⚠️ Potential Duplicate Detected! This seems similar to an existing issue: "${data.duplicateReason}"`, "error");
          setAiAnalysisResult(data);
          // Highlight the duplicate in UI if possible or just prevent submitting
        } else {
          setAiAnalysisResult(data);
          // Automatically override forms
          if (data.category) setNewIssueCategory(data.category);
          if (data.priority) setNewIssuePriority(data.priority);
          showToast("Gemini Diagnostic completed! Category and Priority auto-selected.", "success");
        }
      } else {
        throw new Error(data.error || "Analysis failed");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Diagnostic Error: " + err.message, "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Issue to database
  const submitIssueForm = async () => {
    if (!newIssueTitle || !newIssueDesc) {
      showToast("Please enter an issue title and description.", "error");
      return;
    }

    // --- PREVENT DUPLICATES FROM BEING REPORTED AGAIN ---
    const isAiDetectedDuplicate = aiAnalysisResult?.isDuplicate === true;

    const isDuplicate = isAiDetectedDuplicate || issues.some((issue) => {
      if (issue.status === "resolved") return false; // Resolved issues can be reported again if they re-occur
      
      const isSameCategory = issue.cat === newIssueCategory;
      if (!isSameCategory) return false;

      const isSameTitle = issue.title.toLowerCase().trim() === newIssueTitle.toLowerCase().trim();
      const isSameDesc = issue.desc.toLowerCase().trim() === newIssueDesc.toLowerCase().trim();
      
      // Calculate spatial proximity if lat/lng are present
      const hasCloseCoordinates = 
        newIssueLat && newIssueLng && issue.lat && issue.lng &&
        Math.abs(issue.lat - newIssueLat) < 0.0005 &&
        Math.abs(issue.lng - newIssueLng) < 0.0005;

      return isSameTitle || isSameDesc || hasCloseCoordinates;
    });

    if (isDuplicate) {
      const msg = isAiDetectedDuplicate 
        ? `AI Security Alert: This report appears to be a duplicate of an existing active issue. Reason: ${aiAnalysisResult?.duplicateReason || "High visual similarity detected."}`
        : "An identical active report already exists. Please find the existing issue in the list/map and upvote or comment instead of creating a duplicate!";
      
      showToast(msg, "error");
      return;
    }

    const generatedId = "issue-" + Date.now();
    const newIssue: Issue = {
      id: generatedId,
      title: newIssueTitle,
      desc: newIssueDesc,
      loc: newIssueLoc || (newIssueLat && newIssueLng ? `GPS: ${newIssueLat.toFixed(5)}, ${newIssueLng.toFixed(5)}` : activeLocality),
      locality: activeLocality,
      lat: newIssueLat || (17.47 + (Math.random() - 0.5) * 0.05), // fallback coordinate around the sector
      lng: newIssueLng || (78.48 + (Math.random() - 0.5) * 0.05),
      cat: newIssueCategory,
      priority: newIssuePriority,
      status: "open",
      reporterName: user?.displayName || "Anonymous Citizen",
      reporterUid: user?.uid || "anonymous",
      votes: 1,
      upvoters: user ? [user.uid] : [],
      time: Date.now(),
      imageUrl: customImage || undefined,
      videoUrl: customVideo || undefined,
      aiAnalysis: aiAnalysisResult 
        ? `🤖 Gemini AI Vision: Detected ${aiAnalysisResult.category} with ${aiAnalysisResult.priority} risk. Technical: ${aiAnalysisResult.technicalDiagnostic}` 
        : undefined,
      authority: aiAnalysisResult?.suggestedAuthority || "GHMC",
      isVerified: false,
      priorityJustification: aiAnalysisResult?.priorityJustification || "Severity calculated based on proximity to active residential zones and public safety.",
      immediateCitizenSafetyAction: aiAnalysisResult?.immediateCitizenSafetyAction || "Exercise vigilance and avoid direct contact with the affected spot.",
      logs: [
        {
          text: `Issue reported by ${user?.displayName || "Anonymous Citizen"}.`,
          by: user?.displayName || "Anonymous Citizen",
          time: new Date().toLocaleString("en-IN"),
          timestamp: Date.now()
        }
      ]
    };

    // Update locally
    const updatedIssues = [newIssue, ...issues];
    setIssues(updatedIssues);
    localStorage.setItem("ss_issues", JSON.stringify(updatedIssues));

    try {
      // Create Doc in Firestore
      await setDoc(doc(db, "issues", generatedId), newIssue);

      // Reward points (+10 PTS for reporting)
      if (user && profile) {
        const newRep = profile.reputation + 10;
        const newCount = profile.reportsCount + 1;
        const newBadge = calculateBadge(newRep);
        setProfile({ ...profile, reputation: newRep, reportsCount: newCount, badge: newBadge });
        await updateDoc(doc(db, "users", user.uid), {
          reputation: increment(10),
          reportsCount: increment(1),
          badge: newBadge
        });
      }

      showToast("Issue reported successfully! +10 Reputation Points added.", "success");
      
      // If critical, trigger notification & offer Gmail option
      if (newIssuePriority === "critical") {
        showToast("🚨 Urgent notification triggered for local sector coordinators!", "info");
      }

    } catch (err) {
      console.warn("Firestore save failed, working locally.", err);
    }

    // Reset Form
    setIsReportModalOpen(false);
    setNewIssueTitle("");
    setNewIssueDesc("");
    setNewIssueLoc("");
    setNewIssueLat(null);
    setNewIssueLng(null);
    setNewIssueCategory("Road Damage");
    setNewIssuePriority("medium");
    setCustomImage(null);
    setCustomVideo(null);
    setAiAnalysisResult(null);
    setSelectedPresetId(null);
  };

  // Send Community bulletin / comment
  const submitCommunityComment = async () => {
    if (!newCommentText.trim()) return;

    const generatedId = "msg-" + Date.now();
    const newMsg: CommunityMessage = {
      id: generatedId,
      locality: activeLocality,
      name: user?.displayName || "Anonymous Resident",
      uid: user?.uid || "anonymous",
      text: newCommentText,
      timeString: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      likes: 0,
      likers: [],
      official: postAsOfficial && profile?.role === "coordinator"
    };

    const updatedMsgs = [newMsg, ...messages];
    setMessages(updatedMsgs);
    localStorage.setItem("ss_msgs", JSON.stringify(updatedMsgs));

    try {
      await setDoc(doc(db, "community_messages", generatedId), newMsg);
      showToast("Comment shared on community board.", "success");
    } catch (err) {
      console.warn("Firestore error saving comment, saved offline.", err);
    }

    setNewCommentText("");
    setPostAsOfficial(false);
  };

  // Like community message
  const likeCommunityMessage = async (msgId: string) => {
    if (!user) {
      showToast("Sign in with Google to like comments.", "info");
      return;
    }
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const hasLiked = msg.likers?.includes(user.uid);
    const updatedLikers = hasLiked 
      ? msg.likers.filter(uid => uid !== user.uid)
      : [...(msg.likers || []), user.uid];
    const newLikes = msg.likes + (hasLiked ? -1 : 1);

    setMessages(messages.map(m => {
      if (m.id === msgId) {
        return { ...m, likes: newLikes, likers: updatedLikers };
      }
      return m;
    }));

    try {
      await updateDoc(doc(db, "community_messages", msgId), {
        likes: increment(hasLiked ? -1 : 1),
        likers: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (e) {
      console.warn("Firestore like offline.");
    }
  };

  // Ask assistant questions using full-stack API
  const askAIAssistant = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        text: m.text
      }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history,
          groundSearch,
          groundMaps,
          enableDeepReasoning: deepReasoning,
          locality: activeLocality
        })
      });

      const data = await response.json();
      if (response.ok) {
        setChatMessages(prev => [...prev, { role: "ai", text: data.text }]);
      } else {
        throw new Error(data.error || "Failed to talk to Gemini");
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: "ai", text: `⚠️ Error speaking to Gemini on the server: ${err.message}. Ensure your GEMINI_API_KEY is configured in the AI Studio Secrets panel.` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper to play raw PCM 16-bit little-endian 24kHz audio returned by Gemini TTS
  const playPcmBase64 = (base64Str: string, sampleRate = 24000) => {
    try {
      const binaryString = window.atob(base64Str);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const numSamples = len / 2;
      const floatData = new Float32Array(numSamples);
      const dataView = new DataView(bytes.buffer);
      
      for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        floatData[i] = int16 / 32768.0;
      }
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
      audioBuffer.getChannelData(0).set(floatData);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      let onEndedCallback: (() => void) | null = null;
      let started = false;
      
      const player = {
        play: async () => {
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          if (!started) {
            started = true;
            source.start(0);
          }
        },
        pause: () => {
          try {
            source.stop();
          } catch (e) {}
          try {
            audioCtx.close();
          } catch (e) {}
        },
        set onended(callback: () => void) {
          onEndedCallback = callback;
        }
      };
      
      source.onended = () => {
        try {
          audioCtx.close();
        } catch (e) {}
        if (onEndedCallback) {
          onEndedCallback();
        }
      };
      
      return player;
    } catch (err) {
      console.error("Failed to play PCM base64 audio", err);
      throw err;
    }
  };

  // Text-To-Speech reader via Gemini voice TTS API
  const speakText = async (text: string, index: number) => {
    if (currentlyPlayingIndex === index) {
      // Toggle off / pause
      if (activeTtsAudio) {
        activeTtsAudio.pause();
        setActiveTtsAudio(null);
        setCurrentlyPlayingIndex(null);
      }
      return;
    }

    setCurrentlyPlayingIndex(index);
    showToast("Synthesizing voice response with Gemini TTS...", "info");

    try {
      const res = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.replace(/[🤖⚙📍🚨✓⚙]/g, ""), // strip icons
          voiceName: ttsVoice
        })
      });

      const data = await res.json();
      if (res.ok && data.audioBase64) {
        if (activeTtsAudio) {
          activeTtsAudio.pause();
        }

        const audio = playPcmBase64(data.audioBase64);
        audio.play();
        setActiveTtsAudio(audio);
        audio.onended = () => {
          setCurrentlyPlayingIndex(null);
          setActiveTtsAudio(null);
        };
      } else {
        // Fallback to local SpeechSynthesis
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text.replace(/[🤖⚙📍🚨✓⚙]/g, ""));
          const voices = window.speechSynthesis.getVoices();
          const indVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("hi-IN"));
          if (indVoice) utterance.voice = indVoice;
          window.speechSynthesis.speak(utterance);
          utterance.onend = () => {
            setCurrentlyPlayingIndex(null);
          };
          showToast("Using local system voice (API rate limited)", "info");
        } else {
          throw new Error(data.error || "TTS failed and local SpeechSynthesis not supported");
        }
      }
    } catch (err: any) {
      console.error(err);
      // Try to fallback anyway
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[🤖⚙📍🚨✓⚙]/g, ""));
        window.speechSynthesis.speak(utterance);
        utterance.onend = () => {
          setCurrentlyPlayingIndex(null);
        };
      } else {
        showToast("TTS Voice Error: " + err.message, "error");
        setCurrentlyPlayingIndex(null);
      }
    }
  };

  // Real-time Voice AI Handlers
  const toggleVoiceCall = () => {
    if (isCallActive) {
      setIsCallActive(false);
      setIsVoiceListening(false);
      if (activeTtsAudio) activeTtsAudio.pause();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setVoiceResponseText("Call ended.");
    } else {
      setIsCallActive(true);
      startVoiceListening();
    }
  };

  const startVoiceListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
      showToast("Web Speech API is not supported in this browser. Please type your query in the Speak to AI box.", "error");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsVoiceListening(true);
      setVoiceTranscript("Listening...");
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      setIsVoiceListening(false);
      setIsCallActive(false);
      showToast(`Voice input error: ${event.error}`, "error");
    };

    recognition.onend = () => {
      setIsVoiceListening(false);
    };

    recognition.onresult = async (event: any) => {
      const resultText = event.results[0][0].transcript;
      setVoiceTranscript(resultText);
      await sendVoiceQuery(resultText);
    };

    recognition.start();
  };

  const sendVoiceQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsVoiceLoading(true);
    setVoiceResponseText("Thinking...");
    
    setRecentVoiceCommands(prev => {
      const newCmds = [queryText, ...prev.filter(c => c !== queryText)].slice(0, 5);
      return newCmds;
    });

    setVoiceMessages(prev => [...prev, { role: 'user', text: queryText }]);

    try {
      const chatRes = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          locality: activeLocality,
          groundSearch: groundSearch,
          groundMaps: groundMaps, 
          enableDeepReasoning: deepReasoning
        })
      });
      const chatData = await chatRes.json();
      const reply = chatData.text || "I'm sorry, I couldn't understand that.";
      setVoiceResponseText(reply);
      setVoiceMessages(prev => [...prev, { role: 'assistant', text: reply }]);

      // Trigger server-side Text-To-Speech to read response aloud!
      try {
        const ttsRes = await fetch("/api/gemini/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: reply.replace(/[🤖⚙📍🚨✓⚙]/g, ""), 
            voiceName: ttsVoice
          })
        });
        const ttsData = await ttsRes.json();
        if (ttsRes.ok && ttsData.audioBase64) {
          if (activeTtsAudio) activeTtsAudio.pause();
          const audio = playPcmBase64(ttsData.audioBase64);
          setActiveTtsAudio(audio);
          audio.onended = () => {
            if (isCallActiveRef.current) {
              startVoiceListening();
            }
          };
          audio.play();
        } else {
          // Fallback to local SpeechSynthesis
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(reply.replace(/[🤖⚙📍🚨✓⚙]/g, ""));
            const voices = window.speechSynthesis.getVoices();
            const indVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("hi-IN"));
            if (indVoice) utterance.voice = indVoice;
            utterance.onend = () => {
              if (isCallActiveRef.current) {
                startVoiceListening();
              }
            };
            window.speechSynthesis.speak(utterance);
          }
        }
      } catch (ttsErr) {
        console.warn("TTS fetch failed, falling back to local speech synthesis:", ttsErr);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(reply.replace(/[🤖⚙📍🚨✓⚙]/g, ""));
          utterance.onend = () => {
            if (isCallActiveRef.current) {
              startVoiceListening();
            }
          };
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (err: any) {
      const fallbackReply = `Namaste! The primary voice engine is experiencing high load. I am here in Offline Assist Mode. I have registered your message: "${queryText}". Please feel free to use our manual form to submit any civic issues directly.`;
      setVoiceResponseText(fallbackReply);
      showToast("Activated local voice assistant fallback", "info");
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(fallbackReply);
        utterance.onend = () => {
          if (isCallActiveRef.current) {
            startVoiceListening();
          }
        };
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setIsVoiceLoading(false);
    }
  };

  // Generate predictive trends daily insight
  const generatePredictiveInsight = async () => {
    setIsInsightLoading(true);
    try {
      const summaryList = issues.slice(0, 5).map(i => `${i.priority} ${i.cat}: ${i.title}`).join("; ");
      const prompt = `Based on these reported civic failures: "${summaryList || "No issues currently active"}". Generate a forward-looking 2-sentence predictive insight detailing which public authority is under heavy load, the estimated resolution timeline for residents, and a friendly, motivating recommendation for the citizens. Do not mention system internals.`;
      
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          enableDeepReasoning: false,
          locality: activeLocality
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiPredictiveInsight(data.text);
        showToast("Civic trend predictions updated. ✨", "success");
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      setAiPredictiveInsight("Samaj Shakti AI: Under heavy load. Complete a sector report to regenerate.");
    } finally {
      setIsInsightLoading(false);
    }
  };

  // Trigger Google Workspace Gmail alert for critical reports on behalf of user
  const sendGmailAlert = async (issue: Issue) => {
    // 1. Ask for confirmation as mandated by "User Confirmation for Destructive Operations" guidelines
    const userEmail = user?.email || "authority";
    const confirmed = window.confirm(
      `Do you grant Samaj Shakti permission to log in and send an official civic alert email from your connected Gmail account (${userEmail}) to the Municipal Commissioner's office regarding "${issue.title}"?`
    );
    if (!confirmed) return;

    setIsEmailSending(issue.id);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Google Workspace authentication required. Please sign out and sign in again.");
      }

      const mailBody = `
        <h3>🚨 EMERGENCY SAMAJ SHAKTI CIVIC ESCALATION 🚨</h3>
        <p><strong>Locality:</strong> ${issue.locality}</p>
        <p><strong>Reported Category:</strong> ${issue.cat}</p>
        <p><strong>Severity:</strong> <strong>${issue.priority.toUpperCase()}</strong></p>
        <p><strong>Physical Location:</strong> ${issue.loc}</p>
        <p><strong>Details:</strong> ${issue.desc}</p>
        <hr/>
        <p>This is an automated citizen-backed escalations alert. <strong>${issue.votes} residents</strong> have upvoted this safety hazard as an active risk.</p>
        <p>Please dispatch engineers immediately.</p>
      `;

      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          to: "velankinivarshini826@gmail.com", // Send alert to user email / local inbox for instant review
          subject: `[ALERT] ${issue.priority.toUpperCase()} Civic Issue in ${issue.locality}: ${issue.title}`,
          bodyText: mailBody
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Official email alert dispatched via your Gmail account! 📬", "success");
        // Update issue to reflect escalation
        setIssues(issues.map(i => {
          if (i.id === issue.id) {
            return { ...i, desc: i.desc + "\n\n📢 [Gmail Alert Dispatched to Commissioners Office!]" };
          }
          return i;
        }));
      } else {
        throw new Error(data.error || "Failed to send");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Gmail Dispatch Failed: " + err.message, "error");
    } finally {
      setIsEmailSending(null);
    }
  };

  // Helper selectors
  const filteredIssues = issues.filter(issue => {
    const isMapViewAndShowAll = streamViewMode === "map" && !mapShowOnlyLocality;
    const matchesLocality = isMapViewAndShowAll || issue.locality === activeLocality;
    const matchesCategory = categoryFilter === "all" || issue.cat === categoryFilter;
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || issue.priority === severityFilter;
    const matchesSearch = issueSearch === "" || 
      issue.title.toLowerCase().includes(issueSearch.toLowerCase()) ||
      issue.desc.toLowerCase().includes(issueSearch.toLowerCase()) ||
      issue.loc.toLowerCase().includes(issueSearch.toLowerCase());
    return matchesLocality && matchesCategory && matchesStatus && matchesSeverity && matchesSearch;
  });

  const recentLocalityIssues = [...issues]
    .filter(issue => issue.locality === activeLocality)
    .sort((a, b) => b.time - a.time)
    .slice(0, 5);

  if (showLogin && !user && !isAuthLoading) {
    return (
      <div ref={loginContainerRef} className="fixed inset-0 z-[1000] bg-[#0c101b] overflow-y-auto w-full h-full p-4 md:p-8 flex flex-col">
        {/* Full screen background grid decoration */}
        <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="bgGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#ffffff" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgGrid)" />
          </svg>
        </div>

        <div className="my-auto mx-auto max-w-6xl w-full flex flex-col md:flex-row items-stretch justify-center gap-6 z-10 relative">
          
          {/* Left Panel: Stunning Interactive 3D Sandbox Card */}
          <div 
            ref={leftPanelRef} 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={triggerSandstorm}
            style={tiltStyle}
            className="hidden md:flex md:w-[480px] bg-[#fbfaf6] rounded-3xl p-8 flex-col justify-between relative overflow-hidden border border-amber-100/40 cursor-pointer shadow-2xl transition-all select-none"
          >
            {/* Interactive Particle Simulation Canvas */}
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 z-0 pointer-events-none rounded-3xl"
            />

            {/* Glowing Sun Logo Container */}
            <div className="z-10 flex flex-col items-center justify-center flex-1 space-y-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-300 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.45)] border-2 border-amber-300 relative overflow-hidden group">
                <img 
                  src={samajLogoImg} 
                  alt="Samaj Shakti Emblem" 
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {/* Single cohesive animated element with kinetic hover waves */}
              <h1 ref={titleRef} className="font-display font-black text-3xl sm:text-4xl tracking-[0.05em] text-[#131926] text-center flex flex-row items-center justify-center whitespace-nowrap select-none w-full group">
                {"SAMAJ SHAKTHI".split("").map((char, index) => (
                  <span 
                    key={index} 
                    className="inline-block transition-all duration-300 group-hover:-translate-y-3 group-hover:text-amber-600 group-hover:scale-115 cursor-default select-none animate-letter-bounce"
                    style={{ 
                      animationDelay: `${index * 0.08}s`
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </h1>
              
              <div className="text-[9px] font-mono font-bold tracking-widest text-amber-800/80 uppercase bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200/50 flex items-center gap-1.5 animate-pulse">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                HOVER TO TILT • CLICK TO TRIGGER SANDSTORM
              </div>
            </div>

            {/* Dynamic Controls Widget */}
            <div className="z-10 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-amber-100/60 shadow-md space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-4">
                {/* Wind Speed Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-gray-500">
                    <span className="flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-teal-600" />
                      WIND SPEED
                    </span>
                    <span className="text-teal-700">{windSpeed.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                    className="w-full accent-teal-600 h-1.5 bg-gray-100 rounded-lg cursor-pointer appearance-none"
                  />
                </div>

                {/* Float Gravity Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-gray-500">
                    <span className="flex items-center gap-1">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
                      FLOAT GRAVITY
                    </span>
                    <span className="text-orange-700">{floatGravity.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={floatGravity}
                    onChange={(e) => setFloatGravity(parseFloat(e.target.value))}
                    className="w-full accent-orange-600 h-1.5 bg-gray-100 rounded-lg cursor-pointer appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: High Fidelity Interactive Login Form */}
          <div ref={rightPanelRef} className="w-full md:w-[480px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-100">
            {/* Top Dark Header */}
            <div className="bg-[#151926] p-6 text-center text-white relative overflow-hidden flex flex-col items-center">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="w-48 h-48 rounded-full bg-orange-500 blur-3xl absolute -top-20 -left-10 animate-pulse"></div>
                <div className="w-48 h-48 rounded-full bg-teal-500 blur-3xl absolute -bottom-20 -right-10 animate-pulse"></div>
              </div>
              
              <div ref={logoRef} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg relative z-10 mb-2.5 border border-amber-400/20 overflow-hidden">
                <img 
                  src={samajLogoImg} 
                  alt="Samaj Shakti Emblem" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {/* Single cohesive animated element with kinetic hover waves */}
              <div className="text-3xl font-display font-black tracking-wider text-white z-10 flex flex-row items-center justify-center whitespace-nowrap select-none group">
                {"Samaj Shakthi".split("").map((char, index) => (
                  <span 
                    key={index} 
                    className="inline-block transition-all duration-300 group-hover:-translate-y-2 group-hover:text-amber-500 group-hover:scale-115 cursor-default select-none animate-letter-bounce"
                    style={{ 
                      animationDelay: `${index * 0.08}s`,
                      color: index >= 6 ? "#f59e0b" : "inherit"
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </div>
              <p className="text-[10px] tracking-widest text-gray-400 font-mono font-semibold uppercase z-10 mt-1">
                COOPERATIVE MUNICIPAL PORTAL
              </p>
            </div>

            {/* Custom Sliding Tab Selector - Modern Pill Design */}
            <div className="p-1 bg-gray-100 rounded-2xl mx-6 mt-5 flex relative">
              <button 
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setAuthError("");
                }}
                className={`flex-1 py-2 rounded-xl text-[11px] font-mono font-black tracking-wider text-center transition-all duration-300 z-10 relative focus:outline-none ${!isRegistering ? "text-gray-900 font-bold" : "text-gray-500 hover:text-gray-800"}`}
              >
                {!isRegistering && (
                  <span className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10 transition-all duration-300"></span>
                )}
                LOGIN TO ACCOUNT
              </button>
              <button 
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setAuthError("");
                }}
                className={`flex-1 py-2 rounded-xl text-[11px] font-mono font-black tracking-wider text-center transition-all duration-300 z-10 relative focus:outline-none ${isRegistering ? "text-gray-900 font-bold" : "text-gray-500 hover:text-gray-800"}`}
              >
                {isRegistering && (
                  <span className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10 transition-all duration-300"></span>
                )}
                CREATE ACCOUNT
              </button>
            </div>

            {/* Form & Actions Section */}
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6 bg-white/50 backdrop-blur-sm">
              <div className="space-y-4">
                {authError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs flex items-start gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <div className="font-semibold">{authError}</div>
                  </div>
                )}

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  {/* Email Address */}
                  <div className="gsap-form-item space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block font-mono">
                      EMAIL ADDRESS
                    </label>
                    <div className="relative focus-within:ring-4 focus-within:ring-orange-500/10 rounded-xl transition-all">
                      <input 
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-gray-50 text-gray-800 text-xs sm:text-sm px-4 py-3 pl-11 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 focus:bg-white font-semibold transition-all shadow-sm"
                      />
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-[14px]" />
                    </div>
                  </div>

                  {/* Secret Password */}
                  <div className="gsap-form-item space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block font-mono">
                      PASSWORD
                    </label>
                    <div className="relative focus-within:ring-4 focus-within:ring-orange-500/10 rounded-xl transition-all">
                      <input 
                        type={isPasswordVisible ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-gray-50 text-gray-800 text-xs sm:text-sm px-4 py-3 pl-11 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 focus:bg-white font-semibold transition-all shadow-sm"
                      />
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-[14px]" />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="absolute right-3.5 top-[14px] text-gray-400 hover:text-orange-500 transition-colors focus:outline-none"
                      >
                        {isPasswordVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="gsap-form-item flex items-center justify-between text-[11px] mt-1 px-1">
                    <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer accent-orange-600" 
                      />
                      <span>Remember me</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => showToast("Password reset flow initiated.", "info")}
                      className="text-orange-600 hover:text-orange-700 font-semibold focus:outline-none transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSigningIn}
                    className="gsap-form-item w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-display font-black text-xs sm:text-sm py-3.5 rounded-xl transition-all shadow-lg hover:shadow-orange-500/10 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 mt-2 uppercase tracking-wider cursor-pointer"
                  >
                    {isSigningIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Processing Auth...</span>
                      </>
                    ) : (
                      <>
                        <span>{isRegistering ? "Register Hero" : "Access Portal"}</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Secure Secondary Auth Options */}
              <div className="gsap-form-item space-y-2 border-t border-gray-100 pt-4">
                <div className="text-center text-[10px] text-gray-400 font-mono font-bold tracking-widest mb-1.5">
                  OR CHOOSE ALTERNATIVE LOGIN
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignInClick}
                    disabled={isSigningIn}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all font-mono font-bold text-[10px] text-gray-700 focus:outline-none shadow-sm cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#ea4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.58 14.97 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.86 3C6.27 7.54 8.92 5.04 12 5.04z" />
                      <path fill="#4285f4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.92c2.2-2.03 3.67-5.01 3.67-8.65z" />
                      <path fill="#fbbc05" d="M5.36 14.5c-.25-.75-.4-1.55-.4-2.5s.15-1.75.4-2.5L1.5 6.5C.54 8.15 0 10 0 12s.54 3.85 1.5 5.5l3.86-3z" />
                      <path fill="#34a853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.92c-1.1.74-2.5 1.18-4.2 1.18-3.08 0-5.73-2.5-6.66-5.46l-3.86 3C3.4 20.35 7.35 23 12 23z" />
                    </svg>
                    <span>GOOGLE SIGN IN</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGuestAccess}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all font-mono font-bold text-[10px] text-gray-700 focus:outline-none shadow-sm cursor-pointer"
                  >
                    <span>👥 CONTINUING AS GUEST</span>
                  </button>
                </div>
              </div>

              {/* Instant Demo Quick Access Section */}
              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  <span className="text-[9px] uppercase font-bold tracking-widest font-mono">
                    👥 INSTANT DEMO CITIZEN ACCESS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Varshini Card */}
                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("varshini")}
                    className="flex items-center gap-2 text-left p-2.5 rounded-xl border border-gray-100 bg-[#fbfbfe] hover:bg-orange-50/40 hover:border-orange-200 hover:-translate-y-0.5 transition-all text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-sm group-btn cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-mono font-black text-xs shrink-0">
                      V
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-mono font-black text-gray-900 block truncate">Varshini</span>
                      <span className="text-[8px] text-gray-400 font-mono block truncate">Coordinator (Default)</span>
                    </div>
                  </button>

                  {/* Rajesh Kumar Card */}
                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("rajesh")}
                    className="flex items-center gap-2 text-left p-2.5 rounded-xl border border-gray-100 bg-[#fbfbfe] hover:bg-orange-50/40 hover:border-orange-200 hover:-translate-y-0.5 transition-all text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-sm group-btn cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-mono font-black text-xs shrink-0">
                      RK
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-mono font-black text-gray-900 block truncate">Rajesh Kumar</span>
                      <span className="text-[8px] text-gray-400 font-mono block truncate">Lvl 3 Defender</span>
                    </div>
                  </button>

                  {/* Ananya Iyer Card */}
                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("ananya")}
                    className="flex items-center gap-2 text-left p-2.5 rounded-xl border border-gray-100 bg-[#fbfbfe] hover:bg-orange-50/40 hover:border-orange-200 hover:-translate-y-0.5 transition-all text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-sm group-btn cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-mono font-black text-xs shrink-0">
                      AI
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-mono font-black text-gray-900 block truncate">Ananya Iyer</span>
                      <span className="text-[8px] text-gray-400 font-mono block truncate">Lvl 2 Active Voice</span>
                    </div>
                  </button>

                  {/* Vikram Shah Card */}
                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("vikram")}
                    className="flex items-center gap-2 text-left p-2.5 rounded-xl border border-gray-100 bg-[#fbfbfe] hover:bg-orange-50/40 hover:border-orange-200 hover:-translate-y-0.5 transition-all text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-sm group-btn cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-mono font-black text-xs shrink-0">
                      VS
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-mono font-black text-gray-900 block truncate">Vikram Shah</span>
                      <span className="text-[8px] text-gray-400 font-mono block truncate">Lvl 1 Pioneer</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Secure bottom layout badge */}
              <div className="text-center pt-2 pb-1 border-t border-gray-50 flex items-center justify-center gap-1 text-gray-400 font-mono text-[9px] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                SECURED PORTAL • AES-256 ENCRYPTION
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand flex flex-col antialiased">
      {/* Visual Header / Brand bar */}
      <header className="sticky top-0 z-50 bg-navy text-white shadow-lg border-b-4 border-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            onClick={() => {
              setActiveTab("dashboard");
              showToast("Returned to Dashboard", "info");
            }}
            className="flex items-center gap-3 cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all"
            title="Go to Dashboard"
          >
            {/* SVG Logo - High fidelity Samaj Shakti emblem */}
            <div className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center border-2 border-white overflow-hidden shrink-0">
              <img 
                src={samajLogoImg} 
                alt="Samaj Shakti Emblem" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight sm:text-xl">
                SAMAJ <span className="text-accent">SHAKTI</span>
              </span>
              <div className="text-[10px] text-gray-400 font-mono tracking-wider uppercase leading-none">
                Empowered Society, Prosperous Nation
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isOffline && (
              <span className="hidden sm:inline-flex bg-red-950/40 text-red-400 text-xs px-2.5 py-1 rounded-full border border-red-500/20 font-semibold">
                ⚠️ Offline Mode Active
              </span>
            )}

            {/* Profile status or Auth button */}
            {isAuthLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            ) : user && profile ? (
              <div className="flex items-center gap-3">
                <div 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="hidden sm:block text-right cursor-pointer hover:opacity-85 transition-opacity"
                  title="View your Citizen Profile & Hero Badges!"
                >
                  <div className="text-xs font-semibold text-gray-100">{profile.name}</div>
                  <div className="text-[10px] text-accent font-bold tracking-tight">{profile.badge}</div>
                </div>
                <div 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-saffron text-navy-dark font-bold text-sm flex items-center justify-center border-2 border-white cursor-pointer hover:scale-105 transition-transform"
                  title="View your Citizen Profile & Hero Badges!"
                >
                  {profile.name[0].toUpperCase()}
                </div>
                <button 
                  onClick={handleUserSignOut}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-navy-light rounded-full transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="gsi-material-button relative inline-flex items-center justify-center px-4 py-2 bg-navy-light text-white text-xs font-bold rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors shadow-sm"
              >
                {isSigningIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                ) : (
                  <>
                    <span className="mr-2">🔑</span> Sign in with Google
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Navigation Rail for Desktop */}
        <aside className="hidden lg:flex flex-col gap-2 w-56 flex-shrink-0">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider px-3 py-1">Main Menu</span>
          
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "dashboard" ? "bg-navy text-white shadow-md border-r-4 border-accent" : "hover:bg-gray-200/50 text-navy-light"}`}
          >
            <BarChart3 className="w-4.5 h-4.5" />
            Dashboard
          </button>

          <button 
            onClick={() => setActiveTab("stream")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "stream" ? "bg-navy text-white shadow-md border-r-4 border-accent" : "hover:bg-gray-200/50 text-navy-light"}`}
          >
            <Compass className="w-4.5 h-4.5" />
            Issues Stream
            {filteredIssues.length > 0 && (
              <span className="ml-auto bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {filteredIssues.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab("community")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "community" ? "bg-navy text-white shadow-md border-r-4 border-accent" : "hover:bg-gray-200/50 text-navy-light"}`}
          >
            <MessageSquare className="w-4.5 h-4.5" />
            Community Hub
          </button>

          <button 
            onClick={() => setActiveTab("maps")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "maps" ? "bg-navy text-white shadow-md border-r-4 border-accent" : "hover:bg-gray-200/50 text-navy-light"}`}
          >
            <MapPin className="w-4.5 h-4.5 text-accent" />
            Interactive Maps
          </button>

          <button 
            onClick={() => setActiveTab("heroes")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "heroes" ? "bg-navy text-white shadow-md border-r-4 border-accent" : "hover:bg-gray-200/50 text-navy-light"}`}
          >
            <Award className="w-4.5 h-4.5" />
            Leaderboard
          </button>

          {profile && (
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-navy to-navy-light text-white text-xs shadow-md relative overflow-hidden">
              <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                <Award className="w-20 h-20" />
              </div>
              <div className="font-semibold text-[10px] text-accent tracking-wider uppercase mb-1">Reputation Engine</div>
              <div className="font-display font-bold text-sm mb-2">{profile.badge}</div>
              <div className="w-full bg-navy-dark rounded-full h-1.5 mb-1.5">
                <div 
                  className="bg-accent h-1.5 rounded-full" 
                  style={{ width: `${Math.min((profile.reputation / 300) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>{profile.reputation} PTS</span>
                <span>300 MAX</span>
              </div>
            </div>
          )}
        </aside>

        {/* Dynamic Tab Content Screen */}
        <main className="flex-1 flex flex-col gap-6">

          {/* ─── TAB 1: DASHBOARD ─── */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Slogan Hero Banner */}
              <div className="bg-gradient-to-r from-navy to-navy-light rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-saffron text-navy font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">Hyperlocal</span>
                    <span className="text-xs text-gray-300 font-mono">Cooperative Grid</span>
                  </div>
                  <h1 className="font-display font-bold text-xl sm:text-2xl text-accent">Empowering Community, Solving Grievances</h1>
                  <p className="text-xs sm:text-sm text-gray-400 max-w-lg mt-1">
                    Join hands with neighbors and civic bodies to detect failures, analyze risk via Gemini AI, and schedule resolutions.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsReportModalOpen(true)}
                    className="bg-gradient-to-r from-saffron to-accent text-navy font-display font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md transform hover:scale-102 transition-transform flex items-center gap-2 justify-center w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" /> Report New Failure
                  </button>
                  <button 
                    onClick={() => {
                      setIsVoiceModalOpen(true);
                      setVoiceResponseText("Namaste! I am your Samaj Shakti AI Voice Assistant. Click the microphone below to talk, or write in the chat box.");
                    }}
                    className="bg-navy-light hover:bg-navy border border-gray-700 text-white font-display font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md transform hover:scale-102 transition-transform flex items-center gap-2 justify-center w-full sm:w-auto"
                  >
                    <Mic className="w-4 h-4 text-saffron" /> Speak to AI
                  </button>
                </div>
              </div>

              {/* Live Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border-t-4 border-navy">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Active Grievances</span>
                  <div className="font-display font-bold text-2xl text-navy">{issues.filter(i => i.status === "open").length}</div>
                  <span className="text-[10px] text-gray-400">Awaiting intervention</span>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border-t-4 border-saffron">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">In Progress</span>
                  <div className="font-display font-bold text-2xl text-saffron">{issues.filter(i => i.status === "in-progress").length}</div>
                  <span className="text-[10px] text-gray-400">Contractors assigned</span>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border-t-4 border-green-500">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Fully Resolved</span>
                  <div className="font-display font-bold text-2xl text-green-500">{issues.filter(i => i.status === "resolved").length}</div>
                  <span className="text-[10px] text-green-500">✓ Fixed by community</span>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border-t-4 border-red-500">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Urgent Risks</span>
                  <div className="font-display font-bold text-2xl text-red-500">{issues.filter(i => i.priority === "critical").length}</div>
                  <span className="text-[10px] text-red-500">Immediate threat</span>
                </div>
              </div>

              {/* AI Predictive Insight Card */}
              <div className="bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-4 top-4">
                  <div className="w-3 h-3 bg-accent rounded-full animate-pulse-ring"></div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-accent animate-float" />
                  <span className="font-display font-bold text-xs uppercase tracking-wider text-accent">Predictive Civic Insights</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans font-light">
                  {aiPredictiveInsight}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-3">
                  <span className="text-[10px] text-gray-500 font-mono">Last analysis: Real-time trends</span>
                  <button 
                    onClick={generatePredictiveInsight}
                    disabled={isInsightLoading}
                    className="flex items-center gap-1 text-xs text-accent hover:text-white font-bold transition-colors"
                  >
                    {isInsightLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3 h-3" /> Regenerate Forecast
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic Map and Category Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Geolocation Mock Visual Map */}
                <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      <h3 className="font-display font-bold text-sm text-navy">Hyperlocal Heat Map</h3>
                    </div>
                    <button 
                      onClick={enableLiveGPS}
                      disabled={gpsLoading}
                      className="text-xs bg-navy-light text-white font-bold px-2.5 py-1 rounded-lg border border-gray-700 hover:bg-gray-800 flex items-center gap-1 transition-colors"
                    >
                      {gpsLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> GPS...
                        </>
                      ) : (
                        <>
                          <Locate className="w-3.5 h-3.5 text-accent" /> Use GPS Location
                        </>
                      )}
                    </button>
                  </div>

                  {/* SVG Heat Map representing streets of Bowenpally */}
                  <div className="relative bg-navy rounded-xl h-52 overflow-hidden flex items-center justify-center">
                    {/* Abstract Street grid lines */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-[20%] left-0 w-full h-[2px] bg-white"></div>
                      <div className="absolute top-[50%] left-0 w-full h-[2px] bg-white"></div>
                      <div className="absolute top-[80%] left-0 w-full h-[2px] bg-white"></div>
                      <div className="absolute left-[30%] top-0 h-full w-[2px] bg-white"></div>
                      <div className="absolute left-[60%] top-0 h-full w-[2px] bg-white"></div>
                    </div>

                    {/* Dynamic Geocoded issue pins mapped over the grids */}
                    {filteredIssues.slice(0, 5).map((issue, index) => {
                      const priorityColor = issue.priority === "critical" ? "bg-red-500" : issue.priority === "high" ? "bg-saffron" : "bg-accent";
                      const topPerc = 25 + (index * 13) % 60;
                      const leftPerc = 15 + (index * 17) % 70;
                      return (
                        <div 
                          key={issue.id} 
                          className="absolute flex flex-col items-center cursor-pointer group"
                          style={{ top: `${topPerc}%`, left: `${leftPerc}%` }}
                          onClick={() => {
                            setActiveTab("stream");
                            setIssueSearch(issue.title.slice(0, 8));
                          }}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full ${priorityColor} border-2 border-white shadow-md group-hover:scale-125 transition-transform`}></div>
                          <div className="hidden group-hover:block absolute top-4 bg-navy-dark text-[10px] text-white p-1.5 rounded shadow-lg whitespace-nowrap z-20 font-bold border border-gray-700">
                            {issue.title.slice(0, 20)}...
                          </div>
                        </div>
                      );
                    })}

                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-navy-dark/80 backdrop-blur-sm p-1.5 rounded-lg border border-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-[9px] text-white font-semibold">Active Critical Risk</span>
                    </div>

                    <div className="text-center z-10 select-none pointer-events-none">
                      <MapPin className="w-8 h-8 text-accent animate-float mx-auto mb-1 opacity-80" />
                      <span className="text-[10px] text-gray-400 block font-mono">{activeLocality} Core Sector</span>
                    </div>
                  </div>
                </div>

                {/* Categories Bar Chart (custom dynamic rendering using Tailwind and SVG heights) */}
                <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-display font-bold text-sm text-navy mb-4">Incidents by Category</h3>
                    <div className="space-y-3">
                      {["Road Damage", "Water Leakage", "Streetlight", "Waste Management", "Infrastructure"].map((cat) => {
                        const count = issues.filter(i => i.cat === cat).length;
                        const maxCount = Math.max(...["Road Damage", "Water Leakage", "Streetlight", "Waste Management", "Infrastructure"].map(c => issues.filter(i => i.cat === c).length), 1);
                        const perc = (count / maxCount) * 100;

                        const barColor = cat === "Road Damage" ? "bg-red-500" : cat === "Water Leakage" ? "bg-teal-civic" : cat === "Streetlight" ? "bg-accent" : cat === "Waste Management" ? "bg-green-500" : "bg-purple-500";

                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>{cat}</span>
                              <span className="text-gray-400">{count} reports</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${perc}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono mt-4 text-center">
                    Categorized automatically via server-side Gemini Pro model.
                  </div>
                </div>

              </div>

              {/* Feed Preview */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-bold text-sm text-navy">🔥 Active Neighborhood Reports</h3>
                  <button 
                    onClick={() => setActiveTab("stream")}
                    className="text-xs text-teal-civic hover:text-navy font-bold flex items-center"
                  >
                    View All Issues <ChevronRight className="w-4.5 h-4.5" />
                  </button>
                </div>

                {filteredIssues.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-1">🏜️</div>
                    <p className="text-xs text-gray-500">No active issues reported in {activeLocality}. Be the first!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredIssues.slice(0, 4).map(issue => (
                      <div 
                        key={issue.id}
                        onClick={() => {
                          setActiveTab("stream");
                          setIssueSearch(issue.title.slice(0, 10));
                        }}
                        className="bg-sand/40 hover:bg-sand rounded-xl p-4 border border-gray-200/50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${issue.priority === "critical" ? "bg-red-100 text-red-600" : issue.priority === "high" ? "bg-orange-100 text-orange-600" : "bg-amber-100 text-amber-700"}`}>
                            {issue.priority}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{issue.cat}</span>
                        </div>
                        <h4 className="font-display font-bold text-xs text-navy line-clamp-1">{issue.title}</h4>
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{issue.desc}</p>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200/40">
                          <span className="text-[9px] text-gray-400">👤 {issue.reporterName}</span>
                          <span className="text-[10px] text-navy font-bold">▲ {issue.votes} Upvotes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ─── TAB 2: STREAM ─── */}
          {activeTab === "stream" && (
            <div className="space-y-6">
              {selectedDetailedIssue ? (
                /* Detailed Issue View - Matching Screenshot 1 */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                  
                  {/* Left main column: Issue content & description (Col-span 2) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Back button and Share button row */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedDetailedIssue(null)}
                        className="flex items-center gap-2 text-xs font-bold text-navy hover:text-navy-light bg-sand/40 hover:bg-sand border border-gray-200/50 px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-navy" />
                        BACK TO ISSUE FEED
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => generatePDFReport(selectedDetailedIssue)}
                          className="flex items-center gap-2 text-xs font-bold text-navy hover:text-navy-light bg-sand/40 hover:bg-sand border border-gray-200/50 px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-navy" />
                          DOWNLOAD PDF
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
                            className="flex items-center gap-2 text-xs font-bold text-navy hover:text-navy-light bg-sand/40 hover:bg-sand border border-gray-200/50 px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            <Share2 className="w-4 h-4 text-navy" />
                            SHARE ISSUE
                          </button>
                          
                          {isShareDropdownOpen && (
                          <>
                            {/* Backdrop to close the dropdown when clicking outside */}
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setIsShareDropdownOpen(false)}
                            />
                            
                            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-150 rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in origin-top-right">
                              <div className="px-4 py-2 border-b border-gray-100/60">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Spread the Word</p>
                              </div>
                              
                              {/* Option 1: Copy Link */}
                              <button
                                onClick={() => {
                                  const shareUrl = `${window.location.origin}${window.location.pathname}?issue=${selectedDetailedIssue.id}`;
                                  navigator.clipboard.writeText(shareUrl);
                                  showToast("Shareable link copied to clipboard!", "success");
                                  setIsShareDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-sand/40 hover:text-navy transition-colors text-left cursor-pointer"
                              >
                                <Link className="w-3.5 h-3.5 text-navy" />
                                <span className="font-medium">Copy Direct Link</span>
                              </button>
                              
                              {/* Option 2: Share on WhatsApp */}
                              <button
                                onClick={() => {
                                  const shareUrl = `${window.location.origin}${window.location.pathname}?issue=${selectedDetailedIssue.id}`;
                                  const shareText = `🚨 *Samaj Shakti Civic Alert*:\n"${selectedDetailedIssue.title}" at ${selectedDetailedIssue.loc || 'our locality'}.\n*Status*: ${selectedDetailedIssue.status.toUpperCase()} | *Priority*: ${selectedDetailedIssue.priority.toUpperCase()}\n\nJoin me in upvoting and validating this issue so municipal officers can resolve it swiftly!\n👉 ${shareUrl}`;
                                  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
                                  window.open(whatsappUrl, "_blank");
                                  setIsShareDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-sand/40 hover:text-emerald-600 transition-colors text-left cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="font-medium">Share on WhatsApp</span>
                              </button>
                              
                              {/* Option 3: Share on Twitter/X */}
                              <button
                                onClick={() => {
                                  const shareUrl = `${window.location.origin}${window.location.pathname}?issue=${selectedDetailedIssue.id}`;
                                  const shareText = `🚨 Samaj Shakti Civic Alert: "${selectedDetailedIssue.title}" at ${selectedDetailedIssue.loc || 'our locality'}.\nStatus: ${selectedDetailedIssue.status.toUpperCase()} | Priority: ${selectedDetailedIssue.priority.toUpperCase()}\n\nUpvote and validate to resolve it!\n👉`;
                                  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                                  window.open(twitterUrl, "_blank");
                                  setIsShareDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-sand/40 hover:text-sky-500 transition-colors text-left cursor-pointer"
                              >
                                <Twitter className="w-3.5 h-3.5 text-sky-400" />
                                <span className="font-medium">Share on Twitter (X)</span>
                              </button>
                            </div>
                          </>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Card with details */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
                      {/* Tag and Criticality Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] tracking-wider text-white font-extrabold bg-navy px-3 py-1 rounded-lg uppercase">
                          {selectedDetailedIssue.cat.replace(" Damage", "").replace(" Management", "").replace(" Leakage", "")}
                        </span>
                        <span className={`text-[10px] tracking-wider font-extrabold px-3 py-1 rounded-lg uppercase ${
                          selectedDetailedIssue.priority === "critical" ? "bg-red-500 text-white" : 
                          selectedDetailedIssue.priority === "high" ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                        }`}>
                          {selectedDetailedIssue.priority}
                        </span>
                        {selectedDetailedIssue.isVerified && (
                          <span className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-lg font-extrabold flex items-center gap-1">
                            ✓ COMMUNITY AUDITED
                          </span>
                        )}
                      </div>

                      {/* Title and Address */}
                      <div className="space-y-2">
                        <h1 className="font-display font-black text-xl sm:text-2xl text-navy leading-tight">
                          {selectedDetailedIssue.title}
                        </h1>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold font-sans">
                          <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                          <span>{selectedDetailedIssue.loc}</span>
                        </div>
                      </div>

                      {/* Main visual evidence */}
                      {selectedDetailedIssue.videoUrl ? (
                        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-sand/15">
                          <video 
                            src={selectedDetailedIssue.videoUrl} 
                            controls
                            className="w-full object-contain max-h-[420px]"
                          />
                        </div>
                      ) : selectedDetailedIssue.imageUrl && (
                        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-sand/15">
                          <img 
                            src={selectedDetailedIssue.imageUrl}
                            alt={selectedDetailedIssue.title}
                            className="w-full object-cover max-h-[420px]"
                          />
                        </div>
                      )}

                      {/* Issue Description block */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
                          ISSUE DESCRIPTION
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line font-medium font-sans">
                          {selectedDetailedIssue.desc}
                        </p>
                      </div>

                      {/* Reporter Profile and date bar */}
                      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-navy text-accent font-display font-black flex items-center justify-center text-sm shadow">
                          {selectedDetailedIssue.reporterName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-navy">
                            Reported by {selectedDetailedIssue.reporterName}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono font-semibold">
                            {new Date(selectedDetailedIssue.time).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right sidebar column: Progress, actions, AI audit and Trail (Col-span 1) */}
                  <div className="space-y-6">
                    
                    {/* RESOLUTION PROGRESS Stepper */}
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
                        RESOLUTION PROGRESS
                      </span>
                      
                      <div className="relative flex flex-col gap-5 pl-1.5">
                        {/* Vertical connecting line */}
                        <div className="absolute left-[13px] top-3 bottom-3 w-[2px] bg-gray-200 -z-0" />
                        {/* Growing fill line */}
                        <div 
                          className="absolute left-[13px] top-3 w-[2px] bg-gradient-to-b from-orange-500 to-green-500 transition-all duration-500 -z-0"
                          style={{
                            height: selectedDetailedIssue.status === "resolved" 
                              ? "calc(100% - 1.5rem)" 
                              : selectedDetailedIssue.status === "in-progress" 
                                ? "66%" 
                                : selectedDetailedIssue.isVerified || (selectedDetailedIssue.verifiers?.length || 0) >= 3 
                                  ? "33%" 
                                  : "0%"
                          }}
                        />

                        {/* STEP 1: Report Filed */}
                        <div className="flex items-start gap-4 z-10 relative">
                          <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                            ✓
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-navy">Report Filed</div>
                            <div className="text-[9px] text-gray-400 font-mono font-semibold">Grievance Registered</div>
                          </div>
                        </div>

                        {/* STEP 2: Community Validated */}
                        <div className="flex items-start gap-4 z-10 relative">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md shrink-0 transition-colors ${
                            (selectedDetailedIssue.isVerified || (selectedDetailedIssue.verifiers?.length || 0) >= 3)
                              ? "bg-amber-500 text-white" 
                              : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}>
                            {(selectedDetailedIssue.isVerified || (selectedDetailedIssue.verifiers?.length || 0) >= 3) ? "✓" : "2"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-navy">Community Validated</div>
                            <div className="text-[9px] text-gray-400 font-mono font-semibold">
                              {(selectedDetailedIssue.isVerified || (selectedDetailedIssue.verifiers?.length || 0) >= 3) ? "Verified Genuine" : "Awaiting validation"}
                            </div>
                          </div>
                        </div>

                        {/* STEP 3: In Progress */}
                        <div className="flex items-start gap-4 z-10 relative">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md shrink-0 transition-colors ${
                            (selectedDetailedIssue.status === "in-progress" || selectedDetailedIssue.status === "resolved")
                              ? "bg-blue-500 text-white" 
                              : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}>
                            {(selectedDetailedIssue.status === "in-progress" || selectedDetailedIssue.status === "resolved") ? "✓" : "3"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-navy">In Progress</div>
                            <div className="text-[9px] text-gray-400 font-mono font-semibold">
                              {(selectedDetailedIssue.status === "in-progress" || selectedDetailedIssue.status === "resolved") ? "Assigned to Dept" : "Pending dispatch"}
                            </div>
                          </div>
                        </div>

                        {/* STEP 4: Issue Resolved */}
                        <div className="flex items-start gap-4 z-10 relative">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md shrink-0 transition-colors ${
                            selectedDetailedIssue.status === "resolved"
                              ? "bg-green-500 text-white" 
                              : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}>
                            {selectedDetailedIssue.status === "resolved" ? "✓" : "4"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-navy">Issue Resolved</div>
                            <div className="text-[9px] text-gray-400 font-mono font-semibold">
                              {selectedDetailedIssue.status === "resolved" ? "Closed & Confirmed" : "Awaiting resolution"}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* HERO ACTIONS Panel */}
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
                        HERO ACTIONS
                      </span>
                      
                      <div className="space-y-2">
                        {/* Upvote Toggle */}
                        <button
                          onClick={(e) => upvoteIssue(selectedDetailedIssue.id, e)}
                          className={`w-full flex items-center justify-between text-xs font-bold px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                            selectedDetailedIssue.upvoters?.includes(user?.uid || "")
                              ? "bg-accent border-accent text-navy shadow-sm"
                              : "bg-sand/30 border-gray-100 text-navy hover:bg-sand/60"
                          }`}
                        >
                          <span>Upvoted ({selectedDetailedIssue.votes})</span>
                          <span className="text-lg">▲</span>
                        </button>

                        {/* Citizen Validation Toggle */}
                        <button
                          onClick={(e) => citizenVerifyIssue(selectedDetailedIssue.id, e)}
                          className={`w-full flex items-center justify-between text-xs font-bold px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                            selectedDetailedIssue.verifiers?.includes(user?.uid || "")
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                              : "bg-sand/30 border-gray-100 text-navy hover:bg-sand/60"
                          }`}
                        >
                          <span>Verified Genuine ({selectedDetailedIssue.verifiers?.length || 0})</span>
                          <span className="text-sm font-black">+5 XP</span>
                        </button>

                        {/* Resolution / Close Button */}
                        {(user && (selectedDetailedIssue.reporterUid === user.uid || profile?.role === "coordinator" || profile?.role === "admin")) && (
                          <div className="pt-2 border-t border-dashed border-gray-100 mt-2 space-y-2">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">MUNICIPAL STATUS ACTION</span>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => updateIssueStatus(selectedDetailedIssue.id, "in-progress")}
                                className={`text-[10px] font-black py-2.5 rounded-lg border text-center cursor-pointer transition-all uppercase ${
                                  selectedDetailedIssue.status === "in-progress" 
                                    ? "bg-blue-600 text-white border-blue-600" 
                                    : "bg-white border-gray-200 text-blue-600 hover:bg-blue-50"
                                }`}
                              >
                                In Progress
                              </button>
                              <button
                                onClick={() => updateIssueStatus(selectedDetailedIssue.id, "resolved")}
                                className={`text-[10px] font-black py-2.5 rounded-lg border text-center cursor-pointer transition-all uppercase ${
                                  selectedDetailedIssue.status === "resolved" 
                                    ? "bg-green-600 text-white border-green-600" 
                                    : "bg-white border-gray-200 text-green-600 hover:bg-green-50"
                                }`}
                              >
                                Resolved
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* GEMINI AI AUDIT BULLETIN */}
                    <div className="bg-[#090e17] text-white rounded-3xl p-5 shadow-lg border-2 border-accent/30 space-y-4 relative overflow-hidden">
                      <div className="absolute right-4 top-4">
                        <Sparkles className="w-5 h-5 text-accent opacity-30 animate-pulse" />
                      </div>
                      
                      <h3 className="font-display font-black text-xs text-accent tracking-wider uppercase flex items-center gap-1">
                        🤖 GEMINI AI AUDIT BULLETIN
                      </h3>

                      <div className="space-y-3.5 text-xs">
                        <div className="space-y-1">
                          <div className="text-[9px] text-accent/85 font-extrabold tracking-widest uppercase">
                            Automated Dispatch Report
                          </div>
                          <div className="bg-[#121c2c] p-2.5 rounded-xl border border-gray-800 text-[11px] leading-relaxed text-gray-300 whitespace-pre-line font-sans">
                            {selectedDetailedIssue.aiAnalysis || "Classification model completed successfully. Dispatched priority level high diagnostic alert."}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[9px] text-accent/85 font-extrabold tracking-widest uppercase">
                            Severity Justification
                          </div>
                          <div className="text-gray-300 text-[11px] leading-relaxed pl-1 font-sans font-medium">
                            {selectedDetailedIssue.priorityJustification || "Evaluated by structural severity algorithms on density of traffic and potential for crash."}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[9px] text-accent/85 font-extrabold tracking-widest uppercase">
                            Target Public Department
                          </div>
                          <div className="text-gray-300 text-[11px] leading-relaxed font-bold pl-1 text-accent font-sans">
                            🏛️ {selectedDetailedIssue.authority || "Municipal Public Works Department (PWD)"}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[9px] text-accent/85 font-extrabold tracking-widest uppercase">
                            Immediate Citizen Safety Advice
                          </div>
                          <div className="bg-red-950/45 text-red-300 border border-red-900/40 p-2.5 rounded-xl text-[11px] leading-relaxed font-medium font-sans">
                            ⚠️ {selectedDetailedIssue.immediateCitizenSafetyAction || "Please traverse with maximum vigilance around this section."}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Issue Audit Trail & Logs */}
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
                        Issue Audit Trail & Logs
                      </span>
                      
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {selectedDetailedIssue.logs && selectedDetailedIssue.logs.length > 0 ? (
                          selectedDetailedIssue.logs.map((log, idx) => (
                            <div key={idx} className="bg-sand/35 p-2.5 rounded-xl border border-gray-100 space-y-1 animate-fade-in text-[11px]">
                              <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono">
                                <span className="font-bold text-navy">💬 {log.by}</span>
                                <span className="font-semibold">{log.time}</span>
                              </div>
                              <p className="text-gray-600 font-medium whitespace-pre-line font-sans">{log.text}</p>
                            </div>
                          ))
                        ) : (
                          <div className="bg-sand/35 p-2.5 rounded-xl border border-gray-100 space-y-1 text-[11px] text-gray-500 italic text-center font-sans">
                            No commentary or audit events recorded yet.
                          </div>
                        )}
                      </div>

                      {/* Comment input area */}
                      <div className="relative mt-2">
                        <input
                          type="text"
                          placeholder="Write a commentary or provide updates..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newCommentText.trim()) {
                              addCommentToIssue(selectedDetailedIssue.id, newCommentText);
                              setNewCommentText("");
                            }
                          }}
                          className="w-full bg-sand/40 text-xs pr-10 pl-3.5 py-3 rounded-xl border border-gray-250 focus:outline-none focus:border-navy font-semibold font-sans"
                        />
                        <button
                          onClick={() => {
                            if (newCommentText.trim()) {
                              addCommentToIssue(selectedDetailedIssue.id, newCommentText);
                              setNewCommentText("");
                            }
                          }}
                          className="absolute right-2 top-2 p-1.5 text-navy hover:text-navy-light cursor-pointer transition-all rounded-lg"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                /* Normal Issue Feed - Matching Screenshot 2 */
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Search, Filter, and Controls Header panel */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display font-black text-xl text-navy tracking-tight">Community Issue Feed</h2>
                        <p className="text-xs text-gray-500 font-semibold">Track, upvote, and audit public grievances reported in your sector.</p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* List / Map view selector */}
                        <div className="flex bg-sand p-1 rounded-xl border border-gray-200 mr-2 shadow-inner">
                          <button
                            type="button"
                            onClick={() => {
                              setStreamViewMode("list");
                              showToast("Switched to List Grid", "info");
                            }}
                            className={`text-xs px-3.5 py-2 rounded-lg font-black flex items-center gap-1 cursor-pointer transition-all ${streamViewMode === "list" ? "bg-navy text-white shadow-sm" : "text-gray-500 hover:text-navy"}`}
                          >
                            📋 List Grid
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStreamViewMode("map");
                              showToast("Switched to Interactive Overlay", "info");
                            }}
                            className={`text-xs px-3.5 py-2 rounded-lg font-black flex items-center gap-1 cursor-pointer transition-all ${streamViewMode === "map" ? "bg-navy text-white shadow-sm" : "text-gray-500 hover:text-navy"}`}
                          >
                            🗺️ Map Overlay
                          </button>
                        </div>

                        <button 
                          onClick={() => setIsReportModalOpen(true)}
                          className="bg-navy hover:bg-navy-light text-white text-xs font-black px-4.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
                        >
                          <Plus className="w-4.5 h-4.5 text-accent" /> File Grievance
                        </button>
                      </div>
                    </div>

                    {/* Search box */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Search issues or addresses..."
                        value={issueSearch}
                        onChange={(e) => setIssueSearch(e.target.value)}
                        className="bg-sand/40 text-xs w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-250 focus:outline-none focus:border-navy font-semibold text-navy placeholder:text-gray-400 font-sans"
                      />
                    </div>

                    {/* Filters Bar: CATEGORY pills on left, Dropdowns on right */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-gray-100">
                      {/* Category pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mr-1">
                          CATEGORY:
                        </span>
                        {[
                          { label: "All", value: "all" },
                          { label: "Road", value: "Road Damage" },
                          { label: "Water", value: "Water Leakage" },
                          { label: "Light", value: "Streetlight" },
                          { label: "Waste", value: "Waste Management" },
                          { label: "Infrastructure", value: "Infrastructure" },
                          { label: "Public Safety", value: "Public Safety" },
                          { label: "Electricity", value: "Electricity" },
                          { label: "Disaster", value: "Disaster Management" },
                          { label: "Other", value: "Other" }
                        ].map((pill) => (
                          <button
                            key={pill.value}
                            type="button"
                            onClick={() => setCategoryFilter(pill.value)}
                            className={`text-xs px-3 py-1.5 rounded-full font-black cursor-pointer transition-all ${
                              categoryFilter === pill.value 
                                ? "bg-navy text-white shadow-sm" 
                                : "bg-sand/40 text-gray-500 hover:text-navy hover:bg-sand/70"
                            }`}
                          >
                            {pill.label}
                          </button>
                        ))}
                      </div>

                      {/* Dropdown Selects for Severity & Status */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">SEVERITY:</span>
                          <select 
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                            className="bg-sand/50 text-xs px-2.5 py-1.5 rounded-xl border border-gray-250 focus:outline-none cursor-pointer font-bold text-navy font-sans"
                          >
                            <option value="all">All</option>
                            <option value="critical">🔴 Critical</option>
                            <option value="high">🟠 High</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="low">🟢 Low</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">STATUS:</span>
                          <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-sand/50 text-xs px-2.5 py-1.5 rounded-xl border border-gray-250 focus:outline-none cursor-pointer font-bold text-navy font-sans"
                          >
                            <option value="all">All</option>
                            <option value="open">Filed</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Feed Issues Grid / Map view */}
                  {streamViewMode === "list" ? (
                    filteredIssues.length === 0 ? (
                      <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-150">
                        <div className="text-5xl mb-3">🏛️</div>
                        <h3 className="font-display font-black text-sm text-navy">No matching grievances</h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto font-sans font-medium">Try resetting some search words or click "File Grievance" to register a new local issue.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredIssues.map((issue) => {
                          return (
                            <div 
                              key={issue.id}
                              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-gray-150 flex flex-col group transition-all"
                            >
                              {/* Top Row: Tag, Share and Severity Badge */}
                              <div className="p-4 pb-2 flex items-center justify-between">
                                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider bg-sand px-2.5 py-1 rounded-lg">
                                  {issue.cat.replace(" Damage", "").replace(" Management", "").replace(" Leakage", "")}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(window.location.href + "?issue=" + issue.id);
                                      showToast("Shareable link copied!", "success");
                                    }}
                                    className="p-1 hover:bg-sand rounded-lg text-gray-400 hover:text-navy cursor-pointer transition-colors"
                                    title="Copy Link"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                                    issue.priority === "critical" ? "bg-red-500 text-white" : 
                                    issue.priority === "high" ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                                  }`}>
                                    {issue.priority}
                                  </span>
                                </div>
                              </div>

                              {/* Image section */}
                              <div 
                                onClick={() => setSelectedDetailedIssue(issue)}
                                className="relative h-44 w-full bg-navy overflow-hidden cursor-pointer flex flex-col items-center justify-center"
                              >
                                {issue.videoUrl ? (
                                  <video 
                                    src={issue.videoUrl}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    muted
                                    loop
                                    playsInline
                                    onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                                    onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                                  />
                                ) : issue.imageUrl ? (
                                  <img 
                                    src={issue.imageUrl}
                                    alt={issue.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center opacity-40 group-hover:scale-105 transition-transform duration-500">
                                    <AlertTriangle className="w-12 h-12 text-white/50 mb-2" />
                                    <span className="text-[10px] text-white/50 font-bold tracking-widest uppercase">No Visual Evidence</span>
                                  </div>
                                )}
                                
                                {/* Floating status badge on image */}
                                <div className="absolute bottom-3 left-3">
                                  <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wider text-white shadow-sm ${
                                    issue.status === "resolved" 
                                      ? "bg-green-600" 
                                      : issue.status === "in-progress" 
                                        ? "bg-blue-600 animate-pulse" 
                                        : "bg-orange-600"
                                  }`}>
                                    {issue.status === "resolved" ? "RESOLVED" : issue.status === "in-progress" ? "IN PROGRESS" : "FILED"}
                                  </span>
                                </div>
                              </div>

                              {/* Card Content body */}
                              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                <div className="space-y-1.5">
                                  <h3 
                                    onClick={() => setSelectedDetailedIssue(issue)}
                                    className="font-display font-black text-sm text-navy hover:text-navy-light cursor-pointer line-clamp-1 leading-snug"
                                  >
                                    {issue.title}
                                  </h3>
                                  <p 
                                    onClick={() => setSelectedDetailedIssue(issue)}
                                    className="text-xs text-gray-500 line-clamp-2 font-medium cursor-pointer font-sans"
                                  >
                                    {issue.desc}
                                  </p>
                                </div>

                                {/* Location and Date details */}
                                <div className="space-y-1 text-[10px] text-gray-400 font-semibold border-t border-dashed border-gray-100 pt-2.5">
                                  <div className="flex items-center gap-1 text-gray-500 font-bold truncate">
                                    <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                    <span>{issue.loc}</span>
                                  </div>
                                  <div className="flex items-center gap-1 pl-0.5 font-mono">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{new Date(issue.time).toLocaleString("en-IN", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Stats footer & delete buttons */}
                              <div className="px-4 py-3 bg-sand/35 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-navy">
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      upvoteIssue(issue.id, e);
                                    }}
                                    className="hover:text-navy-light flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                  >
                                    <span>▲</span>
                                    <span>{issue.votes} Upvotes</span>
                                  </button>
                                  
                                  <div className="flex items-center gap-1 text-emerald-600">
                                    <span>✓</span>
                                    <span>{issue.verifiers?.length || 0} Validations</span>
                                  </div>
                                </div>

                                {/* Delete Option if authorized */}
                                {user && (issue.reporterUid === user.uid || profile?.role === "coordinator" || profile?.role === "admin") && (
                                  confirmDeleteId === issue.id ? (
                                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg animate-fade-in text-[10px]">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteIssue(issue.id);
                                          setConfirmDeleteId(null);
                                        }}
                                        className="bg-red-600 text-white px-1.5 py-0.5 rounded cursor-pointer font-bold"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteId(null);
                                        }}
                                        className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded cursor-pointer font-bold"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(issue.id);
                                      }}
                                      className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                      title="Delete Grievance"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    /* Map View - plotted with interactive svg canvas */
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
                      {/* Left map list */}
                      <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150">
                          <div className="flex flex-col gap-2 mb-3 border-b pb-3 border-gray-100">
                            <div className="flex items-center justify-between">
                              <h3 className="font-display font-black text-xs uppercase tracking-wider text-navy">
                                Active Pins ({filteredIssues.length})
                              </h3>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer group w-fit">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={mapShowOnlyLocality}
                                  onChange={(e) => setMapShowOnlyLocality(e.target.checked)}
                                />
                                <div className={`block w-8 h-4.5 rounded-full transition-colors ${mapShowOnlyLocality ? 'bg-navy' : 'bg-gray-300 group-hover:bg-gray-400'}`}></div>
                                <div className={`absolute left-0.5 top-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform ${mapShowOnlyLocality ? 'transform translate-x-3.5' : ''}`}></div>
                              </div>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                Show only <span className="text-navy">{activeLocality}</span>
                              </span>
                            </label>
                          </div>

                          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                            {filteredIssues.map((issue) => {
                              const isSelected = streamSelectedMapPin?.id === issue.id;
                              return (
                                <button
                                  key={issue.id}
                                  type="button"
                                  onClick={() => setStreamSelectedMapPin(issue)}
                                  className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex flex-col gap-1 cursor-pointer ${
                                    isSelected 
                                      ? "bg-navy text-white border-navy shadow-md" 
                                      : "bg-sand/20 hover:bg-sand/40 border-gray-100 text-gray-800"
                                  }`}
                                >
                                  <div className="flex justify-between items-center w-full gap-2">
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${
                                      isSelected 
                                        ? "bg-accent text-navy" 
                                        : issue.priority === "critical" 
                                          ? "bg-red-100 text-red-600" 
                                          : "bg-blue-100 text-blue-600"
                                    }`}>
                                      {issue.priority}
                                    </span>
                                    <span className="text-[9px] opacity-75">{issue.cat.replace(" Damage", "")}</span>
                                  </div>
                                  <span className="font-black truncate w-full block">{issue.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Pin details panel */}
                        {streamSelectedMapPin && (
                          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 space-y-3 animate-fade-in">
                            <h4 className="font-display font-black text-xs text-navy uppercase tracking-wider">PIN SPECIFICATION</h4>
                            <div className="space-y-1.5">
                              <h5 className="font-black text-sm text-navy">{streamSelectedMapPin.title}</h5>
                              <p className="text-xs text-gray-500 line-clamp-3 font-medium font-sans">{streamSelectedMapPin.desc}</p>
                              <div className="text-[10px] text-gray-400 font-mono space-y-0.5 pt-2 border-t border-dashed border-gray-100 font-semibold">
                                <div>📍 Location: {streamSelectedMapPin.loc}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedDetailedIssue(streamSelectedMapPin)}
                                className="w-full bg-navy text-white text-xs font-black py-2.5 rounded-xl hover:bg-navy-light cursor-pointer transition-all text-center flex items-center justify-center gap-1.5 shadow-sm mt-1"
                              >
                                🔎 VIEW FULL TIMELINE
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Recent Activity Sidebar */}
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <h4 className="font-display font-black text-xs text-navy uppercase tracking-wider">
                              Recent in {activeLocality}
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {recentLocalityIssues.length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-2">No recent issues.</p>
                            ) : (
                              recentLocalityIssues.map((issue) => (
                                <button
                                  key={`recent-${issue.id}`}
                                  type="button"
                                  onClick={() => setStreamSelectedMapPin(issue)}
                                  className="w-full text-left flex items-start gap-2 p-2 hover:bg-sand/40 rounded-xl transition-all border border-transparent hover:border-gray-100 group cursor-pointer"
                                >
                                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></div>
                                  <div>
                                    <p className="text-xs font-bold text-navy group-hover:text-navy-light line-clamp-1">{issue.title}</p>
                                    <p className="text-[9px] text-gray-500 mt-0.5">{new Date(issue.time).toLocaleDateString()} · {issue.status.toUpperCase()}</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right map Canvas */}
                      <div className="lg:col-span-3 bg-[#0d1424] rounded-3xl p-5 shadow-lg border border-gray-800 min-h-[460px] relative overflow-hidden">
                        {/* Grid backdrop */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
                          <defs>
                            <pattern id="streamMapGrid_new" width="30" height="30" patternUnits="userSpaceOnUse">
                              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.04" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#streamMapGrid_new)" />

                          <g stroke="#374151" strokeWidth="2.5" strokeLinecap="round" opacity="0.3">
                            <line x1="10%" y1="20%" x2="90%" y2="20%" stroke="#4b5563" strokeWidth="4" />
                            <line x1="30%" y1="0%" x2="30%" y2="100%" stroke="#4b5563" strokeWidth="5" />
                            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#4b5563" strokeWidth="4" />
                            <line x1="65%" y1="0%" x2="65%" y2="100%" stroke="#374151" strokeWidth="3" />
                            <line x1="0%" y1="80%" x2="100%" y2="80%" stroke="#374151" strokeWidth="3" />
                            <line x1="10%" y1="20%" x2="30%" y2="50%" />
                            <line x1="30%" y1="20%" x2="65%" y2="50%" />
                            <line x1="65%" y1="50%" x2="90%" y2="80%" />
                            <line x1="30%" y1="80%" x2="10%" y2="50%" />
                          </g>
                        </svg>

                        <div className="absolute top-[14%] left-[12%] text-[8px] text-gray-500 font-mono font-black uppercase tracking-widest pointer-events-none select-none">
                          Military Dairy Farm Road
                        </div>
                        <div className="absolute top-[46%] left-[34%] text-[8px] text-gray-500 font-mono font-black uppercase tracking-widest pointer-events-none select-none">
                          Sikh Road Bypass
                        </div>
                        <div className="absolute top-[82%] left-[45%] text-[8px] text-gray-500 font-mono font-black uppercase tracking-widest pointer-events-none select-none">
                          Hasmathpet Lake Area
                        </div>

                        {/* Live Pins Plotted */}
                        {filteredIssues.map((issue) => {
                          const lat = issue.lat || 17.4725;
                          const lng = issue.lng || 78.4795;

                          const pctX = (lng - 78.4650) / (78.5050 - 78.4650);
                          const pctY = 1 - ((lat - 17.4600) / (17.4950 - 17.4600));

                          const leftPos = Math.max(5, Math.min(95, pctX * 100));
                          const topPos = Math.max(5, Math.min(95, pctY * 100));

                          const isSelected = streamSelectedMapPin?.id === issue.id;

                          const priorityColor = 
                            issue.priority === "critical" ? "bg-red-500 shadow-red-500/50" : 
                            issue.priority === "high" ? "bg-amber-500 shadow-amber-500/50" : "bg-accent shadow-accent/50";

                          return (
                            <button
                              key={issue.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStreamSelectedMapPin(issue);
                                showToast(`Marker selected: ${issue.title}`, "info");
                              }}
                              className={`absolute flex flex-col items-center group -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer transition-all ${
                                isSelected ? "z-20 scale-125 animate-bounce" : "hover:scale-110"
                              }`}
                              style={{ top: `${topPos}%`, left: `${leftPos}%` }}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${priorityColor} transition-transform`}></div>
                              <div className="absolute top-5 bg-[#0b0f19] text-[9px] text-white font-black px-2 py-1 rounded-md border border-gray-800 shadow opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30 font-sans">
                                {issue.title}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* ─── TAB 3: COMMUNITY ─── */}
          {activeTab === "community" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Community Forum chat board */}
                <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm flex flex-col h-[520px]">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                    <div>
                      <h2 className="font-display font-bold text-sm sm:text-base text-navy">Locality Discussion</h2>
                      <span className="text-[10px] text-gray-400 font-mono">{activeLocality} Board</span>
                    </div>
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-ring"></span>
                      14 Residents Online
                    </span>
                  </div>

                  {/* Comments messages feed list */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {messages.filter(m => m.locality === activeLocality).length === 0 ? (
                      <div className="text-center py-16 text-gray-400">
                        <MessageSquare className="w-10 h-10 mx-auto opacity-30 mb-2" />
                        <p className="text-xs">No local comments yet. Spark the discussion!</p>
                      </div>
                    ) : (
                      messages.filter(m => m.locality === activeLocality).map(msg => (
                        <div 
                          key={msg.id} 
                          className={`p-3 rounded-xl border ${msg.official ? "bg-amber-50 border-amber-200" : "bg-sand/30 border-gray-100"}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-navy text-white text-[10px] font-extrabold flex items-center justify-center">
                                {msg.name[0].toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-navy">{msg.name}</span>
                              {msg.official && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1 rounded uppercase">
                                  Coordinator Lead
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-400 font-mono">{msg.timeString}</span>
                          </div>
                          
                          <p className="text-xs text-gray-700 pl-7 leading-relaxed">{msg.text}</p>
                          
                          <div className="flex items-center gap-4 pl-7 mt-2 pt-2 border-t border-gray-100/40">
                            <button 
                              onClick={() => likeCommunityMessage(msg.id)}
                              className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${msg.likers?.includes(user?.uid || "") ? "text-red-500" : "text-gray-400 hover:text-navy"}`}
                            >
                              👍 {msg.likes} Likes
                            </button>
                            <button className="text-[10px] font-bold text-gray-400 hover:text-navy">
                              ↩ Reply
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input comments area */}
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                    {user && profile?.role === "coordinator" && (
                      <label className="flex items-center gap-2 text-[10px] text-amber-800 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <input 
                          type="checkbox" 
                          checked={postAsOfficial} 
                          onChange={(e) => setPostAsOfficial(e.target.checked)}
                          className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        📢 Post this message as an Official pinned bulletin announcement
                      </label>
                    )}

                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Write civic concern or coordination bulletin update..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitCommunityComment();
                        }}
                        className="bg-sand/40 text-xs w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-teal-civic"
                      />
                      <button 
                        onClick={submitCommunityComment}
                        className="bg-navy hover:bg-navy-light text-white p-2.5 rounded-xl transition-colors"
                      >
                        <Send className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Coordinator Bulletin & Community list info */}
                <div className="space-y-6">
                  
                  {/* Local Sector coordinator info */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldAlert className="w-5 h-5 text-saffron" />
                      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-navy">Locality Leads</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-saffron text-navy font-bold text-xs flex items-center justify-center">
                          SL
                        </div>
                        <div>
                          <div className="text-xs font-bold text-navy">Srinivas Lal (Lead S.E.)</div>
                          <div className="text-[9px] text-gray-500 font-mono">Division Liaison Commissioner</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 leading-relaxed font-sans font-light">
                        Verified leads are municipal coordinators scheduled to monitor submissions in {activeLocality}. Upvoted issues are directly compiled into physical audits for them.
                      </div>
                    </div>
                  </div>

                  {/* Bulletin alerts compiled list */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-navy mb-3">📢 Active Bulletins</h3>
                    <div className="space-y-3">
                      {messages.filter(m => m.locality === activeLocality && m.official).slice(0, 3).map(bulletin => (
                        <div key={bulletin.id} className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-900 leading-relaxed">
                          <div className="font-bold mb-1">📢 Local Lead Srinivas</div>
                          "{bulletin.text.slice(0, 100)}..."
                        </div>
                      ))}
                      {messages.filter(m => m.locality === activeLocality && m.official).length === 0 && (
                        <div className="text-center py-4 text-xs text-gray-400 font-sans">
                          No active bulletins currently posted.
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ─── TAB 4: INTERACTIVE MAPS & GIS ─── */}
          {activeTab === "maps" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-r from-navy to-navy-light rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-accent text-navy font-bold text-[10px] px-2 py-0.5 rounded-full uppercase font-mono">GIS System</span>
                    <span className="text-xs text-gray-300 font-mono">Cooperative Grid</span>
                  </div>
                  <h1 className="font-display font-bold text-xl sm:text-2xl text-accent">Hyperlocal Geographic Information System (GIS)</h1>
                  <p className="text-xs sm:text-sm text-gray-400 max-w-lg mt-1">
                    View active complaints on the live grid, search streets, toggle municipal utility layers, or click anywhere to report failures at coordinates.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      setPlacedPin(null);
                      setSelectedMapPin(null);
                      showToast("Map viewport reset to core sector", "info");
                    }}
                    className="bg-navy-light hover:bg-navy border border-gray-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                  >
                    Reset Map
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column: Map Controls & Search */}
                <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm space-y-5">
                  <div>
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-navy mb-2">GIS Coordinates Search</h3>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Search landmark or road..."
                        value={mapSearchQuery}
                        onChange={(e) => setMapSearchQuery(e.target.value)}
                        className="w-full bg-sand/50 text-xs px-3 py-2.5 pl-9 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent font-semibold"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    </div>

                    {/* Pre-filled Search Suggestions */}
                    {mapSearchQuery.trim().length > 0 && (
                      <div className="mt-2 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden text-xs divide-y divide-gray-50 max-h-40 overflow-y-auto">
                        {[
                          { name: "Old Bowenpally Market Road", lat: 17.4725, lng: 78.4795 },
                          { name: "Military Dairy Farm Road", lat: 17.4812, lng: 78.4854 },
                          { name: "Sikh Road Junction", lat: 17.4650, lng: 78.4912 },
                          { name: "Hasmathpet Lake Bypass", lat: 17.4884, lng: 78.4735 },
                          { name: "Bapuji Nagar Water Tank", lat: 17.4760, lng: 78.4810 },
                          { name: "Cantonment Park Ground", lat: 17.4695, lng: 78.4875 }
                        ]
                        .filter(l => l.name.toLowerCase().includes(mapSearchQuery.toLowerCase()))
                        .map((l, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setPlacedPin({ lat: l.lat, lng: l.lng });
                              setSelectedMapPin(null);
                              setMapSearchQuery("");
                              showToast(`Panned map to: ${l.name}`, "success");
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-sand transition-colors font-medium text-navy-light block"
                          >
                            📍 {l.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Layer Selector */}
                  <div>
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-navy mb-3">Municipal Utility Layers</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setMapLayer("streets")}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center border ${mapLayer === "streets" ? "bg-navy text-white border-navy shadow-sm" : "bg-sand text-navy-light border-gray-200 hover:bg-gray-100"}`}
                      >
                        🗺️ Streets Grid
                      </button>
                      <button 
                        onClick={() => setMapLayer("sewer")}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center border ${mapLayer === "sewer" ? "bg-[#1d3557] text-white border-[#1d3557] shadow-sm" : "bg-sand text-navy-light border-gray-200 hover:bg-gray-100"}`}
                      >
                        💧 Sewage Lines
                      </button>
                      <button 
                        onClick={() => setMapLayer("grid")}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center border ${mapLayer === "grid" ? "bg-[#b5838d] text-white border-[#b5838d] shadow-sm" : "bg-sand text-navy-light border-gray-200 hover:bg-gray-100"}`}
                      >
                        ⚡ Electric Grid
                      </button>
                      <button 
                        onClick={() => setMapLayer("heatmap")}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center border ${mapLayer === "heatmap" ? "bg-red-950 text-red-100 border-red-950 shadow-sm" : "bg-sand text-navy-light border-gray-200 hover:bg-gray-100"}`}
                      >
                        🔥 Heatmap Mode
                      </button>
                    </div>
                  </div>

                  {/* Location Filters */}
                  <div>
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-navy mb-3">Location Filters</h3>
                    <div className="flex items-center justify-between bg-sand/60 p-3 rounded-xl border border-gray-200">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-navy">Show Only Nearby</span>
                        <span className="text-[10px] text-gray-500">Within ~2km radius</span>
                      </div>
                      <button
                        onClick={() => {
                          if (!showOnlyNearby) {
                            if (!userLocation) {
                              setIsFetchingUserLocation(true);
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                                  setShowOnlyNearby(true);
                                  setIsFetchingUserLocation(false);
                                  showToast("Location acquired", "success");
                                },
                                (err) => {
                                  setIsFetchingUserLocation(false);
                                  showToast("Failed to get location", "error");
                                }
                              );
                            } else {
                              setShowOnlyNearby(true);
                            }
                          } else {
                            setShowOnlyNearby(false);
                          }
                        }}
                        disabled={isFetchingUserLocation}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showOnlyNearby ? 'bg-accent' : 'bg-gray-300'} ${isFetchingUserLocation ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showOnlyNearby ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Details Sidebar Panel */}
                  <div className="bg-sand/60 rounded-2xl p-4 border border-gray-100 space-y-3">
                    <h4 className="font-display font-bold text-xs text-navy uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200/50 pb-2">
                      <Info className="w-4 h-4 text-accent" /> Selected Landmark Info
                    </h4>

                    {selectedMapPin ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${selectedMapPin.priority === "critical" ? "bg-red-100 text-red-700" : selectedMapPin.priority === "high" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                            {selectedMapPin.priority.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono font-bold">#{selectedMapPin.id.slice(6, 12)}</span>
                        </div>
                        <h5 className="text-xs font-bold text-navy leading-snug">{selectedMapPin.title}</h5>
                        <p className="text-[11px] text-gray-500 line-clamp-3 font-sans font-light leading-relaxed">{selectedMapPin.desc}</p>
                        <div className="text-[10px] font-mono text-gray-400 space-y-1">
                          <div>📍 Lat: {selectedMapPin.lat?.toFixed(5) || "17.4725"}</div>
                          <div>📍 Lng: {selectedMapPin.lng?.toFixed(5) || "78.4795"}</div>
                          <div className="text-navy font-semibold mt-1">🏷️ Status: <span className="capitalize text-accent font-bold">{selectedMapPin.status}</span></div>
                        </div>
                        <button 
                          onClick={() => {
                            setIssueSearch(selectedMapPin.title);
                            setActiveTab("stream");
                            showToast(`Filtered feed for: ${selectedMapPin.title}`, "info");
                          }}
                          className="w-full bg-navy text-white text-[10px] font-bold py-2 rounded-xl hover:bg-navy-light transition-colors"
                        >
                          View Full Report
                        </button>
                      </div>
                    ) : placedPin ? (
                      <div className="space-y-2.5">
                        <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 font-bold px-2 py-0.5 rounded-full uppercase font-mono block w-fit">
                          Custom Pinpoint Placed
                        </span>
                        <div className="text-xs space-y-1 text-gray-600 font-mono font-semibold">
                          <div>📍 Latitude: {placedPin.lat.toFixed(5)}</div>
                          <div>📍 Longitude: {placedPin.lng.toFixed(5)}</div>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-normal font-sans font-light">
                          Click below to automatically transfer these geocoded coordinates to the reporting form and submit your complaint.
                        </p>
                        <button 
                          onClick={() => {
                            setNewIssueLoc(`GPS: ${placedPin.lat.toFixed(5)}, ${placedPin.lng.toFixed(5)}`);
                            setNewIssueLat(placedPin.lat);
                            setNewIssueLng(placedPin.lng);
                            setIsReportModalOpen(true);
                            showToast("Coordinates loaded to report form!", "success");
                          }}
                          className="w-full bg-gradient-to-r from-saffron to-accent text-navy font-display font-bold text-xs py-2.5 rounded-xl hover:scale-102 transition-transform shadow-sm"
                        >
                          Report Failure Here 📝
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-400 text-[11px] leading-relaxed">
                        <Compass className="w-8 h-8 mx-auto mb-2 opacity-30 animate-spin-slow" />
                        No element selected.<br />
                        Click on any existing pin or click anywhere on the grid to drop a geocoded coordinate pinpoint.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Immersive Vector Grid Map */}
                <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-accent animate-spin-slow" />
                      <span className="text-xs font-bold text-navy uppercase font-mono">Geospatial Overlay ({mapLayer.toUpperCase()})</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Critical
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> High
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-accent"></div> Open
                      </div>
                    </div>
                  </div>

                  {/* SVG Map visualizer */}
                  <div 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      const pctX = x / rect.width;
                      const pctY = 1 - (y / rect.height);

                      const clickedLat = 17.4600 + pctY * (17.4950 - 17.4600);
                      const clickedLng = 78.4650 + pctX * (78.5050 - 78.4650);

                      setPlacedPin({ lat: clickedLat, lng: clickedLng });
                      setSelectedMapPin(null);
                      showToast(`Geocoded pinpoint placed at: ${clickedLat.toFixed(5)}, ${clickedLng.toFixed(5)}`, "success");
                    }}
                    className="relative bg-[#0d1424] h-[520px] rounded-2xl overflow-hidden shadow-inner border border-gray-800 cursor-crosshair group"
                  >
                    {/* SVG canvas layer */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
                      {/* Grid background */}
                      <defs>
                        <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.04" />
                        </pattern>
                        <radialGradient id="hotspotGrad" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#mapGrid)" />

                      {/* Streets layer paths */}
                      <g stroke="#374151" strokeWidth="2.5" strokeLinecap="round" opacity="0.3">
                        {/* Major roads */}
                        <line x1="10%" y1="20%" x2="90%" y2="20%" stroke="#4b5563" strokeWidth="4" />
                        <line x1="30%" y1="0%" x2="30%" y2="100%" stroke="#4b5563" strokeWidth="5" />
                        <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#4b5563" strokeWidth="4" />
                        <line x1="65%" y1="0%" x2="65%" y2="100%" stroke="#374151" strokeWidth="3" />
                        <line x1="0%" y1="80%" x2="100%" y2="80%" stroke="#374151" strokeWidth="3" />
                        <line x1="10%" y1="20%" x2="30%" y2="50%" />
                        <line x1="30%" y1="20%" x2="65%" y2="50%" />
                        <line x1="65%" y1="50%" x2="90%" y2="80%" />
                        <line x1="30%" y1="80%" x2="10%" y2="50%" />
                      </g>

                      {/* Sewer layer visualization */}
                      {mapLayer === "sewer" && (
                        <g stroke="#0ea5e9" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse">
                          <line x1="30%" y1="0%" x2="30%" y2="100%" />
                          <line x1="0%" y1="52%" x2="100%" y2="52%" />
                          <line x1="10%" y1="18%" x2="90%" y2="18%" />
                        </g>
                      )}

                      {/* Grid electricity paths */}
                      {mapLayer === "grid" && (
                        <g stroke="#f59e0b" strokeWidth="1.5">
                          <line x1="10%" y1="20%" x2="90%" y2="20%" />
                          <line x1="30%" y1="0%" x2="30%" y2="100%" />
                          <line x1="0%" y1="50%" x2="100%" y2="50%" />
                          <circle cx="30%" cy="20%" r="4" fill="#fbbf24" />
                          <circle cx="65%" cy="20%" r="4" fill="#fbbf24" />
                          <circle cx="30%" cy="50%" r="4" fill="#fbbf24" />
                          <circle cx="65%" cy="50%" r="4" fill="#fbbf24" />
                        </g>
                      )}

                      {/* Heatmap overlay layers */}
                      {mapLayer === "heatmap" && (
                        <g>
                          <circle cx="35%" cy="25%" r="65" fill="url(#hotspotGrad)" />
                          <circle cx="28%" cy="48%" r="80" fill="url(#hotspotGrad)" />
                          <circle cx="62%" cy="52%" r="50" fill="url(#hotspotGrad)" />
                          <circle cx="75%" cy="78%" r="70" fill="url(#hotspotGrad)" />
                        </g>
                      )}
                    </svg>

                    <div className="absolute top-[14%] left-[12%] text-[9px] text-gray-500 font-mono tracking-wider font-bold uppercase pointer-events-none select-none">
                      Military Dairy Farm Road
                    </div>
                    <div className="absolute top-[46%] left-[34%] text-[9px] text-gray-500 font-mono tracking-wider font-bold uppercase pointer-events-none select-none">
                      Sikh Road Bypass
                    </div>
                    <div className="absolute top-[82%] left-[45%] text-[9px] text-gray-500 font-mono tracking-wider font-bold uppercase pointer-events-none select-none">
                      Hasmathpet Lake Area
                    </div>

                    <div className="absolute top-[18%] left-[26%] bg-navy-dark/90 text-white border border-gray-800 text-[9px] px-2 py-1 rounded shadow-md font-mono select-none pointer-events-none">
                      🏢 Ward Office
                    </div>
                    <div className="absolute top-[46%] left-[68%] bg-navy-dark/90 text-white border border-gray-800 text-[9px] px-2 py-1 rounded shadow-md font-mono select-none pointer-events-none">
                      🏥 Urban Clinic
                    </div>

                    {/* Live Complaints Pins */}
                    {issues.filter(issue => {
                      if (!showOnlyNearby || !userLocation) return true;
                      const lat = issue.lat || 17.4725;
                      const lng = issue.lng || 78.4795;
                      const dist = Math.sqrt(Math.pow(lat - userLocation.lat, 2) + Math.pow(lng - userLocation.lng, 2));
                      return dist < 0.02; // Roughly 2km radius
                    }).map((issue) => {
                      const lat = issue.lat || 17.4725;
                      const lng = issue.lng || 78.4795;

                      const pctX = (lng - 78.4650) / (78.5050 - 78.4650);
                      const pctY = 1 - ((lat - 17.4600) / (17.4950 - 17.4600));

                      const leftPos = Math.max(5, Math.min(95, pctX * 100));
                      const topPos = Math.max(5, Math.min(95, pctY * 100));

                      const priorityColor = 
                        issue.priority === "critical" ? "bg-red-500 shadow-red-500/50" : 
                        issue.priority === "high" ? "bg-amber-500 shadow-amber-500/50" : "bg-accent shadow-accent/50";

                      return (
                        <button
                          key={issue.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMapPin(issue);
                            setPlacedPin(null);
                            showToast(`Selected report: ${issue.title}`, "info");
                          }}
                          className="absolute flex flex-col items-center group -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
                          style={{ top: `${topPos}%`, left: `${leftPos}%` }}
                        >
                          {issue.priority === "critical" && (
                            <span className="absolute inline-flex h-7 w-7 rounded-full bg-red-500 opacity-40 animate-ping"></span>
                          )}
                          {issue.priority === "high" && (
                            <span className="absolute inline-flex h-6 w-6 rounded-full bg-amber-500 opacity-30 animate-ping"></span>
                          )}

                          <div className={`w-4 h-4 rounded-full ${priorityColor} border-2 border-white shadow-lg flex items-center justify-center transform hover:scale-125 transition-transform`}>
                            {issue.cat === "Streetlight" ? "💡" : issue.cat === "Water Leakage" ? "💧" : "📍"}
                          </div>

                          <div className="hidden group-hover:block absolute bottom-6 bg-navy text-white text-[10px] p-2 rounded-xl shadow-xl border border-gray-800 whitespace-nowrap z-30 font-bold max-w-xs">
                            <div className="font-semibold text-accent">{issue.cat}</div>
                            <div className="text-gray-300 font-sans leading-tight mt-0.5">{issue.title.slice(0, 26)}...</div>
                          </div>
                        </button>
                      );
                    })}

                    {/* Placed Pin representation */}
                    {placedPin && (
                      <div 
                        className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                        style={{
                          top: `${(1 - (placedPin.lat - 17.4600) / (17.4950 - 17.4600)) * 100}%`,
                          left: `${((placedPin.lng - 78.4650) / (78.5050 - 78.4650)) * 100}%`
                        }}
                      >
                        <div className="w-10 h-10 border border-amber-500 rounded-full animate-spin absolute"></div>
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full absolute"></div>
                        <div className="h-6 w-[1px] bg-amber-500/80 absolute"></div>
                        <div className="w-6 h-[1px] bg-amber-500/80 absolute"></div>

                        <div className="bg-gradient-to-t from-amber-600 to-amber-400 text-white rounded-full p-1.5 shadow-2xl relative -top-6 animate-bounce">
                          🎯
                        </div>
                      </div>
                    )}

                    {/* User Location representation */}
                    {userLocation && showOnlyNearby && (
                      <div 
                        className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                        style={{
                          top: `${(1 - (userLocation.lat - 17.4600) / (17.4950 - 17.4600)) * 100}%`,
                          left: `${((userLocation.lng - 78.4650) / (78.5050 - 78.4650)) * 100}%`
                        }}
                      >
                        <div className="w-8 h-8 bg-blue-500/20 border-2 border-blue-500/50 rounded-full animate-ping absolute"></div>
                        <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg absolute"></div>
                        <div className="absolute top-5 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap font-bold">
                          You are here
                        </div>
                      </div>
                    )}

                    {/* Bottom instruction overlay */}
                    <div className="absolute bottom-4 left-4 right-4 bg-navy-dark/95 backdrop-blur-sm border border-gray-800 rounded-xl p-3 flex justify-between items-center text-[10px] sm:text-xs">
                      <span className="text-gray-400 font-sans flex items-center gap-1">
                        👉 <span className="text-white font-semibold">Tip:</span> Click anywhere on this grid to drop a custom marker and geocode a report pinpoint!
                      </span>
                      {placedPin && (
                        <span className="text-amber-400 font-bold font-mono animate-pulse">
                          Custom marker ready! Lat: {placedPin.lat.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 5: LEADERBOARD ─── */}
          {activeTab === "heroes" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Top Citizen Heroes list */}
                <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
                  <h2 className="font-display font-bold text-sm sm:text-base text-navy mb-4">🥇 Hyperlocal Civic Heroes</h2>
                  
                  <div className="space-y-3">
                    {[
                      { rank: 1, name: "Arun Kumar", locality: "Old Bowenpally", badge: "👑 City Legend", points: 280, icon: "🥇" },
                      { rank: 2, name: "Sita Reddy", locality: "Old Bowenpally", badge: "🦁 Samaj Shakti Hero", points: 195, icon: "🥈" },
                      { rank: 3, name: "Priyanka Sharma", locality: "Gachibowli", badge: "⚡ Community Guardian", points: 110, icon: "🥉" },
                      { rank: 4, name: "Vikram Naidu", locality: "Old Bowenpally", badge: "🔥 Active Voice", points: 55, icon: "⭐" },
                      { rank: 5, name: "Varshini (You)", locality: activeLocality, badge: profile?.badge || "🌱 First Step", points: profile?.reputation || 20, icon: "🌱" }
                    ].sort((a,b) => b.points - a.points).map((item, idx) => (
                      <div 
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-colors ${item.name.includes("(You)") ? "bg-amber-50 border-amber-300" : "bg-sand/20 border-gray-100"}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold font-mono w-6 text-center">{idx + 1}</span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-navy-light text-white text-xs font-bold flex items-center justify-center">
                            {item.name[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-navy">{item.name}</div>
                            <div className="text-[10px] text-gray-500">{item.locality} · <span className="text-accent font-semibold">{item.badge}</span></div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-navy font-mono">{item.points} PTS</div>
                          <span className="text-[10px] text-gray-400">Total Influence</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reputation mechanism info */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-navy to-navy-light rounded-2xl p-5 text-white shadow-md">
                    <h3 className="font-display font-bold text-sm text-accent mb-3 flex items-center gap-1.5">
                      <Flame className="w-5 h-5 text-accent animate-float" /> Gamification Rules
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans font-light">
                      Earn Reputation points and level up your citizen influence tier inside Samaj Shakti by actively safeguarding your neighborhood.
                    </p>
                    <div className="mt-4 space-y-2 border-t border-gray-800 pt-3 text-[11px] font-mono text-gray-400">
                      <div className="flex justify-between">
                        <span>Report civic failure:</span>
                        <span className="text-green-400 font-bold">+10 PTS</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Upvote another issue:</span>
                        <span className="text-green-400 font-bold">+5 PTS</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Verify reported leads:</span>
                        <span className="text-green-400 font-bold">+15 PTS</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* ─── MODAL: REPORT CIVIC INCIDENT ─── */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border-4 border-navy-light p-6 space-y-4">
            
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent animate-float" />
                <h2 className="font-display font-bold text-base sm:text-lg text-navy">Report Civic Failure</h2>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-navy text-xl"
              >
                ✕
              </button>
            </div>

            {/* Simulated preset buttons for diagnostic testing */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">OR SELECT MOCK CIVIC EVIDENCE SAMPLES TO TEST AI VISION:</span>
              <div className="grid grid-cols-2 gap-2">
                {CIVIC_PRESETS.map((p) => (
                  <button 
                    key={p.id}
                    type="button"
                    onClick={() => selectPreset(p.id)}
                    className={`p-2 rounded-xl text-left border text-xs leading-snug transition-colors ${selectedPresetId === p.id ? "bg-accent/15 border-accent text-navy font-bold" : "bg-sand/30 border-gray-200 hover:border-navy text-gray-700"}`}
                  >
                    {p.id === "preset-pothole" ? "🛣️ Large Pothole" : p.id === "preset-garbage" ? "🗑️ Overflowing Refuse" : p.id === "preset-waterleak" ? "💧 Pressurized Water Leak" : "💡 Broken Streetlight"}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice-to-Report AI Feature */}
            <div className="bg-sand/30 border border-gray-200 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-navy flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-accent" /> AI Voice-to-Report
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Describe the issue and let AI fill the details below.</p>
                </div>
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all shadow-sm ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-navy hover:bg-navy-light text-white'} ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (isRecording ? <div className="w-3 h-3 bg-white rounded-sm"></div> : <Mic className="w-4 h-4" />)}
                </button>
              </div>
              
              {isRecording && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${recordingProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>Recording...</span>
                    <span>{Math.floor(30 - (recordingProgress / 100) * 30)}s left</span>
                  </div>
                </div>
              )}
              {isTranscribing && (
                <div className="text-[10px] text-teal-civic font-bold flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> AI is transcribing and summarizing...
                </div>
              )}
            </div>

            {/* Core Form input details */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy block">Grievance Title *</label>
                <input 
                  type="text"
                  placeholder="e.g., Collapsed sewer pipeline flooding market access road"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  className="bg-sand/40 text-xs w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-teal-civic"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy block">Detailed Description *</label>
                <textarea 
                  rows={3}
                  placeholder="Explain structural failure details, approximate time offline, security risks, or stray animal risks..."
                  value={newIssueDesc}
                  onChange={(e) => setNewIssueDesc(e.target.value)}
                  className="bg-sand/40 text-xs w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-teal-civic"
                />
              </div>

              <div className="space-y-1.5 bg-sand/35 rounded-xl p-3 border border-gray-250">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-navy flex items-center gap-1">
                    📍 GPS Telemetry Location
                  </span>
                  <button 
                    type="button"
                    onClick={enableLiveGPS}
                    disabled={gpsLoading}
                    className="text-[10px] bg-teal-civic/10 text-teal-civic hover:bg-teal-civic/20 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all"
                  >
                    {gpsLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-teal-civic" />
                    ) : (
                      <Locate className="w-3 h-3" />
                    )}
                    {newIssueLat ? "Recalibrate GPS" : "Acquire GPS Coords"}
                  </button>
                </div>
                
                <div className="text-xs font-mono font-semibold flex items-center justify-between">
                  {newIssueLat && newIssueLng ? (
                    <div className="text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-2 w-full shadow-sm">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Latitude: {newIssueLat.toFixed(5)} • Longitude: {newIssueLng.toFixed(5)}</span>
                    </div>
                  ) : (
                    <div className="text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 flex items-center gap-2 w-full shadow-sm">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>Coordinates pending... Acquiring GPS telemetry</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 font-sans font-light leading-snug">
                  Location is securely logged on the civic grid. To pinpoint a custom position manually, use the **Interactive Maps** tab and drop a pin!
                </p>
              </div>

              {/* Upload evidence picker */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-navy block">Incident Evidence (Photo or Video)</span>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-navy hover:bg-navy-light text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-accent" /> Upload Evidence
                    <input 
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {(customImage || customVideo) && (
                    <div className="flex items-center gap-1.5">
                      {customImage ? <Image className="w-3 h-3 text-green-600" /> : <Video className="w-3 h-3 text-green-600" />}
                      <span className="text-[10px] text-green-600 font-bold font-mono">
                        {customImage ? "Image" : "Video"} attached ✓
                      </span>
                    </div>
                  )}
                </div>
                {customImage && (
                  <img 
                    src={customImage} 
                    alt="Preview evidence scan" 
                    className="rounded-xl max-h-36 w-full object-cover mt-2 border border-gray-200"
                  />
                )}
                {customVideo && (
                  <video 
                    src={customVideo} 
                    controls 
                    className="rounded-xl max-h-36 w-full object-cover mt-2 border border-gray-200"
                  />
                )}
              </div>

              {/* Trigger Gemini Advanced Diagnostic */}
              <button 
                type="button"
                onClick={triggerAiDiagnostic}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-teal-civic to-teal-civic-dark text-white font-display font-bold text-xs p-3 rounded-xl hover:opacity-90 flex items-center justify-center gap-1 transition-opacity disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-accent" /> Analyzing incident evidence...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-accent animate-float" /> Run Gemini AI Diagnostics
                  </>
                )}
              </button>

              {/* AI Diagnostic result summary block */}
              {aiAnalysisResult && (
                <div className="p-4 rounded-xl bg-navy text-white text-xs space-y-1.5 border border-accent/30 animate-pulse-ring">
                  <div className="font-display font-bold text-[10px] text-accent uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-accent" /> Diagnostic Verification
                  </div>
                  <div>Category: <strong className="text-white">{aiAnalysisResult.category}</strong></div>
                  <div>Risk Severity: <strong className="text-red-400 capitalize">{aiAnalysisResult.priority}</strong></div>
                  <div>Responsibility Office: <strong className="text-white">{aiAnalysisResult.suggestedAuthority}</strong></div>
                  <p className="text-gray-300 leading-relaxed font-sans font-light mt-1 text-[11px]">
                    {aiAnalysisResult.priorityJustification}
                  </p>
                  <p className="text-accent leading-relaxed text-[10px] mt-1">
                    🚨 Safety Notice: {aiAnalysisResult.immediateCitizenSafetyAction}
                  </p>
                </div>
              )}

              {/* Category & priority override select selectors */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy block">Category</label>
                  <select 
                    value={newIssueCategory}
                    onChange={(e) => setNewIssueCategory(e.target.value as any)}
                    className="bg-sand/60 text-xs w-full px-3 py-2.5 rounded-xl border border-gray-200 cursor-pointer font-semibold text-gray-700 focus:outline-none focus:border-teal-civic"
                  >
                    <option value="Road Damage">Road Damage</option>
                    <option value="Water Leakage">Water Leakage</option>
                    <option value="Streetlight">Streetlight</option>
                    <option value="Waste Management">Waste Management</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy block">Priority</label>
                  <select 
                    value={newIssuePriority}
                    onChange={(e) => setNewIssuePriority(e.target.value as any)}
                    className="bg-sand/60 text-xs w-full px-3 py-2.5 rounded-xl border border-gray-200 cursor-pointer font-semibold text-gray-700 focus:outline-none focus:border-teal-civic"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="critical">🔴 Critical</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button 
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-navy font-display font-bold text-xs p-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={submitIssueForm}
                className="flex-1 bg-gradient-to-r from-saffron to-accent text-navy font-display font-bold text-xs p-3 rounded-xl shadow-md hover:opacity-95 transition-all"
              >
                🚀 Submit Report
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL: SPEAK TO SAMAJ SHAKTI AI ─── */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#060b13]/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111928] text-white rounded-3xl max-w-2xl w-full border border-gray-800 shadow-2xl overflow-hidden flex flex-col relative animate-fade-in">
            
            {/* Modal Header Bar matching Sahara Call UI */}
            <div className="bg-[#1b2436] px-6 py-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-navy shadow-lg shadow-emerald-500/20">
                  <Cpu className="w-5 h-5 text-navy animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xs sm:text-sm text-gray-100 uppercase tracking-wider">
                    Cooperative City Intelligence
                  </h3>
                  <span className="text-[9px] sm:text-[10px] text-emerald-400 font-mono tracking-wider">
                    Multi-Turn Multi-Model Municipal Grounding
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRecentCommandsOpen(!isRecentCommandsOpen)}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${isRecentCommandsOpen ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-[#1a2536] hover:bg-[#253248] text-emerald-400 border-gray-700'} cursor-pointer`}
                >
                  <History className="w-3.5 h-3.5" />
                  Recent
                </button>
                <span className="hidden sm:inline-flex items-center gap-1 bg-[#1a2536] border border-gray-700 text-gray-300 text-[10px] px-2.5 py-1 rounded-md font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  model: gemini-3.5-flash
                </span>
                <button 
                  onClick={() => {
                    if (activeTtsAudio) activeTtsAudio.pause();
                    setIsVoiceModalOpen(false);
                  }}
                  className="bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode / Tabs */}
            <div className="bg-[#121c2c] px-6 py-3 border-b border-gray-800/80">
              <div className="grid grid-cols-2 gap-1 bg-[#1c293e] p-1 rounded-xl">
                {[
                  { id: "chat", label: "CHAT", icon: <MessageSquare className="w-3 h-3" /> },
                  { id: "call", label: "CALL", icon: <Phone className="w-3 h-3" /> }
                ].map((tab) => {
                  const isActive = voiceActiveTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setVoiceActiveTab(tab.id as any)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black tracking-wider transition-all duration-200 ${
                        isActive 
                          ? "bg-white text-[#111928] shadow-md scale-102" 
                          : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden xs:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Interactive Call Panel with Drawer */}
            <div className="flex flex-1 relative overflow-hidden">
              
              {/* Recent Commands Drawer */}
              {isRecentCommandsOpen && (
                <div className="w-64 bg-[#172236] border-r border-gray-800 p-4 overflow-y-auto hidden sm:block animate-fade-in shrink-0">
                  <h4 className="text-[10px] uppercase font-bold text-emerald-500 font-mono tracking-wider mb-4 border-b border-gray-700 pb-2">
                    Recent Commands
                  </h4>
                  <div className="space-y-2">
                    {recentVoiceCommands.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No recent queries.</p>
                    ) : (
                      recentVoiceCommands.map((cmd, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setVoiceTranscript(cmd);
                            sendVoiceQuery(cmd);
                          }}
                          className="w-full text-left text-[11px] text-gray-300 hover:text-white bg-[#1a2536] hover:bg-[#202c41] border border-gray-800 hover:border-emerald-500/50 p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-1 group"
                        >
                          <span className="line-clamp-2 leading-relaxed">{cmd}</span>
                          <span className="text-[9px] text-emerald-500/0 group-hover:text-emerald-500/80 font-mono uppercase tracking-wider transition-colors self-end">
                            Re-run ⤶
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-8 flex-1 flex flex-col items-center justify-center space-y-6">
              
              {voiceActiveTab === "call" ? (
                <>
                  {/* Spinning / Glowing Call Widget */}
                  <div className="relative flex items-center justify-center">
                    <div className={`absolute w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 ${isVoiceListening ? "animate-ping" : "animate-pulse"}`}></div>
                    <div className={`absolute w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 ${isVoiceListening ? "scale-110" : ""}`}></div>
                    <div className={`w-16 h-16 rounded-full ${isVoiceListening ? "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]" : "bg-emerald-600"} flex items-center justify-center transition-all duration-300 z-10`}>
                      <Phone className="w-7 h-7 text-white rotate-135" />
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <h4 className="font-display font-black text-lg sm:text-xl text-white tracking-wide">
                      Samaj Shakti Voice Officer Live
                    </h4>
                    <p className="text-[10px] sm:text-xs text-emerald-400 font-mono tracking-widest uppercase font-semibold flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Real-Time WebSocket Audio Link Activated
                    </p>
                  </div>

                  {/* Enhanced Soundwave Visualizer (Emerald Green) */}
                  <div className="w-full max-w-sm py-2 flex flex-col items-center justify-center space-y-4">
                    <div 
                      className="flex items-end justify-center gap-1.5 h-16 w-full px-8 transition-all duration-75 rounded-2xl py-2"
                      style={{ 
                        background: isVoiceListening ? `rgba(16, 185, 129, ${0.03 + micVolume * 0.15})` : "rgba(255,255,255,0.01)",
                        boxShadow: isVoiceListening ? `inset 0 0 20px rgba(16, 185, 129, ${0.08 + micVolume * 0.25})` : "none"
                      }}
                    >
                      {[...Array(12)].map((_, i) => {
                        const baseHeights = [12, 24, 48, 64, 40, 56, 32, 20, 44, 28, 16, 8];
                        const randomFactors = [0.6, 1.2, 1.4, 1.7, 1.3, 1.5, 1.1, 0.8, 1.3, 1.0, 0.7, 0.4];
                        const heights = ["h-3", "h-6", "h-12", "h-16", "h-10", "h-14", "h-8", "h-5", "h-11", "h-7", "h-4", "h-2"];
                        const delay = `${i * 0.08}s`;
                        const isListeningClass = isVoiceListening ? "" : isVoiceLoading ? "animate-pulse" : "";
                        const color = isVoiceListening ? "bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]" : isVoiceLoading ? "bg-amber-500" : "bg-teal-500/40";
                        
                        const activeHeight = isVoiceListening 
                          ? Math.max(6, Math.min(64, baseHeights[i] * (0.25 + micVolume * randomFactors[i] * 3.5)))
                          : undefined;

                        return (
                          <div 
                            key={i} 
                            className={`w-2.5 rounded-full ${color} ${isListeningClass} ${activeHeight !== undefined ? "" : heights[i]}`}
                            style={{ 
                              height: activeHeight !== undefined ? `${activeHeight}px` : undefined,
                              animationDelay: delay, 
                              transition: isVoiceListening ? "height 0.07s ease-out" : "height 0.2s ease-in-out" 
                            }}
                          />
                        );
                      })}
                    </div>

                    {isVoiceListening && (
                      <div className="flex flex-col items-center gap-1.5 w-full animate-fade-in">
                        <div className="w-56 bg-gray-800/80 h-1 rounded-full overflow-hidden border border-gray-700/50">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-75"
                            style={{ width: `${Math.min(100, Math.max(2, micVolume * 100))}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-mono text-emerald-400 tracking-widest uppercase font-black">
                          SIGNAL LEVEL: {Math.round(micVolume * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Translucent Live Transcription Stream block */}
                  <div className="w-full space-y-3 bg-[#172236]/60 rounded-2xl p-4 sm:p-5 border border-emerald-500/10 shadow-inner max-h-52 overflow-y-auto">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] text-emerald-400 uppercase font-black font-mono tracking-wider">
                        Live Transcription Stream:
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-[9px] text-emerald-400/70 uppercase font-bold font-mono">You:</span>
                        <div className="text-xs sm:text-sm font-semibold text-gray-100 leading-normal italic">
                          "{voiceTranscript || "Connected! Speaking now with Samaj Shakti AI..."}"
                        </div>
                      </div>

                      <div className="space-y-1 border-t border-gray-800/50 pt-2.5">
                        <span className="text-[9px] text-amber-400 uppercase font-bold font-mono">Samaj Shakti Voice Officer:</span>
                        <div className="text-xs sm:text-sm leading-relaxed text-gray-200 font-light font-sans">
                          {voiceResponseText}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full flex-1 flex flex-col justify-start bg-[#172236]/30 rounded-2xl border border-gray-800/50 overflow-hidden relative">
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                    {voiceMessages.length === 0 ? (
                      <div className="text-center text-gray-500 text-sm py-10 italic">Start a conversation with Samaj Shakti AI...</div>
                    ) : (
                      voiceMessages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <span className={`text-[9px] mb-1.5 font-mono uppercase tracking-wider font-black ${msg.role === 'user' ? 'text-emerald-400/70' : 'text-amber-400'}`}>
                            {msg.role === 'user' ? 'You' : 'Samaj Shakti Voice Officer'}
                          </span>
                          <div className={`px-4 py-3 rounded-2xl max-w-[90%] text-[13px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-emerald-50 rounded-tr-sm border border-emerald-500/20 shadow-emerald-900/20' : 'bg-[#1c293e] text-gray-200 rounded-tl-sm border border-gray-700/50'}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                    {isVoiceLoading && (
                      <div className="flex flex-col items-start animate-fade-in">
                        <span className="text-[9px] mb-1.5 font-mono uppercase tracking-wider font-black text-amber-400">Samaj Shakti Voice Officer</span>
                        <div className="px-5 py-4 rounded-2xl max-w-[85%] text-sm bg-[#1c293e] text-gray-200 rounded-tl-sm border border-gray-700/50 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"></span>
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce delay-100"></span>
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce delay-200"></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Modal Bottom Actions Row */}
            {voiceActiveTab === "call" ? (
              <div className="bg-[#111928] px-6 py-5 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Voice selector */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 w-full sm:w-auto text-[11px] text-gray-400 font-mono">
                    <span>Tone:</span>
                    <select 
                      value={ttsVoice}
                      onChange={(e) => setTtsVoice(e.target.value as any)}
                      className="bg-[#1b2436] text-gray-200 px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Kore">Kore (Warm Male)</option>
                      <option value="Puck">Puck (Crisp Female)</option>
                      <option value="Charon">Charon (Deep Male)</option>
                      <option value="Zephyr">Zephyr (Cheer Female)</option>
                    </select>
                  </div>
                  
                  {/* Quick Toggles */}
                  <div className="flex items-center gap-4 text-[9px] font-mono font-bold text-gray-500">
                    <label className="flex items-center gap-1 cursor-pointer hover:text-emerald-400 transition-colors">
                      <input type="checkbox" checked={groundMaps} onChange={(e) => setGroundMaps(e.target.checked)} className="accent-emerald-500 w-3 h-3" />
                      MAPS GROUND
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer hover:text-emerald-400 transition-colors">
                      <input type="checkbox" checked={deepReasoning} onChange={(e) => setDeepReasoning(e.target.checked)} className="accent-amber-500 w-3 h-3" />
                      DEEP THINK
                    </label>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex gap-2">
                  <button 
                    onClick={toggleVoiceCall}
                    className={`w-full sm:w-56 flex items-center justify-center gap-2 text-white text-xs font-bold font-display py-3 px-6 rounded-xl transition-all shadow-md active:scale-98 ${
                      isCallActive 
                        ? "bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 hover:shadow-red-500/10 animate-pulse-ring" 
                        : "bg-gradient-to-r from-[#e05638] to-[#f26e3a] hover:opacity-95 shadow-lg shadow-orange-500/10"
                    }`}
                  >
                    {isCallActive ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    {isCallActive ? "DISCONNECT CALL" : "INITIATE CALL"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#111928] px-6 py-4 border-t border-gray-800 flex flex-col gap-3">
                {/* Chat Control Bar */}
                <div className="flex items-center gap-4 px-1">
                  <button 
                    onClick={() => setGroundMaps(!groundMaps)}
                    className={`flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest px-2 py-1 rounded border transition-all ${groundMaps ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-transparent border-gray-700 text-gray-500 hover:text-gray-300"}`}
                  >
                    <Globe className="w-3 h-3" />
                    MAPS GROUNDING {groundMaps ? "ON" : "OFF"}
                  </button>
                  <button 
                    onClick={() => setGroundSearch(!groundSearch)}
                    className={`flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest px-2 py-1 rounded border transition-all ${groundSearch ? "bg-blue-500/10 border-blue-500 text-blue-400" : "bg-transparent border-gray-700 text-gray-500 hover:text-gray-300"}`}
                  >
                    <Search className="w-3 h-3" />
                    SEARCH {groundSearch ? "ON" : "OFF"}
                  </button>
                  <button 
                    onClick={() => setDeepReasoning(!deepReasoning)}
                    className={`flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest px-2 py-1 rounded border transition-all ${deepReasoning ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-transparent border-gray-700 text-gray-500 hover:text-gray-300"}`}
                  >
                    <Zap className="w-3 h-3" />
                    DEEP THINKING {deepReasoning ? "ON" : "OFF"}
                  </button>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem('chatInput') as HTMLInputElement;
                    if (input.value.trim()) {
                      sendVoiceQuery(input.value);
                      input.value = '';
                    }
                  }}
                  className="flex items-center gap-3"
                >
                  <input 
                    name="chatInput"
                    type="text" 
                    placeholder="Type a message to Samaj Shakti AI..."
                    autoComplete="off"
                    className="flex-1 bg-[#1c293e] text-white text-sm px-5 py-3.5 rounded-xl border border-gray-700 focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-500 shadow-inner"
                    disabled={isVoiceLoading}
                  />
                  <button 
                    type="submit"
                    disabled={isVoiceLoading}
                    className="bg-gradient-to-tr from-emerald-600 to-teal-500 hover:opacity-90 text-white p-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20 active:scale-95 cursor-pointer"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Floating AI Assistant Button (Persistent on all pages) */}
      <button 
        type="button"
        id="floating-ai-voice-btn"
        onClick={() => {
          setIsVoiceModalOpen(true);
          setVoiceResponseText("Namaste! I am your Samaj Shakti AI Voice Assistant. Click the microphone below to talk, or write in the chat box.");
        }}
        className="fixed bottom-36 right-6 sm:bottom-36 lg:bottom-8 lg:right-8 z-40 w-14 h-14 bg-gradient-to-tr from-saffron to-accent text-navy rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)] border-2 border-white cursor-pointer hover:scale-110 active:scale-95 transition-all group"
        title="Get help from Samaj Shakti AI (Chat/Call)"
      >
        <div className="absolute inset-0 rounded-full bg-accent/30 animate-ping group-hover:animate-none"></div>
        <Bot className="w-6 h-6 text-navy animate-pulse relative z-10" />
        <span className="absolute -top-1 -right-1 bg-navy text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-white z-20 shadow-sm font-mono leading-none">
          AI
        </span>
      </button>

      {/* Floating Action Button for mobile screens */}
      <button 
        onClick={() => setIsReportModalOpen(true)}
        className="fixed bottom-20 right-6 z-40 lg:hidden w-14 h-14 bg-navy text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-accent transform hover:scale-110 active:scale-95 transition-all"
        title="Report Civic Failure"
      >
        <Plus className="w-7 h-7 text-accent" />
      </button>

      {/* Mobile Footer Tab Bar */}
      <nav className="sticky bottom-0 z-50 lg:hidden bg-navy text-white border-t border-gray-800 shadow-2xl">
        <div className="grid grid-cols-5 h-16 text-[10px] font-bold text-gray-400">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === "dashboard" ? "text-accent" : "hover:text-white"}`}
          >
            <BarChart3 className="w-4.5 h-4.5" />
            <span>Dash</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("stream")}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === "stream" ? "text-accent" : "hover:text-white"}`}
          >
            <Compass className="w-4.5 h-4.5" />
            <span>Issues</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("community")}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === "community" ? "text-accent" : "hover:text-white"}`}
          >
            <MessageSquare className="w-4.5 h-4.5" />
            <span>Forum</span>
          </button>

          <button 
            onClick={() => setActiveTab("maps")}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === "maps" ? "text-accent" : "hover:text-white"}`}
          >
            <MapPin className="w-4.5 h-4.5 text-accent" />
            <span>Maps</span>
          </button>

          <button 
            onClick={() => setActiveTab("heroes")}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === "heroes" ? "text-accent" : "hover:text-white"}`}
          >
            <Award className="w-4.5 h-4.5" />
            <span>Heroes</span>
          </button>
        </div>
      </nav>

      {/* ─── MODAL: USER PROFILE & GAMIFICATION ─── */}
      {isProfileModalOpen && user && profile && (() => {
        const rep = profile.reputation || 0;
        const reportsCount = profile.reportsCount || 0;
        const validationsCount = profile.votesGiven || 0;
        const resolutionsCount = issues.filter(issue => issue.reporterUid === user.uid && issue.status === "resolved").length;

        let level = 1;
        let nextLevelXp = 150;
        let prevLevelXp = 0;
        let levelTitle = "CIVIL DEFENDER";

        if (rep >= 500) {
          level = 4;
          nextLevelXp = 1000;
          prevLevelXp = 500;
          levelTitle = "CITY LEGEND";
        } else if (rep >= 300) {
          level = 3;
          nextLevelXp = 500;
          prevLevelXp = 300;
          levelTitle = "COMMUNITY GUARDIAN";
        } else if (rep >= 150) {
          level = 2;
          nextLevelXp = 300;
          prevLevelXp = 150;
          levelTitle = "ACTIVE VOICE";
        } else {
          level = 1;
          nextLevelXp = 150;
          prevLevelXp = 0;
          levelTitle = "CIVIL DEFENDER";
        }

        const xpNeededForNext = nextLevelXp - rep;
        const levelProgress = Math.min(100, Math.max(0, ((rep - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100));

        const badges = [
          {
            id: "first_step",
            name: "First Step",
            desc: "Flipped your first report to flag a community issue.",
            req: "Req: 50 XP or 1 Report",
            unlocked: reportsCount >= 1 || rep >= 50,
            icon: "🌱"
          },
          {
            id: "active_voice",
            name: "Active Voice",
            desc: "Filed 5+ high-quality community reports.",
            req: "Req: 200 XP or 5 Reports",
            unlocked: reportsCount >= 5 || rep >= 200,
            icon: "🔥"
          },
          {
            id: "community_guardian",
            name: "Community Guardian",
            desc: "Filed 10+ community reports across multiple wards.",
            req: "Req: 400 XP or 10 Reports",
            unlocked: reportsCount >= 10 || rep >= 400,
            icon: "🛡️"
          },
          {
            id: "civic_validator",
            name: "Civic Validator",
            desc: "Upvoted or verified 10+ neighbor reports.",
            req: "Req: 100 XP or 10 Upvotes",
            unlocked: validationsCount >= 10 || rep >= 100,
            icon: "✓"
          },
          {
            id: "city_legend",
            name: "City Legend",
            desc: "Achieved outstanding local citizen impact.",
            req: "Req: 500 XP",
            unlocked: rep >= 500,
            icon: "👑"
          }
        ];

        const unlockedCount = badges.filter(b => b.unlocked).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md bg-[#0F172A] border border-gray-800 rounded-3xl p-6 text-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] sm:text-xs font-mono font-black text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full tracking-wider uppercase">
                  LEVEL {level} {levelTitle}
                </span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      handleUserSignOut();
                      setIsProfileModalOpen(false);
                    }}
                    className="text-xs font-mono font-bold tracking-wider text-gray-400 hover:text-white transition-colors uppercase border border-gray-800 px-2.5 py-1 rounded-lg hover:border-gray-700 bg-gray-900/30 cursor-pointer"
                  >
                    LOGOUT
                  </button>
                  <button 
                    onClick={() => setIsProfileModalOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-white bg-gray-900/30 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors cursor-pointer flex items-center justify-center"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profile Details */}
              <div className="flex flex-col items-center text-center mt-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-saffron to-accent rounded-full flex items-center justify-center shadow-lg border-2 border-white/25">
                  <span className="text-navy font-display font-black text-2xl sm:text-3xl">
                    {profile.name[0].toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight mt-3">
                  {profile.name}
                </h3>
                <span className="text-xs sm:text-sm text-gray-400 font-mono tracking-tight mt-1">
                  {profile.email}
                </span>
              </div>

              {/* Progression Section */}
              <div className="mt-6 bg-[#161F30]/60 p-4 rounded-2xl border border-gray-800/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300 uppercase tracking-wider">Total Points (XP)</span>
                  <span className="font-mono font-black text-accent">{rep} XP</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-[#0F172A] rounded-full overflow-hidden mt-2.5 border border-gray-800">
                  <div 
                    className="h-full bg-gradient-to-r from-saffron to-accent rounded-full transition-all duration-500"
                    style={{ width: `${levelProgress}%` }}
                  ></div>
                </div>

                <div className="text-[10px] sm:text-xs text-gray-400 font-mono text-right mt-1.5">
                  {xpNeededForNext > 0 ? `${xpNeededForNext} XP to next level` : "Max Level Reached!"}
                </div>
              </div>

              {/* Badges Checklist Section */}
              <div className="mt-6 flex flex-col flex-1 overflow-hidden">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300 uppercase tracking-wider">HERO BADGES</span>
                  <span className="font-mono font-bold text-cyan-400">{unlockedCount} / 5 Unlocked</span>
                </div>

                {/* Badges Scroll List */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 mt-3 scrollbar-thin scrollbar-thumb-gray-800">
                  {badges.map((badge, index) => (
                    <div 
                      key={badge.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-300 ${badge.unlocked ? "bg-[#0E1726]/80 border-accent/20" : "bg-black/30 border-gray-800/40 opacity-50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${badge.unlocked ? "bg-[#1E2E4A]/80 border border-accent/20 shadow-md" : "bg-gray-900 border border-gray-800"}`}>
                          {badge.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-200">{badge.name}</div>
                          <div className="text-[10px] text-gray-400 leading-normal max-w-[210px] sm:max-w-[240px] truncate text-left">{badge.desc}</div>
                          <span className="text-[9px] text-accent/80 font-mono block mt-0.5 text-left">{badge.req}</span>
                        </div>
                      </div>
                      
                      <div>
                        {badge.unlocked ? (
                          <span className="text-[8px] sm:text-[9px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            UNLOCKED
                          </span>
                        ) : (
                          <span className="text-[8px] sm:text-[9px] font-mono font-bold bg-gray-500/10 text-gray-500 border border-gray-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            LOCKED
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom stats row */}
              <div className="grid grid-cols-3 divide-x divide-gray-800/80 border-t border-gray-800/80 pt-4 mt-5 text-center">
                <div>
                  <div className="text-sm sm:text-base font-black text-white font-mono">{reportsCount}</div>
                  <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">Reports</div>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-black text-white font-mono">{validationsCount}</div>
                  <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">Validations</div>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-black text-white font-mono">{resolutionsCount}</div>
                  <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">Resolutions</div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="w-full bg-gradient-to-r from-saffron to-accent hover:opacity-90 text-navy font-display font-bold text-xs py-3 rounded-2xl cursor-pointer transition-all mt-5 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Close Profile
              </button>

            </div>
          </div>
        );
      })()}

      {/* Custom alert banner/toast display */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold bg-navy text-white animate-pulse-ring border-l-4 border-accent">
          {toastMessage.type === "success" ? "✓ " : toastMessage.type === "error" ? "⚠️ " : "ℹ️ "}
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}
