

import React, { useState, useEffect, useRef, useMemo, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Message, MessageAuthor, SkillAnalysis, InterviewTurn, InterviewQuestion, SkillGap, LearningResource } from './types';
import { sendMessageToAI, getInitialMessage, generateSkillAnalysis, translateText, generateInterviewQuestions, getInterviewFeedbackAndNextQuestion, generateInterviewSummary } from './services/geminiService';

// --- SETTINGS CONTEXT & PROVIDER ---
type Language = 'English' | 'Tamil';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (text: string) => Promise<string>;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string | null;
  setSelectedVoiceURI: (uri: string) => void;
  speakText: (text: string) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};

const T: React.FC<{ children: string }> = ({ children }) => {
    const { language, translate } = useSettings();
    const [translatedText, setTranslatedText] = useState(children);

    useEffect(() => {
        let isMounted = true;
        if (language === 'English' || !children) {
            setTranslatedText(children);
        } else {
            translate(children).then(text => {
                if (isMounted) setTranslatedText(text);
            });
        }
        return () => { isMounted = false; };
    }, [children, language, translate]);

    return <>{translatedText}</>;
};

const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('English');
    const translationCache = useRef<Record<string, Partial<Record<Language, string>>>>({});

    const translate = useCallback(async (text: string): Promise<string> => {
        if (language === 'English') return text;
        if (translationCache.current[text]?.[language]) {
            return translationCache.current[text][language] as string;
        }

        const translated = await translateText(text, language);

        if (!translationCache.current[text]) {
            translationCache.current[text] = {};
        }
        translationCache.current[text]![language] = translated;

        return translated;
    }, [language]);

    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
            setAvailableVoices(voices);
            if (!selectedVoiceURI && voices.length > 0) {
                const defaultVoice = voices.find(v => v.default);
                setSelectedVoiceURI(defaultVoice ? defaultVoice.voiceURI : voices[0].voiceURI);
            }
        };
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const speakText = useCallback((text: string) => {
        if ('speechSynthesis' in window && text) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            if (selectedVoiceURI) {
                const selectedVoice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }
            window.speechSynthesis.speak(utterance);
        }
    }, [availableVoices, selectedVoiceURI]);

    const value = useMemo(() => ({
        language,
        setLanguage,
        translate,
        availableVoices,
        selectedVoiceURI,
        setSelectedVoiceURI,
        speakText
    }), [language, translate, availableVoices, selectedVoiceURI, speakText, setLanguage]);


    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

// --- USER DATA CONTEXT (New) ---
interface UserDataContextType {
    skillAnalysis: SkillAnalysis | null;
    setSkillAnalysis: (analysis: SkillAnalysis) => void;
    longTermGoal: string;
    setLongTermGoal: (goal: string) => void;
    milestones: string[];
    setMilestones: (milestones: string[]) => void;
}

const UserDataContext = createContext<UserDataContextType | null>(null);

const useUserData = () => {
    const context = useContext(UserDataContext);
    if (!context) {
        throw new Error("useUserData must be used within a UserDataProvider");
    }
    return context;
}

const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [skillAnalysis, setSkillAnalysis] = useState<SkillAnalysis | null>(null);
    const [longTermGoal, setLongTermGoal] = useState<string>('');
    const [milestones, setMilestones] = useState<string[]>([]);
    
    const value = useMemo(() => ({
        skillAnalysis,
        setSkillAnalysis,
        longTermGoal,
        setLongTermGoal,
        milestones,
        setMilestones,
    }), [skillAnalysis, longTermGoal, milestones]);

    return (
        <UserDataContext.Provider value={value}>
            {children}
        </UserDataContext.Provider>
    );
};


// --- ICONS (as components) ---

const GoogleIcon: React.FC = () => (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.56,12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26,1.37-1.04,2.53-2.21,3.31v2.77h3.57c2.08-1.92,3.28-4.74,3.28-8.09Z" fill="#4285F4"></path><path d="M12,23c2.97,0,5.46-.98,7.28-2.66l-3.57-2.77c-.98.66-2.23,1.06-3.71,1.06-2.86,0-5.29-1.93-6.16-4.53H2.18v2.84C3.99,20.53,7.7,23,12,23Z" fill="#34A853"></path><path d="M5.84,14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43,8.55,1,10.22,1,12s.43,3.45,1.18,4.93l3.66-2.84Z" fill="#FBBC05"></path><path d="M12,5.38c1.62,0,3.06.56,4.21,1.64l3.15-3.15C17.45,2.09,14.97,1,12,1,7.7,1,3.99,3.47,2.18,7.07l3.66,2.84c.87-2.6,3.3-4.53,6.16-4.53Z" fill="#EA4335"></path></svg>
);

const LinkedInIcon: React.FC = () => (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21.2,0H2.8C1.2,0,0,1.2,0,2.8v18.3C0,22.8,1.2,24,2.8,24h18.3c1.6,0,2.8-1.2,2.8-2.8V2.8C24,1.2,22.8,0,21.2,0z M7.1,20.5H3.6V9h3.6V20.5z M5.3,7.4c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S6.5,7.4,5.3,7.4z M20.5,20.5h-3.6v-5.6c0-1.3,0-3-1.8-3c-1.8,0-2.1,1.4-2.1,2.9v5.7H9.4V9h3.4v1.6h0.1c0.5-0.9,1.6-1.8,3.4-1.8c3.6,0,4.3,2.4,4.3,5.5V20.5z"></path></svg>
);

// --- SHARED COMPONENTS (Updated) ---

const BottomNav: React.FC = () => {
    const location = useLocation();
    const navItems = [
        { name: 'Guide', path: '/guide', icon: 'chat_bubble' },
        { name: 'Goals', path: '/goals', icon: 'flag' },
        { name: 'Profile', path: '/profile', icon: 'person' }
    ];

    const getActiveTab = () => {
        const currentPath = location.pathname;
        if (currentPath.startsWith('/guide')) return 'guide';
        if (currentPath.startsWith('/goals')) return 'goals';
        if (currentPath.startsWith('/profile')) return 'profile';
        return 'guide';
    };
    
    const activeTab = getActiveTab();

    return (
        <footer className="sticky bottom-0 z-10 border-t border-gray-700 bg-[#111827]/90 backdrop-blur-sm">
            <nav className="flex justify-around py-2">
                {navItems.map(item => (
                    <Link key={item.name} to={item.path} className={`flex flex-col items-center gap-1 transition-colors w-20 ${activeTab === item.name.toLowerCase() ? 'text-[#13a4ec]' : 'text-gray-400 hover:text-white'}`}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <span className="text-xs font-medium"><T>{item.name}</T></span>
                    </Link>
                ))}
            </nav>
        </footer>
    );
};

const SimpleHeader: React.FC<{ title: string; onBack?: () => void; showBack?: boolean }> = ({ title, onBack, showBack = true }) => {
    const navigate = useNavigate();
    const handleBack = onBack || (() => navigate(-1));

    return (
        <header className="sticky top-0 z-10 flex items-center bg-[#111c22]/80 p-4 pb-2 justify-between backdrop-blur-sm">
            {showBack ? (
              <button onClick={handleBack} className="text-white flex size-10 shrink-0 items-center justify-center rounded-full">
                  <span className="material-symbols-outlined">arrow_back</span>
              </button>
            ) : <div className="w-10"></div>}
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center"><T>{title}</T></h2>
             <div className="w-10"></div>
        </header>
    );
};


// --- PAGE COMPONENTS (Simplified and Reorganized) ---

const SplashScreen: React.FC = () => {
    const navigate = useNavigate();
    useEffect(() => {
        const timer = setTimeout(() => navigate('/welcome'), 3000);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-[#111c22] to-[#1A2A33] dark group/design-root overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
            <div className="flex flex-col items-center justify-center flex-grow text-center px-4">
                <div className="flex items-center gap-3 mb-4 animate-scale-in-out" style={{ animation: 'scale-in-out 2s ease-in-out infinite' }}>
                    <span className="material-symbols-outlined text-5xl text-[#13a4ec]">insights</span>
                    <h1 className="text-white text-5xl font-bold tracking-tight">EvoloEdge</h1>
                </div>
                <p className="text-slate-300 text-lg font-light">Your career, evolved.</p>
            </div>
            <div className="w-full max-w-xs px-4 pb-16">
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-[#13a4ec] h-1.5 rounded-full" style={{ animation: 'progress-bar 3s ease-out forwards' }}></div>
                </div>
            </div>
        </div>
    );
};

const WelcomeScreen: React.FC = () => (
    <div className="relative flex h-screen w-full flex-col justify-between overflow-x-hidden text-white bg-[#111c22]">
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <div className="mb-4">
                <span className="material-symbols-outlined text-6xl text-[#13a4ec]">insights</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-white">EvoloEdge</h1>
            <p className="mt-2 max-w-sm text-lg text-[#a0b3c0]">Your personal AI career guide.</p>
        </div>
        <div className="px-4 pb-8 sm:px-6">
            <div className="flex flex-col gap-4">
                <Link to="/auth?mode=login" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-[#13a4ec] text-white text-lg font-bold leading-normal tracking-wide transition-colors hover:bg-opacity-90">
                    <span>Login</span>
                </Link>
                <Link to="/auth?mode=signup" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-[#1a2a33] text-white text-lg font-bold leading-normal tracking-wide transition-colors hover:bg-opacity-90">
                    <span>Sign Up</span>
                </Link>
            </div>
        </div>
    </div>
);


const AuthScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const initialMode = params.get('mode') || 'login';

    const [mode, setMode] = useState<'login' | 'signup'>(initialMode as any);

    const handleSuccess = () => {
        navigate('/onboarding');
    };

    const renderLogin = () => (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#111c22] dark justify-between group/design-root overflow-x-hidden">
            <div className="flex flex-col items-center justify-center p-6 space-y-6 flex-grow">
                <div className="text-center">
                    <span className="material-symbols-outlined text-[#13a4ec] text-6xl">insights</span>
                    <h1 className="text-white text-3xl font-bold tracking-tight mt-2">Welcome Back</h1>
                </div>
                <div className="w-full max-w-sm space-y-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#92b7c9]"> mail </span>
                        <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[#13a4ec] border-none bg-[#233c48] h-14 placeholder:text-[#92b7c9] p-4 pl-12 text-base font-normal leading-normal" placeholder="Email" />
                    </div>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#92b7c9]"> lock </span>
                        <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[#13a4ec] border-none bg-[#233c48] h-14 placeholder:text-[#92b7c9] p-4 pl-12 text-base font-normal leading-normal" placeholder="Password" type="password" />
                    </div>
                    <button onClick={handleSuccess} className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#13a4ec] text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-opacity-90 transition-colors">
                        <span className="truncate">Sign In</span>
                    </button>
                </div>
                <div className="flex items-center w-full max-w-sm space-x-2">
                    <div className="flex-grow h-px bg-[#233c48]"></div>
                    <span className="text-[#92b7c9] text-sm">OR</span>
                    <div className="flex-grow h-px bg-[#233c48]"></div>
                </div>
                <div className="w-full max-w-sm space-y-3">
                    <button className="flex w-full min-w-[84px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-lg h-12 px-5 bg-[#233c48] text-white text-base font-medium leading-normal hover:bg-opacity-80 transition-colors">
                        <LinkedInIcon />
                        <span className="truncate">Sign in with LinkedIn</span>
                    </button>
                    <button className="flex w-full min-w-[84px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-lg h-12 px-5 bg-[#233c48] text-white text-base font-medium leading-normal hover:bg-opacity-80 transition-colors">
                       <GoogleIcon />
                        <span className="truncate">Sign in with Google</span>
                    </button>
                </div>
            </div>
            <div className="p-6 pt-0 text-center">
                <p className="text-[#92b7c9] text-sm">
                    Don't have an account?
                    <button onClick={() => setMode('signup')} className="font-semibold text-white hover:text-[#13a4ec] underline ml-1">Sign Up</button>
                </p>
            </div>
        </div>
    );

    const renderSignup = () => (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#111c22] dark justify-between group/design-root overflow-x-hidden">
            <div className="p-6">
                <div className="flex items-center pb-8">
                    <button onClick={() => setMode('login')} className="text-white"><span className="material-symbols-outlined"> arrow_back </span></button>
                    <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-6">Sign Up</h2>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-white text-sm font-medium leading-normal" htmlFor="full-name">Full name</label>
                        <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[#13a4ec] border border-[#233c48] bg-[#18262e] h-12 placeholder:text-[#677e8a] p-3 text-base font-normal leading-normal" id="full-name" placeholder="Enter your full name" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-white text-sm font-medium leading-normal" htmlFor="email">Email</label>
                        <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[#13a4ec] border border-[#233c48] bg-[#18262e] h-12 placeholder:text-[#677e8a] p-3 text-base font-normal leading-normal" id="email" placeholder="Enter your email" type="email" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-white text-sm font-medium leading-normal" htmlFor="password">Password</label>
                        <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[#13a4ec] border border-[#233c48] bg-[#18262e] h-12 placeholder:text-[#677e8a] p-3 text-base font-normal leading-normal pr-10" id="password" placeholder="Enter your password" type="password" />
                    </div>
                </div>
                <div className="flex flex-col gap-4 mt-8">
                    <button onClick={handleSuccess} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 flex-1 bg-[#13a4ec] text-white text-base font-bold leading-normal tracking-[0.015em] shadow-md hover:bg-[#0f8ac9] transition-colors duration-200">
                        <span className="truncate">Sign Up</span>
                    </button>
                </div>
            </div>
            <div className="p-6 pt-0">
                <p className="text-[#92b7c9] text-sm font-normal leading-normal text-center">Already have an account? <button onClick={() => setMode('login')} className="font-bold text-[#13a4ec] hover:underline">Sign in</button></p>
            </div>
        </div>
    );
    
    return mode === 'signup' ? renderSignup() : renderLogin();
};


const OnboardingScreen: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col h-screen justify-between p-6 bg-[#111c22]">
            <header className="flex justify-end">
                <button onClick={() => navigate('/profile-setup')} className="text-sm font-bold text-[#92b7c9] tracking-wider">Skip</button>
            </header>
            <main className="flex-grow flex flex-col justify-center text-center">
                <div className="aspect-[4/3] w-full max-w-sm mx-auto mb-8">
                    <div className="w-full h-full bg-center bg-no-repeat bg-cover rounded-2xl" style={{ backgroundImage: `url("https://picsum.photos/seed/onboarding1/400/300")` }}></div>
                </div>
                <h1 className="text-3xl font-extrabold text-[#ffffff] mb-4">Chat with Your Career Guide</h1>
                <p className="text-[#92b7c9] text-lg max-w-xs mx-auto">
                   Get personalized advice by simply having a conversation with your AI guide.
                </p>
            </main>
            <footer className="w-full">
                <button onClick={() => navigate('/profile-setup')} className="w-full h-14 bg-[#13a4ec] text-white text-lg font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:bg-opacity-90 transition-all">
                    Get Started
                </button>
            </footer>
        </div>
    );
};

const ProfileSetupScreen: React.FC = () => {
    const navigate = useNavigate();
    return (
      <div className="relative flex h-screen w-full flex-col font-manrope text-[#ffffff] bg-[#111c22]">
        <SimpleHeader title="Profile Setup" />
        <main className="flex-1 px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">Tell us about your current role.</h1>
          <p className="text-[#92b7c9] text-base mt-2 mb-6">This helps your guide give you the best advice from the start.</p>
          <form className="space-y-4">
            <div>
              <input className="w-full rounded-lg border-none bg-[#233c48] h-14 p-4 text-base font-normal placeholder:text-[#92b7c9] focus:ring-2 focus:ring-[#13a4ec]" id="current-role" placeholder="Your current job title" type="text" />
            </div>
            <div>
              <textarea className="w-full min-h-[120px] rounded-lg border-none bg-[#233c48] p-4 text-base font-normal placeholder:text-[#92b7c9] focus:ring-2 focus:ring-[#13a4ec]" id="key-skills" placeholder="List a few of your key skills..."></textarea>
            </div>
          </form>
        </main>
        <footer className="p-4 sticky bottom-0 bg-[#111c22]">
          <button onClick={() => navigate('/guide')} className="w-full h-14 rounded-lg bg-[#13a4ec] text-white text-base font-bold tracking-wide">
            Finish Setup
          </button>
        </footer>
      </div>
    );
};

// NEW: Main application screen
const GuideScreen: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { speakText } = useSettings();
    const navigate = useNavigate();
    const { setSkillAnalysis } = useUserData();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage: Message = {
            author: MessageAuthor.USER,
            text: messageText,
            timestamp: "Just now",
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simple keyword detection to trigger specific tools.
        if (messageText.toLowerCase().includes('analyze my skills')) {
            // In a real app, this would be a multi-turn conversation
            // For simplicity, we'll call the service directly
            try {
                const result = await generateSkillAnalysis("Junior Frontend Developer", "Senior Full-Stack Engineer");
                const aiMessage: Message = {
                    author: MessageAuthor.AI,
                    text: `I've analyzed the skill gap for a Senior Full-Stack Engineer. I've added the details to your Goals page. What's next?`,
                    timestamp: "Just now",
                };
                 setSkillAnalysis(result);
                 setMessages(prev => [...prev, aiMessage]);
                 speakText(aiMessage.text);
            } catch(e) {
                const aiMessage: Message = { author: MessageAuthor.AI, text: (e as Error).message, timestamp: "Just now" };
                setMessages(prev => [...prev, aiMessage]);
            }
        } else if (messageText.toLowerCase().includes('practice for an interview')) {
            const aiMessage: Message = { author: MessageAuthor.AI, text: "Great! Let's start a mock interview session.", timestamp: "Just now" };
            setMessages(prev => [...prev, aiMessage]);
            speakText(aiMessage.text);
            setTimeout(() => navigate('/interview-session'), 1000);
        }
        else {
             const aiResponseText = await sendMessageToAI(messageText);
             const aiMessage: Message = { author: MessageAuthor.AI, text: aiResponseText, timestamp: "Just now" };
             setMessages(prev => [...prev, aiMessage]);
             speakText(aiResponseText);
        }
       
        setIsLoading(false);
    };

    const QuickActionButton: React.FC<{icon: string, text: string, onClick: () => void}> = ({ icon, text, onClick }) => (
        <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 bg-[#182630] p-4 rounded-xl hover:bg-[#233c48] transition-colors aspect-square text-center">
            <div className="p-3 bg-[#13a4ec]/20 rounded-full">
                <span className="material-symbols-outlined text-3xl text-[#13a4ec]">{icon}</span>
            </div>
            <p className="text-white text-sm font-bold leading-tight"><T>{text}</T></p>
        </button>
    );

    return (
        <div className="relative flex h-screen w-full flex-col bg-[#111c22]">
            <div className="flex-grow flex flex-col">
                <SimpleHeader title="Your AI Guide" showBack={false} />
                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-3 w-full ${msg.author === MessageAuthor.USER ? 'justify-end' : 'justify-start'}`}>
                            {msg.author === MessageAuthor.AI && <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 shrink-0" style={{backgroundImage: 'url("https://picsum.photos/seed/ai/40/40")'}}></div>}
                            <div className={`flex flex-col gap-1 max-w-[80%] ${msg.author === MessageAuthor.USER ? 'items-end' : 'items-start'}`}>
                                {/* FIX: Replaced double quotes with backticks to enable template literal for dynamic class names. */}
                                <p className={`text-base font-normal leading-relaxed rounded-2xl px-4 py-3 text-white ${msg.author === MessageAuthor.USER ? 'rounded-br-none bg-[#13a4ec]' : 'rounded-bl-none bg-[#233c48]'}`}>
                                    {msg.text}
                                </p>
                            </div>
                            {msg.author === MessageAuthor.USER && <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 shrink-0" style={{backgroundImage: 'url("https://picsum.photos/seed/user/40/40")'}}></div>}
                        </div>
                    ))}
                    {messages.length <= 1 && (
                         <div className="p-4 grid grid-cols-2 gap-4">
                            <QuickActionButton icon="trending_up" text="Analyze my skills" onClick={() => handleSend('Analyze my skills')} />
                            <QuickActionButton icon="question_answer" text="Practice for an interview" onClick={() => handleSend('Practice for an interview')} />
                            <QuickActionButton icon="description" text="Write a cover letter" onClick={() => handleSend('Help me write a cover letter')} />
                            <QuickActionButton icon="article" text="Improve my resume" onClick={() => handleSend('How can I improve my resume?')} />
                        </div>
                    )}
                     {isLoading && (
                        <div className="flex items-end gap-3 self-start">
                             <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 shrink-0" style={{backgroundImage: 'url("https://picsum.photos/seed/ai/40/40")'}}></div>
                             <div className="flex items-center space-x-2 bg-[#233c48] rounded-2xl rounded-bl-none px-4 py-3">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="sticky bottom-0 bg-[#111c22] p-4 border-t border-gray-800">
                <div className="flex items-center gap-2 rounded-full bg-[#233c48] px-2 py-1.5">
                    <input
                        className="form-input flex-grow bg-transparent text-white focus:outline-none focus:ring-0 border-none placeholder:text-[#92b7c9] text-base font-normal leading-normal"
                        placeholder="Ask me anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                        disabled={isLoading}
                    />
                    <button onClick={() => handleSend(input)} disabled={isLoading || !input.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#13a4ec] text-white disabled:bg-gray-500">
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// NEW: Goals dashboard screen
const GoalsScreen: React.FC = () => {
    const { skillAnalysis } = useUserData();

    const getIconForResourceType = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'course': return 'school';
            case 'book': return 'menu_book';
            case 'video': return 'play_circle';
            case 'article': return 'article';
            case 'project': return 'code';
            default: return 'lightbulb';
        }
    };
    
    return (
        <div className="relative flex h-screen w-full flex-col bg-[#111c22]">
            <div className="flex-grow overflow-y-auto">
                <SimpleHeader title="Your Goals & Plan" showBack={false}/>
                <main className="p-4 space-y-8">
                    {skillAnalysis ? (
                        <>
                           <section>
                                <h2 className="text-white text-2xl font-bold mb-4">Identified Gaps</h2>
                                <div className="space-y-3">
                                    {skillAnalysis.skillGaps.map((gap, index) => (
                                        <div key={index} className="flex items-start gap-4 bg-[#182630] p-4 rounded-lg">
                                            <div className="flex-shrink-0 bg-[#13a4ec]/20 rounded-full p-2 mt-1">
                                                <span className="material-symbols-outlined text-[#13a4ec]"> trending_up </span>
                                            </div>
                                            <div>
                                                <p className="text-white text-base font-semibold">{gap.skill}</p>
                                                <p className="text-[#92b7c9] text-sm">{gap.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            <section>
                                <h2 className="text-white text-2xl font-bold mb-4">Recommended Learning Plan</h2>
                                <div className="space-y-4">
                                    {skillAnalysis.learningPlan.map((item, index) => (
                                        <div key={index} className="bg-[#182630] rounded-lg p-4 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[#13a4ec]">{getIconForResourceType(item.type)}</span>
                                                <p className="text-[#92b7c9] text-sm font-semibold uppercase tracking-wider">{item.type}</p>
                                            </div>
                                            <p className="text-white text-lg font-bold">{item.resource}</p>
                                            <p className="text-[#92b7c9] text-sm">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    ) : (
                        <div className="text-center py-20 px-4">
                            <span className="material-symbols-outlined text-6xl text-[#13a4ec]">checklist</span>
                             <h2 className="text-white text-2xl font-bold mt-4">Your Plan Awaits</h2>
                            <p className="text-[#92b7c9] mt-2 max-w-sm mx-auto">
                                Ask your AI guide to analyze your skills or set a career goal. Your progress and learning plan will appear here.
                            </p>
                            <Link to="/guide" className="mt-6 inline-block h-12 px-8 leading-[48px] rounded-lg bg-[#13a4ec] text-white text-base font-bold tracking-wide">
                                Chat with Guide
                            </Link>
                        </div>
                    )}
                </main>
            </div>
            <BottomNav />
        </div>
    );
};

// NEW: Combined Profile and Settings screen
const ProfileSettingsScreen: React.FC = () => {
    const { language, setLanguage, availableVoices, selectedVoiceURI, setSelectedVoiceURI } = useSettings();

    return (
        <div className="relative flex h-screen flex-col bg-[#111c22]">
            <div className="flex-1 overflow-y-auto">
                <SimpleHeader title="Profile & Settings" showBack={false}/>
                <main className="flex-1 p-4 space-y-8">
                     <section className="flex flex-col items-center text-center">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-32 ring-4 ring-[#13a4ec]/50 p-1" style={{backgroundImage: 'url("https://picsum.photos/seed/ethan/128/128")'}}></div>
                        <h1 className="text-white text-2xl font-bold tracking-tight mt-4">Ethan Carter</h1>
                        <p className="text-slate-400 text-base">ethan.carter@example.com</p>
                    </section>
                     <section>
                        <h2 className="text-lg font-semibold text-white/90 mb-4"><T>Language</T></h2>
                        <div className="bg-[#1e293b] rounded-xl p-2 flex gap-2">
                            <button 
                                onClick={() => setLanguage('English')} 
                                className={`flex-1 rounded-lg h-12 text-base font-bold transition-colors ${language === 'English' ? 'bg-[#13a4ec] text-white' : 'text-white/70 hover:bg-white/10'}`}
                            >
                                English
                            </button>
                            <button 
                                onClick={() => setLanguage('Tamil')} 
                                className={`flex-1 rounded-lg h-12 text-base font-bold transition-colors ${language === 'Tamil' ? 'bg-[#13a4ec] text-white' : 'text-white/70 hover:bg-white/10'}`}
                            >
                                தமிழ்
                            </button>
                        </div>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold text-white/90 mb-4"><T>AI Voice</T></h2>
                        <div className="bg-[#1e293b] rounded-xl p-4">
                            <label htmlFor="voice-select" className="text-white/60 text-sm">Select a voice for the AI interviewer</label>
                            <select 
                                id="voice-select"
                                value={selectedVoiceURI || ''}
                                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                                disabled={availableVoices.length === 0}
                                className="mt-2 form-select w-full appearance-none rounded-lg border-none bg-[#2e3a59] h-12 p-3 text-white focus:ring-2 focus:ring-[#13a4ec] disabled:opacity-50"
                            >
                                {availableVoices.length === 0 && <option>Loading voices...</option>}
                                {availableVoices.map(voice => (
                                    <option key={voice.voiceURI} value={voice.voiceURI}>
                                        {voice.name} ({voice.lang})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>
                    <section>
                        <Link to="/welcome" className="w-full flex items-center gap-4 p-4 bg-[#1e293b] rounded-xl hover:bg-red-500/20 group">
                            <div className="flex items-center justify-center rounded-lg bg-[#2e3a59] group-hover:bg-red-500/50 shrink-0 size-12"><span className="material-symbols-outlined text-red-400 group-hover:text-red-300"> logout </span></div>
                            <p className="text-red-400 text-base font-medium flex-1 text-left group-hover:text-red-300">Log Out</p>
                        </Link>
                    </section>
                </main>
            </div>
            <BottomNav />
        </div>
    );
};

// This screen is kept for the focused interview experience
const MockInterviewSessionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { speakText } = useSettings();
    
    type InterviewState = 'STARTING' | 'AWAITING_ANSWER' | 'LISTENING' | 'PROCESSING' | 'DISPLAYING_FEEDBACK' | 'PROCESSING_SUMMARY' | 'COMPLETED';
    const [interviewState, setInterviewState] = useState<InterviewState>('STARTING'); 
    
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [stagedNextQuestion, setStagedNextQuestion] = useState<string | null>(null);
    const [userTranscript, setUserTranscript] = useState('');
    const [feedback, setFeedback] = useState('');
    const [interviewHistory, setInterviewHistory] = useState<InterviewTurn[]>([]);
    const [summary, setSummary] = useState('');

    const recognitionRef = useRef<any>(null);

    const startInterview = useCallback(async () => {
        setInterviewState('PROCESSING');
        const firstQuestion = await sendMessageToAI("Start a mock interview for a senior product manager role. Ask me the first behavioral question.");
        setCurrentQuestion(firstQuestion.replace(/\*/g, ''));
        setInterviewState('AWAITING_ANSWER');
    }, []);

    useEffect(() => {
        startInterview();
        return () => {
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
            }
             if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [startInterview]);
    
    useEffect(() => {
        if (currentQuestion && interviewState === 'AWAITING_ANSWER') {
            speakText(currentQuestion);
        }
    }, [currentQuestion, interviewState, speakText]);

    const handleEndInterview = async (isNaturalEnd: boolean = false) => {
        if (interviewHistory.length === 0 && !isNaturalEnd) {
            navigate('/guide');
            return;
        }

        setInterviewState('PROCESSING_SUMMARY');
        const finalSummary = await generateInterviewSummary(interviewHistory);
        setSummary(finalSummary.replace(/\*/g, ''));
        setInterviewState('COMPLETED');
    };


    const handleAnswerSubmission = async (transcript: string) => {
        if (!transcript.trim()) {
             setInterviewState('AWAITING_ANSWER');
             return;
        }
        setInterviewState('PROCESSING');
        const { feedback: feedbackText, nextQuestion } = await getInterviewFeedbackAndNextQuestion(currentQuestion, transcript);
        
        const cleanedFeedback = feedbackText.replace(/\*/g, '');
        const cleanedNextQuestion = nextQuestion ? nextQuestion.replace(/\*/g, '') : null;

        setFeedback(cleanedFeedback);
        setInterviewHistory(prev => [...prev, {
            question: currentQuestion,
            answer: transcript,
            feedback: cleanedFeedback,
        }]);

        setStagedNextQuestion(cleanedNextQuestion);
        setInterviewState('DISPLAYING_FEEDBACK');
    };

    const handleToggleListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Sorry, your browser doesn't support speech recognition.");
            return;
        }

        if (interviewState === 'LISTENING') {
            recognitionRef.current?.stop();
            return;
        }

        if (!recognitionRef.current) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setUserTranscript(transcript);
                handleAnswerSubmission(transcript);
            };
            recognition.onend = () => { setInterviewState(prev => prev === 'LISTENING' ? 'AWAITING_ANSWER' : prev); };
            recognition.onerror = (event: any) => { setInterviewState('AWAITING_ANSWER'); };
            recognitionRef.current = recognition;
        }
        
        setInterviewState('LISTENING');
        setUserTranscript('');
        recognitionRef.current.start();
    };

    const handleNextQuestion = () => {
        if (stagedNextQuestion) {
            setCurrentQuestion(stagedNextQuestion);
            setFeedback('');
            setUserTranscript('');
            setStagedNextQuestion(null);
            setInterviewState('AWAITING_ANSWER');
        } else {
            handleEndInterview(true);
        }
    }

    const renderMainContent = () => {
        switch (interviewState) {
            case 'STARTING':
            case 'PROCESSING':
            case 'PROCESSING_SUMMARY':
                return (
                    <div className="text-center p-8 flex flex-col items-center justify-center flex-grow">
                        <p className="text-white text-lg mb-4">
                            {interviewState === 'STARTING' && 'Preparing your interviewer...'}
                            {interviewState === 'PROCESSING' && 'Analyzing your answer...'}
                            {interviewState === 'PROCESSING_SUMMARY' && 'Generating your performance summary...'}
                        </p>
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                );
            case 'LISTENING':
            case 'AWAITING_ANSWER':
                return (
                    <div className="flex flex-col items-center justify-center flex-grow text-center p-4">
                         <button onClick={handleToggleListening} className={`relative flex items-center justify-center size-32 rounded-full transition-colors duration-300 ${interviewState === 'LISTENING' ? 'bg-red-500' : 'bg-[#13a4ec]'}`}>
                            {interviewState === 'LISTENING' && <div className="absolute inset-0 size-full rounded-full bg-red-500 animate-ping"></div>}
                            <span className="material-symbols-outlined text-white text-6xl">{interviewState === 'LISTENING' ? 'mic_off' : 'mic'}</span>
                        </button>
                        <p className="text-white/70 text-base mt-6">{interviewState === 'LISTENING' ? "Tap again to stop" : "Tap to speak"}</p>
                    </div>
                );
            case 'DISPLAYING_FEEDBACK':
                 return (
                    <div className="bg-[#182630] p-4 rounded-xl space-y-4 m-4">
                         <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#13a4ec]">insights</span>
                            <h3 className="text-white font-bold text-lg">Feedback</h3>
                        </div>
                        <div className="text-white/90 whitespace-pre-wrap max-h-60 overflow-y-auto">{feedback}</div>
                        <div className="flex gap-4 pt-2">
                            <button onClick={() => handleEndInterview()} className="flex-1 h-12 px-5 rounded-lg bg-[#233c48] text-white text-base font-bold tracking-wide">
                                End Interview
                            </button>
                            <button onClick={handleNextQuestion} className="flex-1 h-12 px-5 rounded-lg bg-[#13a4ec] text-white text-base font-bold tracking-wide">
                                Next Question
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    }

    if (interviewState === 'COMPLETED') {
         return (
            <div className="relative flex h-screen w-full flex-col bg-[#111c22]">
                <SimpleHeader title="Interview Review" onBack={() => navigate('/guide')} />
                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    <div className="bg-[#182630] p-4 rounded-xl space-y-4">
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#13a4ec]">assessment</span><h3 className="text-white font-bold text-xl">Interview Summary</h3></div>
                        <div className="text-white/90 whitespace-pre-wrap max-h-60 overflow-y-auto">{summary}</div>
                    </div>
                     <button onClick={() => navigate('/guide')} className="w-full h-12 px-5 rounded-lg bg-[#13a4ec] text-white text-base font-bold tracking-wide">
                        Back to Guide
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex h-screen w-full flex-col bg-[#111c22]">
            <SimpleHeader title="Live Mock Interview" onBack={() => navigate('/guide')} />
            <div className="flex-grow overflow-y-auto flex flex-col">
                {currentQuestion && (
                    <div className="p-4 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 shrink-0" style={{backgroundImage: 'url("https://picsum.photos/seed/ai-interviewer/40/40")'}}></div>
                            <div>
                                <p className="text-[#92b7c9] text-sm font-medium">AI Interviewer</p>
                                <div className="mt-1 bg-[#233c48] rounded-xl rounded-bl-none p-4 text-white"><p>{currentQuestion}</p></div>
                            </div>
                        </div>
                        {userTranscript && (
                            <div className="flex items-start gap-3 justify-end">
                                <div>
                                    <p className="text-[#92b7c9] text-sm font-medium text-right">You</p>
                                    <div className="mt-1 bg-[#13a4ec] rounded-xl rounded-br-none p-4 text-white"><p><em>"{userTranscript}"</em></p></div>
                                </div>
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 shrink-0" style={{backgroundImage: 'url("https://picsum.photos/seed/user/40/40")'}}></div>
                            </div>
                        )}
                    </div>
                )}
                {renderMainContent()}
            </div>
        </div>
    );
};

// --- App Shell to hold layout with bottom nav ---
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex flex-col h-screen">
        <main className="flex-grow overflow-y-auto">
            {children}
        </main>
        <BottomNav />
    </div>
);


// --- MAIN APP ROUTER (Updated) ---

const App: React.FC = () => {
    return (
        <SettingsProvider>
          <UserDataProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<SplashScreen />} />
                    <Route path="/welcome" element={<WelcomeScreen />} />
                    <Route path="/auth" element={<AuthScreen />} />
                    <Route path="/onboarding" element={<OnboardingScreen />} />
                    <Route path="/profile-setup" element={<ProfileSetupScreen />} />
                    <Route path="/interview-session" element={<MockInterviewSessionScreen />} />
                    
                    {/* Routes with Bottom Nav */}
                    <Route path="/guide" element={<AppShell><GuideScreen /></AppShell>} />
                    <Route path="/goals" element={<AppShell><GoalsScreen /></AppShell>} />
                    <Route path="/profile" element={<AppShell><ProfileSettingsScreen /></AppShell>} />

                </Routes>
            </HashRouter>
          </UserDataProvider>
        </SettingsProvider>
    );
};

export default App;