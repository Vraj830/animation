import React, { 
  useState, useEffect, useRef, useReducer, 
  Suspense, memo, Component 
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Sphere, Stars, Sparkles, PerspectiveCamera, MeshDistortMaterial 
} from '@react-three/drei';
import { 
  EffectComposer, Bloom, Vignette, ChromaticAberration, Noise 
} from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { 
  Shield, Power, Mic, Cloud, AlertTriangle, Zap, Search
} from 'lucide-react';

// ==========================================
// 1. FAULT TOLERANCE
// ==========================================

class SystemBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("KERNEL_PANIC:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#020202] flex flex-col items-center justify-center font-mono text-red-500 p-10 text-center">
          <AlertTriangle size={64} className="mb-4 animate-pulse" />
          <h1 className="text-xl tracking-widest mb-2">SYSTEM_CRITICAL_FAILURE</h1>
          <p className="text-[10px] opacity-50 mb-8 max-w-md uppercase">{this.state.error?.message || "Unknown hardware exception"}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 border border-red-500 hover:bg-red-500 hover:text-black transition-all text-xs tracking-[0.3em]">REBOOT_KERNEL</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const WebGLGuard = () => {
  const { gl } = useThree();
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    gl.domElement.addEventListener('webglcontextlost', handler);
    return () => gl.domElement.removeEventListener('webglcontextlost', handler);
  }, [gl]);
  return null;
};

// ==========================================
// 2. OS STATE ENGINE & COMMAND PARSER
// ==========================================

const INITIAL_STATE = {
  status: 'BOOT',
  msg: 'AWAITING KERNEL DIRECTIVE',
  tier: 'HIGH',
  fps: 60,
  voiceActive: false,
  metrics: { ram: "N/A", battery: "N/A" },
  reducedMotion: typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
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

// ASYNC COMMAND LOGIC
const fetchWeather = (dispatch) => {
  dispatch({ type: 'SET_MSG', payload: 'ACQUIRING SATELLITE UPLINK...' });
  
  if (!navigator.geolocation) {
     dispatch({ type: 'SET_MSG', payload: 'ERR: GEOLOCATION HARDWARE OFFLINE' });
     return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      dispatch({ type: 'SET_MSG', payload: `LAT: ${latitude.toFixed(2)} | LON: ${longitude.toFixed(2)} - FETCHING DATA...` });
      
      // Real-world: fetch(`https://api.openweathermap.org/data/2.5/weather?...`)
      setTimeout(() => {
        dispatch({ type: 'SET_MSG', payload: `LOCAL NODE: 24°C | CLEAR SKIES | ATMOSPHERE STABLE` });
      }, 1500);
    },
    () => dispatch({ type: 'SET_MSG', payload: 'ERR: GPS TRIANGULATION FAILED' })
  );
};

const parseCommand = (text) => {
  const commands = [
    { regex: /scan|analyze/i, action: (dispatch) => dispatch({ type: 'SET_MSG', payload: 'SCANNING NETWORK TOPOLOGY... SECURE.' }) },
    { regex: /shield|defense/i, action: (dispatch) => dispatch({ type: 'SET_MSG', payload: 'ENCRYPTING NEURAL PATHWAYS...' }) },
    { regex: /weather|temperature/i, action: fetchWeather },
    { regex: /terminate|shutdown/i, action: (dispatch) => dispatch({ type: 'SET_STATUS', payload: 'TERMINATED' }) }
  ];
  return commands.find(c => c.regex.test(text));
};

// ==========================================
// 3. ISOLATED SYSTEM HOOKS
// ==========================================

const useHardwareGovernor = (dispatch, currentTier) => {
  const tierRef = useRef(currentTier);
  tierRef.current = currentTier; // Keep closure fresh for hysteresis logic

  useEffect(() => {
    let frames = 0, lastTime = performance.now(), id;
    
    const fpsLoop = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        dispatch({ type: 'SET_FPS', payload: frames });
        
        // Hysteresis Implementation (Prevents High/Low Oscillation)
        if (frames < 35 && tierRef.current === 'HIGH') {
          dispatch({ type: 'SET_TIER', payload: 'LOW' });
        } else if (frames > 55 && tierRef.current === 'LOW') {
          dispatch({ type: 'SET_TIER', payload: 'HIGH' });
        }
        
        frames = 0;
        lastTime = now;
      }
      id = requestAnimationFrame(fpsLoop);
    };

    id = requestAnimationFrame(fpsLoop);
    return () => cancelAnimationFrame(id);
  }, [dispatch]);

  useEffect(() => {
    const poll = async () => {
      const mem = performance?.memory 
        ? (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(1) 
        : "N/A";
      
      let bat = "N/A";
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        bat = Math.round(b.level * 100);
      }
      
      dispatch({ type: 'SET_METRICS', payload: { ram: mem, battery: bat } });
    };

    poll();
    const intervalId = setInterval(poll, 3000);
    return () => clearInterval(intervalId);
  }, [dispatch]);
};

const useVoiceEngine = (dispatch, voiceActive) => {
  const recognition = useRef(null);
  const voiceState = useRef(voiceActive);
  const isRunning = useRef(false);
  
  voiceState.current = voiceActive; 

  useEffect(() => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return;

    if (!recognition.current) {
      const rec = new Speech();
      rec.continuous = true;
      
      rec.onstart = () => { isRunning.current = true; };
      
      rec.onresult = (e) => {
        const cmdText = e.results[e.results.length - 1][0].transcript;
        const matchedCommand = parseCommand(cmdText);
        
        if (matchedCommand) {
          matchedCommand.action(dispatch);
        } else {
          dispatch({ type: 'SET_MSG', payload: `>> UNKNOWN: ${cmdText.toUpperCase().slice(0, 20)}` });
        }
      };
      
      rec.onerror = () => {
        dispatch({ type: 'TOGGLE_VOICE', payload: false });
        isRunning.current = false;
      };
      
      // Self-healing lifecycle
      rec.onend = () => {
        isRunning.current = false;
        if (voiceState.current) {
          try { rec.start(); } catch (err) {}
        }
      };

      recognition.current = rec;
    }

    const rec = recognition.current;

    // Strict Memory/State Match Check
    if (voiceActive && !isRunning.current) {
      try { rec.start(); } catch (err) {}
    } else if (!voiceActive && isRunning.current) {
      rec.stop();
    }

    return () => {
      if (rec) {
        rec.onend = null; 
        rec.stop();
        isRunning.current = false;
      }
    };
  }, [dispatch, voiceActive]);
};

// ==========================================
// 4. CORE 3D COMPONENT (ZENITH SPHERE)
// ==========================================

const OmegaCore = memo(({ tier, voiceActive, reducedMotion }) => {
  const meshRef = useRef(null);
  const ringRef = useRef(null);
  const { viewport } = useThree();

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    
    if (meshRef.current) {
      meshRef.current.position.x = THREE.MathUtils.damp(meshRef.current.position.x, (state.mouse.x * viewport.width) / 4, 3, delta);
      meshRef.current.position.y = THREE.MathUtils.damp(meshRef.current.position.y, (state.mouse.y * viewport.height) / 4, 3, delta);
      
      if (!reducedMotion) meshRef.current.rotation.y += delta * 0.2;

      const pulse = voiceActive ? 1.15 + Math.sin(t * 10) * 0.05 : 1;
      meshRef.current.scale.setScalar(THREE.MathUtils.damp(meshRef.current.scale.x, pulse, 5, delta));
    }

    if (ringRef.current && !reducedMotion) {
      ringRef.current.rotation.z -= delta * 0.5;
      ringRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <Sphere args={[1.2, tier === 'LOW' ? 32 : 64, tier === 'LOW' ? 32 : 64]}>
          <MeshDistortMaterial 
            color="#00ffff" 
            speed={reducedMotion ? 0 : 2} 
            distort={reducedMotion ? 0 : 0.3} 
            roughness={0}
            metalness={1}
          />
        </Sphere>
        <group ref={ringRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.8, 0.015, 16, 100]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={5} />
          </mesh>
        </group>
      </mesh>
      
      {!reducedMotion && (
        <Sparkles count={tier === 'LOW' ? 40 : 180} scale={6} size={2} speed={0.3} color="#00ffff" />
      )}
    </group>
  );
});

// ==========================================
// 5. CINEMATIC UI COMPONENTS
// ==========================================

const HUD = memo(({ state, dispatch }) => (
  <div className="absolute inset-0 p-8 pointer-events-none z-20 font-mono text-cyan-400">
    <div className="flex justify-between items-start">
      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-black/40 backdrop-blur-xl border border-cyan-900/50 p-6 rounded-2xl w-64 shadow-2xl">
        <h3 className="text-[9px] tracking-[0.3em] text-cyan-700 mb-4 uppercase">System Telemetry</h3>
        <div className="space-y-3 text-[11px]">
          <div className="flex justify-between"><span>CORE_FPS</span><span className={state.fps < 45 ? "text-red-500" : "text-cyan-400"}>{state.fps}</span></div>
          <div className="flex justify-between"><span>JS_HEAP</span><span>{state.metrics.ram}{state.metrics.ram !== "N/A" && "%"}</span></div>
          <div className="flex justify-between"><span>PWR_RESERVE</span><span className={state.metrics.battery < 20 ? "text-red-500" : "text-cyan-400"}>{state.metrics.battery}{state.metrics.battery !== "N/A" && "%"}</span></div>
          <div className="flex justify-between border-t border-cyan-900/30 pt-2 mt-2"><span>MODE</span><span className="text-[9px] font-bold">{state.tier}</span></div>
        </div>
      </motion.div>

      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-right">
        <h1 className="text-2xl font-black tracking-tighter text-white drop-shadow-2xl">VRAJ.OS <span className="text-cyan-500">OMEGA</span></h1>
        <p className="text-[9px] tracking-[0.5em] text-cyan-700 uppercase mt-1">Zenith Core v1.0.6</p>
      </motion.div>
    </div>

    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl flex flex-col items-center gap-6">
      <div className="bg-cyan-950/20 border border-cyan-500/20 px-10 py-4 rounded-full backdrop-blur-md shadow-2xl">
        <p className="text-xs tracking-widest text-center whitespace-nowrap overflow-hidden border-r-2 border-cyan-500 pr-1 animate-[typing_3s_steps(30)]">
          {state.msg}
        </p>
      </div>

      <div className="flex gap-4 pointer-events-auto">
        <DockBtn icon={Search} label="SCAN" onClick={() => parseCommand('scan').action(dispatch)} />
        <DockBtn icon={Shield} label="SHIELD" onClick={() => parseCommand('shield').action(dispatch)} />
        <DockBtn icon={Cloud} label="WTHR" onClick={() => parseCommand('weather').action(dispatch)} />
        <DockBtn icon={Mic} label="VOICE" active={state.voiceActive} onClick={() => dispatch({ type: 'TOGGLE_VOICE', payload: !state.voiceActive })} />
        <DockBtn icon={Power} label="KILL" onClick={() => parseCommand('terminate').action(dispatch)} danger />
      </div>
    </div>
  </div>
));

const DockBtn = ({ icon: Icon, label, onClick, active, danger }) => (
  <button onClick={onClick} className="group flex flex-col items-center gap-2">
    <div className={`p-4 rounded-2xl border transition-all duration-300 ${active ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_25px_#00ffff]' : 'bg-black/50 border-cyan-900/50 text-cyan-500 hover:border-cyan-400 hover:scale-110'} ${danger ? 'hover:border-red-500 hover:text-red-500' : ''}`}>
      <Icon size={20} />
    </div>
    <span className="text-[8px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity uppercase">{label}</span>
  </button>
);

const BootSequence = ({ onComplete }) => {
  const [idx, setIdx] = useState(0);
  const steps = ["UEFI_BIOS_INIT", "OMEGA_KERNEL_MOUNT", "NEURAL_MESH_SYNAPSE", "ACCESS_GRANTED"];

  useEffect(() => {
    if (idx < steps.length) {
      const t = setTimeout(() => setIdx(i => i + 1), idx === 2 ? 1500 : 700);
      return () => clearTimeout(t);
    }
    const fin = setTimeout(onComplete, 800);
    return () => clearTimeout(fin);
  }, [idx, onComplete, steps.length]);

  return (
    <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-[#010101] flex flex-col items-center justify-center font-mono">
      <div className="w-72 space-y-3">
        <div className="text-[10px] text-cyan-800 tracking-widest uppercase mb-8">System Initializing...</div>
        {steps.slice(0, idx + 1).map((s, i) => (
          <div key={i} className="text-[11px] text-cyan-500">
            &gt; {s} ... <span className={i < idx ? "text-green-500" : "animate-pulse"}>{i < idx ? "[OK]" : "RUNNING"}</span>
          </div>
        ))}
        <div className="h-[2px] bg-cyan-950 w-full mt-6 overflow-hidden">
          <motion.div className="h-full bg-cyan-400" initial={{ width: 0 }} animate={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// 6. MAIN EXPORT
// ==========================================

export default function VrajOSOmega() {
  const [state, dispatch] = useReducer(osReducer, INITIAL_STATE);
  const [isActive, setIsActive] = useState(true);

  useHardwareGovernor(dispatch, state.tier);
  useVoiceEngine(dispatch, state.voiceActive);

  useEffect(() => {
    const handleVis = () => setIsActive(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  if (state.status === 'TERMINATED') {
    return <div className="h-screen bg-black text-red-500 font-mono flex flex-col items-center justify-center tracking-[1em] uppercase"><Zap size={48} className="mb-4" /> Kernel_Offline</div>;
  }

  return (
    <SystemBoundary>
      <div className="h-screen w-screen bg-[#010204] overflow-hidden selection:bg-cyan-500/30 cursor-crosshair">
        
        <AnimatePresence>
          {state.status === 'BOOT' && <BootSequence onComplete={() => dispatch({ type: 'SET_STATUS', payload: 'ACTIVE' })} />}
        </AnimatePresence>

        {state.status === 'ACTIVE' && (
          <>
            <div className="absolute inset-0 z-0">
              <Canvas 
                dpr={state.tier === 'LOW' ? [1, 1] : [1, 1.5]}
                frameloop={isActive ? "always" : "demand"}
                gl={{ powerPreference: 'high-performance', antialias: false, alpha: false, stencil: false }}
              >
                <WebGLGuard />
                <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                <color attach="background" args={['#010204']} />
                
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#00ffff" />
                
                <Stars radius={100} depth={50} count={state.tier === 'LOW' ? 1000 : 5000} factor={4} saturation={0} fade speed={1} />
                
                <Suspense fallback={null}>
                  <OmegaCore 
                    tier={state.tier} 
                    voiceActive={state.voiceActive} 
                    reducedMotion={state.reducedMotion} 
                  />
                </Suspense>

                <EffectComposer multisampling={0}>
                  <Bloom luminanceThreshold={0.2} intensity={state.tier === 'LOW' ? 0.6 : 1.5} />
                  {!state.reducedMotion && state.tier === 'HIGH' && (
                    <ChromaticAberration offset={[0.001, 0.001]} />
                  )}
                  <Noise opacity={0.03} />
                  <Vignette darkness={0.8} />
                </EffectComposer>
              </Canvas>
            </div>

            <HUD state={state} dispatch={dispatch} />
            
            <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%] opacity-30" />
          </>
        )}
      </div>
    </SystemBoundary>
  );
}