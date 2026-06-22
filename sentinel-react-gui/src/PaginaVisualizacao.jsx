import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import * as THREE from 'three';
import SentinelModel from './SentinelModel';
import VideoStreamDisplay from './VideoStreamDisplay';

const CAMERAS = [
  { label: 'HIRES',    topic: '/hires_small_color' },
  { label: 'TRACKING', topic: '/tracking'          },
  { label: 'QVIO',       topic: '/qvio_overlay'      },
  { label: 'STEREO',   topic: '/stereo'            },
];

function CameraFollower({ positionRef, controlsRef }) {
  const _v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (positionRef.current && controlsRef.current) {
      const { x, y, z } = positionRef.current;
      controlsRef.current.target.lerp(_v.set(x, z, -y), 0.1);
      controlsRef.current.update();
    }
  });
  return null;
}

// ── Vetor curto entre o robô e a referência ────────────────────────────────────
function ErrorVector({ positionRef, targetPositionRef }) {
  const positions = useMemo(() => new Float32Array(6), []);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  const lineRef = useRef();

  useFrame(() => {
    const c = positionRef.current;
    const t = targetPositionRef.current;
    if (!c || !t) return;
    positions[0] = c.x; positions[1] = c.z; positions[2] = -c.y;
    positions[3] = t.x; positions[4] = t.z; positions[5] = -t.y;
    geom.attributes.position.needsUpdate = true;
    const d = Math.hypot(c.x - t.x, c.y - t.y, c.z - t.z);
    if (lineRef.current) lineRef.current.visible = d > 0.02;
  });

  return (
    <line ref={lineRef} geometry={geom}>
      <lineBasicMaterial color="#ffd84a" transparent opacity={0.85} />
    </line>
  );
}

// ── Rasto (trail) SEM setState ─────────────────────────────────────────────────
// Buffer mutável atualizado em useFrame: zero alocações por frame, zero re-render
// do React → elimina os "engasgos" de garbage collection que paravam o 3D.
function Trail({ positionRef, maxPoints = 60 }) {
  const positions = useMemo(() => new Float32Array(maxPoints * 3), [maxPoints]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [positions]);
  const count = useRef(0);
  const last  = useRef(new THREE.Vector3(Infinity, Infinity, Infinity));
  const frame = useRef(0);

  useFrame(() => {
    const p = positionRef.current;
    if (!p) return;
    frame.current++;
    if (frame.current % 6 !== 0) return;             // ~10 Hz a 60 fps

    const x = p.x, y = p.z, z = -p.y;
    if (Math.hypot(x - last.current.x, y - last.current.y, z - last.current.z) < 0.01) return;
    last.current.set(x, y, z);

    if (count.current < maxPoints) {
      const i = count.current * 3;
      positions[i] = x; positions[i + 1] = y; positions[i + 2] = z;
      count.current += 1;
      geom.setDrawRange(0, count.current);
    } else {
      positions.copyWithin(0, 3);                    // descarta o ponto mais antigo
      const i = (maxPoints - 1) * 3;
      positions[i] = x; positions[i + 1] = y; positions[i + 2] = z;
    }
    geom.attributes.position.needsUpdate = true;
    geom.computeBoundingSphere();
  });

  return (
    <line geometry={geom}>
      <lineBasicMaterial color="#3498db" transparent opacity={0.7} />
    </line>
  );
}

function PaginaVisualizacao({ ros, videoWsUrl, isActive }) {
  const rotationQuatRef   = useRef({ x: 0, y: 0, z: 0, w: 1 });
  const targetQuatRef     = useRef({ x: 0, y: 0, z: 0, w: 1 });
  const positionRef       = useRef({ x: 0, y: 0, z: 0 });
  const targetPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const offsetRef         = useRef(null);

  const [euler,     setEuler]     = useState({ roll: 0, pitch: 0, yaw: 0 });
  const [thrusters, setThrusters] = useState(new Array(8).fill(0));
  const [refErr,    setRefErr]    = useState({ dist: 0, attDeg: 0, hasRef: false });

  const [activeTopic, setActiveTopic] = useState(CAMERAS[1].topic);

  const frameCounter = useRef(0);
  const controlsRef  = useRef(null);
  const isActiveRef  = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // Objetos reutilizáveis (evitam alocações → menos GC)
  const _eq = useRef(new THREE.Quaternion());   // p/ Euler do HUD
  const _ee = useRef(new THREE.Euler());
  const _qc = useRef(new THREE.Quaternion());   // p/ erro de atitude
  const _qt = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (!ros) return;

    // ODOMETRIA
    const quatTopic = new window.ROSLIB.Topic({
      ros, name: '/vvhub_odom', messageType: 'nav_msgs/msg/Odometry', throttle_rate: 50,
    });
    quatTopic.subscribe((msg) => {
      if (!isActiveRef.current) return;
      try {
        if (!msg?.pose?.pose) return;
        frameCounter.current += 1;

        const quat = msg.pose.pose.orientation;
        if (typeof quat.x !== 'undefined' && !isNaN(quat.x)) {
          rotationQuatRef.current = quat;
          if (frameCounter.current % 10 === 0) {
            _eq.current.set(quat.x, quat.y, quat.z, quat.w);
            _ee.current.setFromQuaternion(_eq.current, 'XYZ');
            const r2d = 180 / Math.PI;
            setEuler({
              roll:  (_ee.current.x * r2d).toFixed(1),
              pitch: (_ee.current.y * r2d).toFixed(1),
              yaw:   (_ee.current.z * r2d).toFixed(1),
            });
          }
        }

        const pos = msg.pose.pose.position;
        if (typeof pos.x !== 'undefined' && !isNaN(pos.x)) {
          if (!offsetRef.current) offsetRef.current = { x: pos.x, y: pos.y, z: pos.z };
          positionRef.current = {
            x: pos.x - offsetRef.current.x,
            y: pos.y - offsetRef.current.y,
            z: pos.z - offsetRef.current.z,
          };
          // (o rasto é tratado no componente <Trail/>, sem setState)
        }
      } catch (e) { console.warn('Erro odometria', e); }
    });

    // REFERÊNCIA (Robô Fantasma)
    const targetTopic = new window.ROSLIB.Topic({
      ros, name: '/ref/pose', messageType: 'geometry_msgs/PoseStamped', throttle_rate: 50,
    });
    targetTopic.subscribe((msg) => {
      if (!isActiveRef.current) return;
      try {
        if (!msg?.pose) return;
        const quat = msg.pose.orientation;
        if (typeof quat.x !== 'undefined' && !isNaN(quat.x)) targetQuatRef.current = quat;
        const pos = msg.pose.position;
        if (typeof pos.x !== 'undefined' && !isNaN(pos.x) && offsetRef.current) {
          targetPositionRef.current = {
            x: pos.x - offsetRef.current.x,
            y: pos.y - offsetRef.current.y,
            z: pos.z - offsetRef.current.z,
          };
        }
      } catch (_) {}
    });

    // PROPULSORES
    const thrusterTopic = new window.ROSLIB.Topic({
      ros, name: '/thrusters/u', messageType: 'std_msgs/msg/Int32MultiArray', throttle_rate: 150,
    });
    thrusterTopic.subscribe((msg) => {
      if (!isActiveRef.current) return;
      setThrusters(msg.data);
    });

    return () => {
      quatTopic.unsubscribe();
      targetTopic.unsubscribe();
      thrusterTopic.unsubscribe();
    };
  }, [ros]);

  // Erro de referência a ~4 Hz (lê refs, não pesa no render loop)
  useEffect(() => {
    const t = setInterval(() => {
      if (!isActiveRef.current) return;
      const c = positionRef.current;
      const r = targetPositionRef.current;
      const dist = Math.hypot(c.x - r.x, c.y - r.y, c.z - r.z);

      const qc = rotationQuatRef.current;
      const qt = targetQuatRef.current;
      _qc.current.set(qc.x, qc.y, qc.z, qc.w);
      _qt.current.set(qt.x, qt.y, qt.z, qt.w).invert();
      _qc.current.premultiply(_qt.current);          // q_err = q_ref⁻¹ · q_cur
      const w = Math.min(1, Math.abs(_qc.current.w));
      const attDeg = 2 * Math.acos(w) * (180 / Math.PI);

      setRefErr({ dist, attDeg, hasRef: offsetRef.current !== null });
    }, 250);
    return () => clearInterval(t);
  }, []);

  const posOk = refErr.dist   < 0.05;
  const attOk = refErr.attDeg < 5;
  const posColor = posOk ? '#00d66b' : '#ffd84a';
  const attColor = attOk ? '#00d66b' : '#ffd84a';

  return (
    <div className="viz-container">

      {/* ── Vídeo ──────────────────────────────────────────────────────────── */}
      <div className="viz-card video-card" style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#0d0d0d' }}>
        <VideoStreamDisplay
          videoWsUrl={videoWsUrl}
          topic={activeTopic}
          cameraLabel={CAMERAS.find(c => c.topic === activeTopic)?.label ?? 'Câmara'}
        />

        <div className="hud-thrusters" style={{ position: 'absolute', zIndex: 10, top: '15px', left: '15px' }}>
          <p className="hud-label">THRUSTER ARRAY</p>
          <div className="thruster-grid">
            {thrusters.map((active, i) => (
              <div key={i} className={`thruster-led ${active ? 'active' : ''}`}>
                <span className="thruster-id">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '4px' }}>
          {CAMERAS.map(({ label, topic }) => {
            const isSel = activeTopic === topic;
            return (
              <button
                key={topic}
                onClick={() => setActiveTopic(topic)}
                style={{
                  background:    isSel ? 'rgba(0,214,107,0.15)' : 'rgba(0,0,0,0.65)',
                  border:        `1px solid ${isSel ? '#00d66b' : '#444'}`,
                  color:         isSel ? '#00d66b' : '#777',
                  borderRadius:  '4px', padding: '4px 8px', fontSize: '10px',
                  fontWeight:    'bold', letterSpacing: '1px', cursor: 'pointer',
                  fontFamily:    'monospace', transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3D ─────────────────────────────────────────────────────────────── */}
      <div className="viz-card three-card" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '20px', zIndex: 10 }}>
          <h2 style={{ fontSize: '11px', color: '#888', letterSpacing: '2px', margin: 0 }}>3D MODEL</h2>
        </div>

        {/* HUD do erro de referência */}
        <div style={{
          position: 'absolute', top: '12px', right: '12px', zIndex: 10,
          background: 'rgba(10,10,10,0.75)', border: '1px solid #333',
          borderRadius: '6px', padding: '8px 12px',
          fontFamily: "'Courier New', monospace", minWidth: '120px',
        }}>
          <div style={{ fontSize: '8px', letterSpacing: '1px', color: '#777', marginBottom: '4px' }}>TRACKING ERROR</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px', fontWeight: 'bold' }}>
            <span style={{ color: '#666' }}>ΔPOS</span>
            <span style={{ color: refErr.hasRef ? posColor : '#555' }}>{refErr.hasRef ? `${refErr.dist.toFixed(2)} m` : '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>
            <span style={{ color: '#666' }}>ΔATT</span>
            <span style={{ color: refErr.hasRef ? attColor : '#555' }}>{refErr.hasRef ? `${refErr.attDeg.toFixed(1)}°` : '—'}</span>
          </div>
        </div>

        <Canvas
          camera={{ position: [6, 4, 6], fov: 45 }}
          dpr={[1, 1.5]}                                 /* PERF: limita render em retina */
          frameloop={isActive ? 'always' : 'demand'}     /* PERF: pausa o loop quando inativo */
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#0d0d0d']} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 5]} intensity={1.4} />

          <Suspense fallback={null}>
            <CameraFollower positionRef={positionRef} controlsRef={controlsRef} />
            <SentinelModel rotationQuatRef={rotationQuatRef} positionRef={positionRef} />
            <SentinelModel rotationQuatRef={targetQuatRef}   positionRef={targetPositionRef} isGhost={true} />
            <ErrorVector positionRef={positionRef} targetPositionRef={targetPositionRef} />
            <Trail positionRef={positionRef} />
          </Suspense>

          <Grid
            position={[0, -4, 0]}
            args={[40, 40]}
            cellSize={1}    cellThickness={1}      cellColor="#222"
            sectionSize={5} sectionThickness={1.5} sectionColor="#00d66b"
            fadeDistance={30} fadeStrength={1.5}
          />
          <OrbitControls ref={controlsRef} makeDefault enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} />
          <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
            <GizmoViewport axisColors={['#ff4d4d', '#00d66b', '#3498db']} labelColor="white" />
          </GizmoHelper>
        </Canvas>

        <div className="hud-orientation modern-hud">
          <div className="hud-data"><span className="axis-x">ROLL</span>  {euler.roll}°</div>
          <div className="hud-data"><span className="axis-y">PITCH</span> {euler.pitch}°</div>
          <div className="hud-data"><span className="axis-z">YAW</span>   {euler.yaw}°</div>
        </div>
      </div>

    </div>
  );
}

export default PaginaVisualizacao;