import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Menu, Phone, Mail, MapPin, Instagram, Facebook, Youtube, MessageCircle, ArrowRight, Check, Star, X } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// --- Constants ---
const ROOM_NAMES = ["The Grand Foyer", "The Living Room", "The Master Suite", "The Modular Kitchen", "The Private Study"];

const CAMERA_PATH = [
  { pos: { x: 0, y: 1.6, z: 12 }, look: { x: 0, y: 1.6, z: 0 }, scroll: 0 },    // Start outside
  { pos: { x: 0, y: 1.6, z: 6 }, look: { x: 0, y: 1.6, z: 0 }, scroll: 0.15 },   // Foyer
  { pos: { x: 0, y: 1.6, z: 0 }, look: { x: -4, y: 1.6, z: -2 }, scroll: 0.25 }, // Turn to Living
  { pos: { x: -4, y: 1.6, z: -2 }, look: { x: -8, y: 1.6, z: -2 }, scroll: 0.35 }, // Living Room
  { pos: { x: -8, y: 1.6, z: -2 }, look: { x: -8, y: 1.6, z: -8 }, scroll: 0.45 }, // Turn to Bedroom
  { pos: { x: -8, y: 1.6, z: -8 }, look: { x: -4, y: 1.6, z: -10 }, scroll: 0.55 }, // Bedroom
  { pos: { x: -4, y: 1.6, z: -10 }, look: { x: -4, y: 1.6, z: -14 }, scroll: 0.65 }, // Turn to Kitchen
  { pos: { x: -4, y: 1.6, z: -14 }, look: { x: -4, y: 1.6, z: -18 }, scroll: 0.75 }, // Kitchen
  { pos: { x: -4, y: 1.6, z: -18 }, look: { x: -4, y: 1.6, z: -22 }, scroll: 0.85 }, // Turn to Study
  { pos: { x: -4, y: 1.6, z: -22 }, look: { x: 0, y: 1.6, z: -22 }, scroll: 1.0 }   // Study
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoom, setCurrentRoom] = useState(ROOM_NAMES[0]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Custom Cursor Logic ---
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const moveCursor = (e: MouseEvent) => {
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1, ease: 'power2.out' });
    };

    const hoverStart = () => cursor.classList.add('hovered');
    const hoverEnd = () => cursor.classList.remove('hovered');

    window.addEventListener('mousemove', moveCursor);
    
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, select, .interactive');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', hoverStart);
      el.addEventListener('mouseleave', hoverEnd);
    });

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', hoverStart);
        el.removeEventListener('mouseleave', hoverEnd);
      });
    };
  }, [loading]); // Re-run after loading when DOM is ready

  // --- Three.js & GSAP Logic ---
  useEffect(() => {
    if (!canvasRef.current || !scrollContainerRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf9f9f9);
    scene.fog = new THREE.Fog(0xf9f9f9, 5, 30);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true, 
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // 2. Room Builders
    const createRoom = (x: number, z: number, width: number, depth: number, height: number, wallColor: number, floorColor: number) => {
      const group = new THREE.Group();

      // Floor
      const floorGeo = new THREE.PlaneGeometry(width, depth);
      const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.3, metalness: 0.1 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      group.add(floor);

      // Ceiling
      const ceilingGeo = new THREE.PlaneGeometry(width, depth);
      const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
      const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = height;
      group.add(ceiling);

      // Walls Helper
      const createWall = (w: number, h: number, px: number, py: number, pz: number, ry: number) => {
        const wallGeo = new THREE.PlaneGeometry(w, h);
        const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.5 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(px, py, pz);
        wall.rotation.y = ry;
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
      };

      // Back Wall
      createWall(width, height, 0, height/2, -depth/2, 0);
      // Left Wall
      createWall(depth, height, -width/2, height/2, 0, Math.PI/2);
      // Right Wall
      createWall(depth, height, width/2, height/2, 0, -Math.PI/2);
      
      // Baseboards (Gold)
      const baseboardMat = new THREE.MeshStandardMaterial({ color: 0xc9a96e, metalness: 0.8, roughness: 0.2 });
      const baseboardGeo = new THREE.BoxGeometry(width, 0.1, 0.05);
      const bbBack = new THREE.Mesh(baseboardGeo, baseboardMat);
      bbBack.position.set(0, 0.05, -depth/2 + 0.025);
      group.add(bbBack);

      group.position.set(x, 0, z);
      return group;
    };

    // Furniture Helpers
    const createBox = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const createLamp = (x: number, y: number, z: number) => {
      const group = new THREE.Group();
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.1, 1.5, 16),
        new THREE.MeshStandardMaterial({ color: 0xc9a96e, metalness: 0.8, roughness: 0.2 })
      );
      stand.position.y = 0.75;
      group.add(stand);
      
      const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.4, 32, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      shade.position.y = 1.6;
      group.add(shade);

      const light = new THREE.PointLight(0xffaa00, 0.8, 5);
      light.position.set(0, 1.5, 0);
      group.add(light);
      
      group.position.set(x, y, z);
      return group;
    };

    // 3. Build Apartment
    // Room 1: Foyer
    const foyer = createRoom(0, 6, 4, 12, 3.5, 0xf5f5f5, 0xe0e0e0);
    // Console table
    foyer.add(createBox(1.5, 0.8, 0.4, 0x8d6e63, 1, 0.4, -2));
    // Mirror
    const mirror = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 })
    );
    mirror.position.set(1, 2, -1.75);
    foyer.add(mirror);
    // Pendant Light
    const foyerLight = new THREE.PointLight(0xffaa00, 0.8, 10);
    foyerLight.position.set(0, 3, 0);
    foyer.add(foyerLight);
    scene.add(foyer);

    // Room 2: Living Room
    const livingRoom = createRoom(-4, -2, 8, 8, 3.5, 0xffffff, 0xd9d9d9); // White walls
    // Sofa
    livingRoom.add(createBox(3, 0.6, 1, 0xaaddcc, -1, 0.3, -2)); // Mint Sofa
    livingRoom.add(createBox(1, 0.6, 2, 0xaaddcc, 1, 0.3, -1.5)); // L-section
    // Coffee Table
    livingRoom.add(createBox(1.2, 0.4, 0.8, 0xf5f5f5, -0.5, 0.2, -0.5));
    // TV Unit
    livingRoom.add(createBox(3, 2, 0.1, 0xeeeeee, -1, 1.5, 3.9));
    // Lamp
    livingRoom.add(createLamp(-3, 0, -3));
    scene.add(livingRoom);

    // Room 3: Bedroom
    const bedroom = createRoom(-8, -8, 7, 7, 3.2, 0xf0f8ff, 0xd2b48c); // AliceBlue/Tan
    // Bed
    bedroom.add(createBox(2, 0.5, 2.5, 0xffffff, 0, 0.25, 0)); // Mattress
    bedroom.add(createBox(2.2, 1, 0.2, 0x8b4513, 0, 0.5, -1.3)); // Headboard
    // Side tables
    bedroom.add(createBox(0.5, 0.5, 0.5, 0xffffff, -1.5, 0.25, -1));
    bedroom.add(createBox(0.5, 0.5, 0.5, 0xffffff, 1.5, 0.25, -1));
    // Lamps
    const bedLight1 = new THREE.PointLight(0xffaa55, 0.8, 8);
    bedLight1.position.set(-1.5, 1, -1);
    bedroom.add(bedLight1);
    scene.add(bedroom);

    // Room 4: Kitchen
    const kitchen = createRoom(-4, -14, 8, 8, 3.5, 0xffffff, 0xcccccc); // White/Bright
    // Island
    kitchen.add(createBox(2.5, 0.9, 1.2, 0xffffff, 0, 0.45, 0));
    // Counters
    kitchen.add(createBox(8, 0.9, 0.8, 0xe0e0e0, 0, 0.45, -3.6));
    // Cabinets
    kitchen.add(createBox(8, 0.8, 0.4, 0xffffff, 0, 2.5, -3.6));
    // Kitchen Light
    const kitchenLight = new THREE.PointLight(0xffffff, 1.0, 12);
    kitchenLight.position.set(0, 3, 0);
    kitchen.add(kitchenLight);
    scene.add(kitchen);

    // Room 5: Study
    const study = createRoom(-4, -22, 6, 6, 3.2, 0xf5f5dc, 0xc0c0c0); // Beige/Silver
    // Desk
    study.add(createBox(2, 0.05, 0.8, 0xcd853f, 0, 0.75, -1));
    // Legs
    study.add(createBox(0.05, 0.75, 0.05, 0x333333, -0.9, 0.375, -1));
    study.add(createBox(0.05, 0.75, 0.05, 0x333333, 0.9, 0.375, -1));
    // Bookshelf
    study.add(createBox(3, 2.5, 0.4, 0xffffff, -2.5, 1.25, 0));
    // Lamp
    study.add(createLamp(0.8, 0.75, -1));
    scene.add(study);

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // 4. Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 5. ScrollTrigger
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onUpdate: (self) => {
          setScrollProgress(self.progress);
          
          // Update Room Name based on progress
          if (self.progress < 0.2) setCurrentRoom(ROOM_NAMES[0]);
          else if (self.progress < 0.4) setCurrentRoom(ROOM_NAMES[1]);
          else if (self.progress < 0.6) setCurrentRoom(ROOM_NAMES[2]);
          else if (self.progress < 0.8) setCurrentRoom(ROOM_NAMES[3]);
          else setCurrentRoom(ROOM_NAMES[4]);
        }
      }
    });

    // Map camera path to timeline
    // We need to interpolate between points
    CAMERA_PATH.forEach((point, i) => {
      if (i === 0) {
        camera.position.set(point.pos.x, point.pos.y, point.pos.z);
        camera.lookAt(point.look.x, point.look.y, point.look.z);
        return;
      }

      const prev = CAMERA_PATH[i - 1];
      const duration = point.scroll - prev.scroll;

      // Position Tween
      tl.to(camera.position, {
        x: point.pos.x,
        y: point.pos.y,
        z: point.pos.z,
        duration: duration,
        ease: 'none' // Linear interpolation between keyframes, easing handled by path density or scrub
      }, prev.scroll);

      // LookAt Tween (using a dummy object to interpolate look target)
      const lookObj = { x: prev.look.x, y: prev.look.y, z: prev.look.z };
      tl.to(lookObj, {
        x: point.look.x,
        y: point.look.y,
        z: point.look.z,
        duration: duration,
        ease: 'none',
        onUpdate: () => {
          camera.lookAt(lookObj.x, lookObj.y, lookObj.z);
        }
      }, prev.scroll);
    });

    // Normalize timeline duration to 1 (0 to 1 scroll progress)
    // Actually ScrollTrigger scrub maps the whole timeline to the scroll distance automatically

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Loading Simulation
    setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      ScrollTrigger.getAll().forEach(t => t.kill());
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full bg-[var(--color-dark)] text-[var(--color-charcoal)] overflow-x-hidden">
      {/* Loader */}
      {loading && (
        <div className="fixed inset-0 z-[100] bg-[var(--color-dark)] flex flex-col items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-display text-[var(--color-charcoal)] mb-4 tracking-widest">SIRIZ</h1>
          <div className="loader-line"></div>
          <p className="mt-4 text-gray-500 font-light tracking-widest text-sm animate-pulse">LOADING EXPERIENCE</p>
        </div>
      )}

      {/* Custom Cursor */}
      <div ref={cursorRef} className="custom-cursor hidden md:block" />

      {/* Noise Overlay */}
      <div className="noise-overlay" />

      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 outline-none" />

      {/* Fixed UI Elements */}
      <nav className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${scrollProgress > 0.05 ? 'bg-white/80 backdrop-blur-md py-4 shadow-sm' : 'py-6'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="text-2xl font-display font-bold tracking-widest text-[var(--color-charcoal)]">SIRIZ</div>
          
          <div className="hidden md:flex space-x-8 text-sm font-light tracking-wider text-[var(--color-charcoal)]">
            <a href="#about" className="hover:text-[var(--color-gold)] transition-colors interactive">ABOUT</a>
            <a href="#services" className="hover:text-[var(--color-gold)] transition-colors interactive">SERVICES</a>
            <a href="#portfolio" className="hover:text-[var(--color-gold)] transition-colors interactive">PORTFOLIO</a>
            <a href="#contact" className="hover:text-[var(--color-gold)] transition-colors interactive">CONTACT</a>
          </div>

          <button className="hidden md:block border border-[var(--color-gold)] text-[var(--color-gold)] px-6 py-2 rounded-full text-sm hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)] transition-all interactive">
            GET QUOTE
          </button>

          <button className="md:hidden text-[var(--color-charcoal)] interactive" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-30 bg-white/95 flex flex-col items-center justify-center space-y-8 text-xl font-display text-[var(--color-charcoal)]">
          <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
          <a href="#services" onClick={() => setIsMenuOpen(false)}>Services</a>
          <a href="#portfolio" onClick={() => setIsMenuOpen(false)}>Portfolio</a>
          <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
        </div>
      )}

      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 h-1 bg-[var(--color-gold)] z-50 transition-all duration-100 ease-out" style={{ width: `${scrollProgress * 100}%` }} />

      {/* Room Indicator */}
      <div key={currentRoom} className="fixed bottom-8 left-8 z-40 text-[var(--color-gold)] font-display text-xl md:text-2xl tracking-widest opacity-80 mix-blend-difference animate-[fadeIn_1s_ease-out]">
        {currentRoom}
      </div>

      {/* WhatsApp Button */}
      <a 
        href="https://api.whatsapp.com/send?phone=919384577177&text=Hi%20I'm%20Interested%20in%20your%20interior%20designing" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-40 bg-green-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform interactive"
      >
        <MessageCircle size={24} />
      </a>

      {/* Scroll Container */}
      <div ref={scrollContainerRef} className="relative w-full" style={{ height: '600vh' }}>
        
        {/* Overlay 1: Hero (0-15%) */}
        <section className={`fixed top-0 left-0 w-full h-screen flex items-center justify-center z-10 pointer-events-none transition-opacity duration-500 ${scrollProgress < 0.15 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-center pointer-events-auto">
            <h1 className="text-6xl md:text-9xl font-display font-bold text-[var(--color-gold)] tracking-[0.2em] mb-2">SIRIZ</h1>
            <p className="text-xl md:text-2xl text-gray-500 tracking-[0.3em] font-light mb-8">INTERIORS PVT LTD</p>
            <p className="font-display italic text-2xl md:text-4xl mb-8 text-[var(--color-charcoal)]">"We Design Your Dream Home"</p>
            <div className="w-0 h-[1px] bg-[var(--color-gold)] mx-auto mb-8 animate-[growWidth_1s_ease-out_forwards]" style={{ width: loading ? '0px' : '200px' }}></div>
            <div className="flex justify-center space-x-4 md:space-x-8 text-xs md:text-sm tracking-widest text-gray-500 mb-12">
              <span>11+ YEARS</span>
              <span>•</span>
              <span>600+ CLIENTS</span>
              <span>•</span>
              <span>45 DAYS DELIVERY</span>
            </div>
            <button className="border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-3 rounded-full text-sm tracking-widest hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)] transition-all interactive">
              BOOK FREE CONSULTATION
            </button>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
              <div className="w-[1px] h-12 bg-black/30 mx-auto"></div>
            </div>
          </div>
        </section>

        {/* Overlay 2: About (18-35%) */}
        <section className={`fixed top-0 left-0 w-full h-screen flex items-center z-10 pointer-events-none transition-opacity duration-500 ${scrollProgress > 0.18 && scrollProgress < 0.35 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
          <div className="container mx-auto px-6">
            <div className="glass-panel p-8 md:p-12 max-w-xl pointer-events-auto">
              <h2 className="text-3xl md:text-5xl font-display mb-6 text-[var(--color-gold)]">About SIRIZ</h2>
              <p className="text-gray-600 leading-relaxed mb-8 font-light">
                With 11 years of solid experience, SIRIZ Interiors ensures we consistently exceed our customers' expectations through quality service. We provide special and unique touches to interiors and make your dreams come true.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/5 p-4 rounded-lg border border-black/10">
                  <Star className="text-[var(--color-gold)] mb-2" size={20} />
                  <h3 className="font-display text-lg text-[var(--color-charcoal)]">Creativity</h3>
                </div>
                <div className="bg-black/5 p-4 rounded-lg border border-black/10">
                  <Check className="text-[var(--color-gold)] mb-2" size={20} />
                  <h3 className="font-display text-lg text-[var(--color-charcoal)]">Precision</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Overlay 3: Services (38-55%) */}
        <section className={`fixed top-0 left-0 w-full h-screen flex items-center justify-end z-10 pointer-events-none transition-opacity duration-500 ${scrollProgress > 0.38 && scrollProgress < 0.55 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
          <div className="container mx-auto px-6 flex justify-end">
            <div className="glass-panel p-8 md:p-12 max-w-xl pointer-events-auto">
              <h2 className="text-3xl md:text-5xl font-display mb-8 text-[var(--color-gold)]">What We Master</h2>
              <ul className="space-y-4 mb-8">
                {['Residential Interiors', 'Commercial Spaces', '3D Visualization', 'Turnkey Execution'].map((item, i) => (
                  <li key={i} className="flex items-center space-x-3 text-gray-700">
                    <span className="w-2 h-2 bg-[var(--color-gold)] rounded-full"></span>
                    <span className="font-light tracking-wide">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-4 text-xs md:text-sm tracking-wider text-gray-500">
                <div className="border border-black/10 p-3 rounded text-center">💰 Lowest Price</div>
                <div className="border border-black/10 p-3 rounded text-center">⏱️ 45-Day Delivery</div>
                <div className="border border-black/10 p-3 rounded text-center">🛡️ 10-Year Warranty</div>
                <div className="border border-black/10 p-3 rounded text-center">🔐 Customer Portal</div>
              </div>
            </div>
          </div>
        </section>

        {/* Overlay 4: Portfolio (58-75%) */}
        <section className={`fixed top-0 left-0 w-full h-screen flex flex-col items-center justify-center z-10 pointer-events-none transition-opacity duration-500 ${scrollProgress > 0.58 && scrollProgress < 0.75 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="container mx-auto px-6 pointer-events-auto">
            <h2 className="text-3xl md:text-5xl font-display text-center mb-12 text-[var(--color-gold)]">Our Signature Work</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {['Alpha 360', 'Radiance Living', 'Celesta 360'].map((project, i) => (
                <div key={i} className="glass-panel p-6 hover:bg-black/5 transition-colors group cursor-pointer interactive">
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-gray-400 font-display italic">Project Image</span>
                  </div>
                  <h3 className="text-xl font-display mb-2 text-[var(--color-charcoal)]">{project}</h3>
                  <div className="flex items-center text-[var(--color-gold)] text-sm">
                    View Project <ArrowRight size={14} className="ml-2" />
                  </div>
                </div>
              ))}
            </div>
            <div className="glass-panel p-6 max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left">
              <div>
                <h3 className="text-xl font-display text-[var(--color-charcoal)]">Packages starting from ₹69,000</h3>
                <p className="text-gray-500 text-sm">Kitchens, Wardrobes, and Full Home Interiors</p>
              </div>
              <button className="mt-4 md:mt-0 bg-[var(--color-gold)] text-[var(--color-charcoal)] px-6 py-2 rounded-full font-medium hover:bg-black hover:text-white transition-colors interactive">
                View Pricing
              </button>
            </div>
          </div>
        </section>

        {/* Overlay 5: Testimonials (72-88%) */}
        <section className={`fixed top-0 left-0 w-full h-screen flex items-center z-10 pointer-events-none transition-opacity duration-500 ${scrollProgress > 0.72 && scrollProgress < 0.88 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="container mx-auto px-6">
            <div className="glass-panel p-8 md:p-12 max-w-2xl pointer-events-auto">
              <h2 className="text-3xl md:text-5xl font-display mb-8 text-[var(--color-gold)]">Client Stories</h2>
              <div className="mb-8">
                <div className="text-[var(--color-gold)] text-4xl font-serif mb-4">"</div>
                <p className="text-xl md:text-2xl font-display italic leading-relaxed mb-6 text-[var(--color-charcoal)]">
                  One of the best architect, who listens to the client's preference and enhance it to the current trend. An ideal person if you expect quality work.
                </p>
                <div className="flex items-center space-x-2 text-[var(--color-gold)] mb-2">
                  {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="currentColor" />)}
                </div>
                <p className="font-bold tracking-wider text-[var(--color-charcoal)]">— Ganesh Anand C</p>
              </div>
              <div className="border-t border-black/10 pt-6 flex justify-between text-xs md:text-sm text-gray-500 tracking-widest">
                <span>DESIGN</span>
                <span>PLANNING</span>
                <span>EXECUTION</span>
                <span>DELIVERY</span>
              </div>
            </div>
          </div>
        </section>

        {/* Overlay 6: Contact (88-100%) */}
        <section className={`fixed top-0 left-0 w-full h-screen flex items-center justify-center z-10 pointer-events-none transition-opacity duration-500 ${scrollProgress > 0.88 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="container mx-auto px-6 pointer-events-auto">
            <div className="glass-panel p-8 md:p-12 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-4xl md:text-6xl font-display mb-4 text-[var(--color-gold)]">Let's Build Extraordinary</h2>
                  <p className="text-gray-600 mb-8 font-light">Book your FREE design consultation today.</p>
                  
                  <div className="space-y-6 mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-[var(--color-gold)]"><Phone size={20} /></div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Call Us</p>
                        <p className="text-lg text-[var(--color-charcoal)]">+91 84384 23938</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-[var(--color-gold)]"><Mail size={20} /></div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Email</p>
                        <p className="text-lg text-[var(--color-charcoal)]">info@sirizinteriors.com</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-[var(--color-gold)]"><MapPin size={20} /></div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Visit</p>
                        <p className="text-lg text-[var(--color-charcoal)]">Medavakkam, Chennai</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 text-gray-400">
                    <Instagram className="hover:text-[var(--color-gold)] transition-colors cursor-pointer interactive" />
                    <Facebook className="hover:text-[var(--color-gold)] transition-colors cursor-pointer interactive" />
                    <Youtube className="hover:text-[var(--color-gold)] transition-colors cursor-pointer interactive" />
                  </div>
                </div>

                <form className="space-y-4">
                  <input type="text" placeholder="Your Name" className="w-full bg-black/5 border border-black/10 rounded-lg p-4 focus:border-[var(--color-gold)] outline-none transition-colors interactive text-[var(--color-charcoal)]" />
                  <input type="tel" placeholder="Phone Number" className="w-full bg-black/5 border border-black/10 rounded-lg p-4 focus:border-[var(--color-gold)] outline-none transition-colors interactive text-[var(--color-charcoal)]" />
                  <select className="w-full bg-black/5 border border-black/10 rounded-lg p-4 focus:border-[var(--color-gold)] outline-none transition-colors interactive text-gray-500">
                    <option>Select Property Type</option>
                    <option>1 BHK</option>
                    <option>2 BHK</option>
                    <option>3 BHK</option>
                    <option>Villa / Duplex</option>
                  </select>
                  <textarea placeholder="Tell us about your dream home..." rows={4} className="w-full bg-black/5 border border-black/10 rounded-lg p-4 focus:border-[var(--color-gold)] outline-none transition-colors interactive text-[var(--color-charcoal)]"></textarea>
                  
                  <button className="w-full bg-[var(--color-gold)] text-[var(--color-charcoal)] font-bold py-4 rounded-lg hover:bg-black hover:text-white transition-colors interactive">
                    GET FREE CONSULTATION
                  </button>
                </form>
              </div>
              
              <div className="mt-12 pt-8 border-t border-black/10 text-center text-xs text-gray-500 tracking-widest">
                © 2025 SIRIZ INTERIORS PVT LTD. ALL RIGHTS RESERVED.
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
