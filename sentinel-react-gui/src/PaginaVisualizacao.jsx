import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, GizmoHelper, GizmoViewport, Grid, Line } from '@react-three/drei';
import * as THREE from 'three';
import SentinelModel from './SentinelModel';
import VideoStreamDisplay from './VideoStreamDisplay';

// ── Câmaras disponíveis ────────────────────────────────────────────────────────
// Para adicionar/remover câmaras, edita apenas esta lista.
// label: texto do botão (máx ~8 chars para caber no mobile)
// topic: tópico ROS2 comprimido no robô
const CAMERAS = [
  { label: 'HIRES',    topic: '/hires_small_color/compressed' },
  { label: 'TRACKING', topic: '/tracking/compressed'          },
  { label: 'STEREO',   topic: '/stereo/compressed'            },
];

function CameraFollower({ positionRef, controlsRef }) {
  useFrame(() => {
    if (positionRef.current && controlsRef.current) {
      const { x, y, z } = positionRef.current;
      controlsRef.current.target.lerp(new THREE.Vector3(x, z, -y), 0.1);
      controlsRef.current.update();
    }
  });
  return null;
}

// Props:
//   ros         — ligação ROSBridge para odometria, thrusters, etc.
//   videoWsUrl  — URL do servidor WebSocket C++ do robô (ex: "ws://192.168.31.14:9092")
//   isActive    — controla se os subscribers ROS2 estão ativos
function PaginaVisualizacao({ ros, videoWsUrl, isActive }) {
  const rotationQuatRef   = useRef({ x: 0, y: 0, z: 0, w: 1 });
  const targetQuatRef     = useRef({ x: 0, y: 0, z: 0, w: 1 });
  const positionRef       = useRef({ x: 0, y: 0, z: 0 });
  const targetPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const offsetRef         = useRef(null);

  const [euler,       setEuler]       = useState({ roll: 0, pitch: 0, yaw: 0 });
  const [thrusters,   setThrusters]   = useState(new Array(8).fill(0));
  const [trailPoints, setTrailPoints] = useState([]);

  // ── Seleção de câmara ──────────────────────────────────────────────────────
  // activeTopic é passado como prop "topic" ao VideoStreamDisplay.
  // Quando muda, o VideoStreamDisplay envia "switch" sem reconectar o WebSocket.
  const [activeTopic, setActiveTopic] = useState(CAMERAS[0].topic);

  const frameCounter = useRef(0);
  const controlsRef  = useRef(null);
  const isActiveRef  = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  useEffect(() => {
    if (!ros) return;

    // ODOMETRIA
    const quatTopic = new window.ROSLIB.Topic({
      ros,
      name: '/vvhub_odom',
      messageType: 'nav_msgs/msg/Odometry',
      throttle_rate: 50,
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
            const threeQuat  = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
            const eulerAngles = new THREE.Euler().setFromQuaternion(threeQuat, 'XYZ');
            setEuler({
              roll:  (eulerAngles.x * (180 / Math.PI)).toFixed(1),
              pitch: (eulerAngles.y * (180 / Math.PI)).toFixed(1),
              yaw:   (eulerAngles.z * (180 / Math.PI)).toFixed(1),
            });
          }
        }

        const pos = msg.pose.pose.position;
        if (typeof pos.x !== 'undefined' && !isNaN(pos.x)) {
          if (!offsetRef.current) offsetRef.current = { x: pos.x, y: pos.y, z: pos.z };
          const currentPos = {
            x: pos.x - offsetRef.current.x,
            y: pos.y - offsetRef.current.y,
            z: pos.z - offsetRef.current.z,
          };
          positionRef.current = currentPos;
          if (frameCounter.current % 5 === 0) {
            const v = new THREE.Vector3(currentPos.x, currentPos.z, -currentPos.y);
            setTrailPoints(prev => {
              const next = [...prev, v];
              if (next.length > 80) next.shift();
              return next;
            });
          }
        }
      } catch (e) { console.warn('Erro odometria', e); }
    });

    // REFERÊNCIA (Robô Fantasma)
    const targetTopic = new window.ROSLIB.Topic({
      ros,
      name: '/ref/pose',
      messageType: 'geometry_msgs/PoseStamped',
      throttle_rate: 50,
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
      ros,
      name: '/thrusters/u',
      messageType: 'std_msgs/msg/Int32MultiArray',
      throttle_rate: 150,
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

  return (
    <div className="viz-container">

      {/* ── Vídeo ──────────────────────────────────────────────────────────── */}
      <div
        className="viz-card video-card"
        style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#0d0d0d' }}
      >
        <VideoStreamDisplay
          videoWsUrl={videoWsUrl}
          topic={activeTopic}
          cameraLabel={CAMERAS.find(c => c.topic === activeTopic)?.label ?? 'Câmara'}
        />

        {/* HUD propulsores — canto superior esquerdo */}
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

        {/* Seletor de câmara — canto inferior direito */}
        <div style={{
          position: 'absolute', bottom: '10px', right: '10px',
          zIndex: 10, display: 'flex', gap: '4px',
        }}>
          {CAMERAS.map(({ label, topic }) => {
            const isActive = activeTopic === topic;
            return (
              <button
                key={topic}
                onClick={() => setActiveTopic(topic)}
                style={{
                  background:    isActive ? 'rgba(0,214,107,0.15)' : 'rgba(0,0,0,0.65)',
                  border:        `1px solid ${isActive ? '#00d66b' : '#444'}`,
                  color:         isActive ? '#00d66b' : '#777',
                  borderRadius:  '4px',
                  padding:       '4px 8px',
                  fontSize:      '10px',
                  fontWeight:    'bold',
                  letterSpacing: '1px',
                  cursor:        'pointer',
                  fontFamily:    'monospace',
                  transition:    'all 0.15s ease',
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

        <Canvas camera={{ position: [6, 4, 6], fov: 45 }} shadows={{ type: THREE.PCFShadowMap }}>
          <color attach="background" args={['#0d0d0d']} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />

          <Suspense fallback={null}>
            <CameraFollower positionRef={positionRef} controlsRef={controlsRef} />
            <SentinelModel rotationQuatRef={rotationQuatRef} positionRef={positionRef} />
            <SentinelModel rotationQuatRef={targetQuatRef}   positionRef={targetPositionRef} isGhost={true} />

            {trailPoints.length > 1 && (
              <Line
                points={trailPoints}
                color="#3498db"
                lineWidth={2.5}
                dashed={true}
                dashSize={0.5}
                dashScale={2}
                transparent={true}
                opacity={0.8}
              />
            )}
          </Suspense>

          <Grid
            position={[0, -4, 0]}
            args={[40, 40]}
            cellSize={1}        cellThickness={1}   cellColor="#222"
            sectionSize={5}     sectionThickness={1.5} sectionColor="#00d66b"
            fadeDistance={30}   fadeStrength={1.5}
          />
          <ContactShadows position={[0, -3.9, 0]} opacity={0.5} scale={15} blur={2.5} far={4} />
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