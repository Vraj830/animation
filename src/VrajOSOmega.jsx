import React, { useState, useEffect, useRef, useReducer, memo, Suspense, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Power, Mic, Cloud, AlertTriangle, Zap, Target, UserCheck, RefreshCw, Cpu, Camera } from 'lucide-react';

// ==========================================
// 1. FAULT TOLERANCE
// ==========================================
class SystemBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center font-mono text-red-500 p-10 text-center">
        <AlertTriangle size={64} className="mb-4 animate-pulse" />
        <h1 className="text-xl tracking-widest">KERNEL_FATAL_ERROR</h1>
        <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2 border border-red-500 hover:bg-red-500 hover:text-black">REBOOT</button>
      </div>
    );
    return this.props.children;
  }
}

// ==========================================
// 2. OS STATE ENGINE
// ==========================================
const INITIAL_STATE = {
  status: 'BOOT', // BOOT, AUTH, ACTIVE, TERMINATED
  msg: 'AWAITING DIRECTIVE',
  tier: 'HIGH',
  fps: 60,
  voiceActive: false,
  metrics: { ram: "N/A", battery: "N/A" }
};

function osReducer(state, action) {
  switch (action.type) {
    case 'SET_STATUS': return { ...state, status: action.payload };
    case 'SET_TIER': return { ...state, tier: action.payload };
    case 'SET_FPS': return { ...state, fps: action.payload };
    case 'SET_MSG': return { ...state, msg: action.payload };
    case 'SET_METRICS': return { ...state, metrics: { ...state.metrics, ...action.payload } };
    case 'TOGGLE_VOICE': return { ...state, voiceActive: action.payload };
    default: return state;
  }
}

// ==========================================
// 3. FULL-SCREEN VECTOR RAIN (Optimized)
// ==========================================
const VectorRain = memo(({ tier }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const characters = "0123456789ABCDEFHIJKLMNOPQRSTUVWXYZ$#@&";
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(1, 2, 4, 0.1)"; // Trails
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#00ffff33"; // Cyan rain with low opacity
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = setInterval(draw, tier === 'HIGH' ? 33 : 50);
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); };
  }, [tier]);

  return <canvas ref={canvasRef} className="absolute inset-0 opacity-40 pointer-events-none z-0" />;
});

// ==========================================
// 4. HOLOGRAPHIC FACE SCAN (Standard Time)
// ==========================================
const FaceAuth = ({ onComplete }) => {
  const [phase, setPhase] = useState('INIT'); // INIT, SCAN, VERIFY, DONE
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const audioTriggered = useRef(false);

  useEffect(() => {
    const playGreeting = () => {
      if (audioTriggered.current) return;
      audioTriggered.current = true;
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance("Starting the engine for Vinit.");
      utter.pitch = 0.8; utter.rate = 0.9;
      synth.speak(utter);
    };

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPhase('SCAN');
      } catch (e) {
        setPhase('SCAN'); // Fallback to fake scan UI if camera blocked
      }
    };

    initCamera();

    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setPhase('VERIFY');
          setTimeout(() => {
             playGreeting();
             setPhase('DONE');
             setTimeout(onComplete, 1500);
          }, 1500);
          return 100;
        }
        return p + 1.5; // Controls the standard ~6 second scan time
      });
    }, 100);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-[#010204] flex flex-col items-center justify-center font-mono">
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Holographic Frame */}
        <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-2xl animate-pulse" />
        <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-cyan-500" />
        <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-cyan-500" />

        {/* Video Viewport */}
        <div className="w-full h-full bg-cyan-950/20 overflow-hidden rounded-xl border border-cyan-500/30 relative">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-125 sepia-1 hue-rotate-[180deg] opacity-60" />
          
          {/* Scanning Line */}
          {phase === 'SCAN' && (
            <motion.div 
              animate={{ top: ['0%', '100%', '0%'] }} 
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_#00ffff] z-10" 
            />
          )}

          {/* Verification Overlay */}
          <AnimatePresence>
            {phase === 'VERIFY' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center z-20">
                <UserCheck size={80} className="text-green-400 drop-shadow-[0_0_20px_#4ade80]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Corner Telemetry */}
        <div className="absolute -top-12 left-0 text-[10px] text-cyan-600 tracking-widest uppercase">
          Neural_Link: {progress.toFixed(1)}%
        </div>
      </div>

      <div className="mt-16 text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-[0.5em] text-white uppercase drop-shadow-[0_0_10px_white]">
          {phase === 'DONE' ? 'Identity Confirmed' : 'Scanning Bio-Mesh'}
        </h2>
        <p className="text-xs text-cyan-700 tracking-widest uppercase">Subject_ID: Vinit Raj</p>
      </div>
    </motion.div>
  );
};

// ==========================================
// 5. ADVANCED 2D VECTOR CORE
// ==========================================
const JarvisCore = memo(({ voiceActive }) => (
  <div className="relative flex items-center justify-center w-64 h-64">
    {/* Concentric Rotating SVG Rings */}
    <motion.svg 
      viewBox="0 0 100 100" 
      className="absolute w-full h-full text-cyan-500/20"
      animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="10 5" />
    </motion.svg>

    <motion.svg 
      viewBox="0 0 100 100" 
      className="absolute w-[80%] h-[80%] text-cyan-500"
      animate={{ rotate: -360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="40 10" />
    </motion.svg>

    {/* The Pulsing Energy Core */}
    <motion.div 
      animate={{ 
        scale: voiceActive ? [1, 1.2, 1] : [1, 1.05, 1],
        opacity: voiceActive ? [0.8, 1, 0.8] : 0.6
      }}
      transition={{ duration: voiceActive ? 0.2 : 2, repeat: Infinity }}
      className="w-16 h-16 rounded-full bg-cyan-400 shadow-[0_0_40px_#00ffff] z-10"
    />

    {/* Hexagon Detail */}
    <div className="absolute w-32 h-32 border border-cyan-500/30 rotate-45 animate-pulse" />
  </div>
));

// ==========================================
// 6. HUD DASHBOARD
// ==========================================
const HUD = memo(({ state, dispatch }) => (
  <div className="absolute inset-0 p-10 pointer-events-none z-20 font-mono text-cyan-400">
    
    {/* TOP LEFT: BRANDING */}
    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="absolute top-10 left-10">
      <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">
        VINIT.<span className="text-cyan-500">OS</span>
      </h1>
      <div className="text-[10px] tracking-[0.5em] text-cyan-800 mt-2 uppercase font-bold">Zenith Engine v6.1</div>
    </motion.div>

    {/* TOP RIGHT: TELEMETRY */}
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="absolute top-10 right-10 bg-black/50 backdrop-blur-md border border-cyan-900/50 p-6 rounded-2xl w-64 shadow-2xl">
      <h3 className="text-[9px] tracking-[0.4em] text-cyan-800 mb-4 uppercase">Neural Telemetry</h3>
      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between"><span>CORE_FPS</span><span className="text-white">{state.fps}</span></div>
        <div className="flex justify-between"><span>JS_HEAP</span><span className="text-white">{state.metrics.ram}%</span></div>
        <div className="flex justify-between"><span>ENERGY</span><span className="text-white">{state.metrics.battery}%</span></div>
      </div>
    </motion.div>

    {/* BOTTOM: INTERACTION DOCK */}
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-xl flex flex-col items-center gap-6">
      <div className="bg-cyan-950/20 border border-cyan-500/20 px-10 py-3 rounded-full backdrop-blur-lg">
        <p className="text-xs tracking-widest text-center animate-pulse">
          &gt; {state.msg}
        </p>
      </div>

      <div className="flex gap-4 pointer-events-auto">
        <DockBtn icon={Target} label="SCAN" onClick={() => dispatch({ type: 'SET_MSG', payload: 'SCANNING ENVIRONMENT...' })} />
        <DockBtn icon={Shield} label="ARMOR" onClick={() => dispatch({ type: 'SET_MSG', payload: 'SHIELDS AT 100%.' })} />
        <DockBtn icon={Mic} label="VOICE" active={state.voiceActive} onClick={() => dispatch({ type: 'TOGGLE_VOICE', payload: !state.voiceActive })} />
        <DockBtn icon={Power} label="KILL" onClick={() => dispatch({ type: 'SET_STATUS', payload: 'TERMINATED' })} danger />
      </div>
    </div>
  </div>
));

const DockBtn = ({ icon: Icon, label, onClick, active, danger }) => (
  <button onClick={onClick} className="group flex flex-col items-center gap-2">
    <div className={`p-4 rounded-2xl border transition-all duration-300 ${active ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_20px_cyan]' : 'bg-black/50 border-cyan-900/40 text-cyan-500 hover:border-cyan-400 hover:-translate-y-2'} ${danger ? 'hover:border-red-500 hover:text-red-500' : ''}`}>
      <Icon size={20} />
    </div>
    <span className="text-[8px] tracking-widest opacity-0 group-hover:opacity-100 uppercase">{label}</span>
  </button>
);

// ==========================================
// 7. MAIN EXPORT
// ==========================================
export default function VinitOS() {
  const [state, dispatch] = useReducer(osReducer, INITIAL_STATE);

  // Performance loops
  useEffect(() => {
    let frames = 0, lastTime = performance.now(), id;
    const loop = () => {
      frames++; const now = performance.now();
      if (now - lastTime >= 1000) {
        dispatch({ type: 'SET_FPS', payload: frames });
        frames = 0; lastTime = now;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    
    const poll = async () => {
      const mem = performance?.memory ? (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(1) : "N/A";
      let bat = "100";
      if (navigator.getBattery) { const b = await navigator.getBattery(); bat = Math.round(b.level * 100); }
      dispatch({ type: 'SET_METRICS', payload: { ram: mem, battery: bat } });
    };
    const interval = setInterval(poll, 3000);
    
    return () => { cancelAnimationFrame(id); clearInterval(interval); };
  }, []);

  if (state.status === 'TERMINATED') return <div className="h-screen bg-black text-red-500 font-mono flex items-center justify-center tracking-[1em] uppercase">Offline</div>;

  return (
    <SystemBoundary>
      <div className="h-screen w-screen bg-[#010204] overflow-hidden selection:bg-cyan-500/30 flex items-center justify-center">
        <VectorRain tier={state.tier} />
        
        <AnimatePresence mode="wait">
          {state.status === 'BOOT' && <FaceAuth onComplete={() => dispatch({ type: 'SET_STATUS', payload: 'ACTIVE' })} />}
        </AnimatePresence>

        {state.status === 'ACTIVE' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center">
            <JarvisCore voiceActive={state.voiceActive} />
            <HUD state={state} dispatch={dispatch} />
            
            {/* Scanline Filter */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%] opacity-30" />
          </motion.div>
        )}
      </div>
    </SystemBoundary>
  );
}