// 1. Adicionar o useRef no import
import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, GizmoHelper, GizmoViewport, Grid, Line } from '@react-three/drei';
import * as THREE from 'three';
import SentinelModel from './SentinelModel';
import VideoStreamDisplay from './VideoStreamDisplay';

// 2. Receber o isActive
function PaginaVisualizacao({ ros, isActive }) {
  const rotationQuatRef = useRef({ x: 0, y: 0, z: 0, w: 1 });
  const targetQuatRef = useRef({ x: 0, y: 0, z: 0, w: 1 });

  const positionRef = useRef({ x: 0, y: 0, z: 0 });
  const targetPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const offsetRef = useRef(null); // Guarda o ponto inicial

  const [euler, setEuler] = useState({ roll: 0, pitch: 0, yaw: 0 });
  const [thrusters, setThrusters] = useState(new Array(8).fill(0));

  const [trailPoints, setTrailPoints] = useState([]);
  const frameCounter = useRef(0);

  // 3. Criar a referência espiã
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!ros) return;

    // --- 1. ODOMETRIA (Robô Real) ---
    const quatTopic = new window.ROSLIB.Topic({
      ros: ros,
      name: '/vvhub_odom',
      messageType: 'nav_msgs/msg/Odometry',
      throttle_rate: 50 
    });

    quatTopic.subscribe((msg) => {
      if (!isActiveRef.current) return;
      try {
        if (!msg || !msg.pose || !msg.pose.pose) return; 
        
        // --- TRATAR A ROTAÇÃO ---
        const quat = msg.pose.pose.orientation;
        if (typeof quat.x !== 'undefined' && !isNaN(quat.x)) {
          rotationQuatRef.current = quat;
          const threeQuat = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
          const eulerOrder = new THREE.Euler().setFromQuaternion(threeQuat, 'XYZ');
          setEuler({
            roll: (eulerOrder.x * (180 / Math.PI)).toFixed(1),
            pitch: (eulerOrder.y * (180 / Math.PI)).toFixed(1),
            yaw: (eulerOrder.z * (180 / Math.PI)).toFixed(1)
          });
        }

        // --- TRATAR A POSIÇÃO COM OFFSET ---
        const pos = msg.pose.pose.position;
        if (typeof pos.x !== 'undefined' && !isNaN(pos.x)) {
          if (!offsetRef.current) {
            offsetRef.current = { x: pos.x, y: pos.y, z: pos.z };
          }
          const currentPos = {
            x: pos.x - offsetRef.current.x,
            y: pos.y - offsetRef.current.y,
            z: pos.z - offsetRef.current.z
          };
          positionRef.current = currentPos;

          frameCounter.current += 1;
          if (frameCounter.current % 5 === 0) {
            // Mapeamento ROS -> ThreeJS (x, z, -y) igual ao SentinelModel!
            const threeVector = new THREE.Vector3(currentPos.x, currentPos.z, -currentPos.y);
            setTrailPoints(prev => {
              const newTrail = [...prev, threeVector];
              if (newTrail.length > 80) newTrail.shift(); // Guarda apenas os últimos 80 pontos (cauda da estrela cadente)
              return newTrail;
            });
          }
        }
      } catch (error) {
        console.warn("Erro a ler Odometria", error);
      }
    });

    // --- 2. REFERÊNCIA (Robô Fantasma) ---
    const targetTopic = new window.ROSLIB.Topic({
      ros: ros,
      name: '/ref/pose',
      messageType: 'geometry_msgs/PoseStamped',
      throttle_rate: 50 
    });

    targetTopic.subscribe((msg) => {
      if (!isActiveRef.current) return;
      try {
        if (!msg || !msg.pose) return;
        
        // Rotação do Fantasma
        const quat = msg.pose.orientation;
        if (typeof quat.x !== 'undefined' && !isNaN(quat.x)) {
          targetQuatRef.current = quat;
        }

        // Posição do Fantasma
        const pos = msg.pose.position;
        if (typeof pos.x !== 'undefined' && !isNaN(pos.x) && offsetRef.current) {
          console.log("COORDENADAS ALVO (FANTASMA):", pos.x, pos.y, pos.z);
          targetPositionRef.current = {
            x: pos.x - offsetRef.current.x,
            y: pos.y - offsetRef.current.y,
            z: pos.z - offsetRef.current.z
          };
        }
      } catch (error) {
        console.warn("Erro a ler a Referência (Target)", error);
      }
    });
    // Aquele }); extra que andava aqui foi eliminado!

    // --- 3. PROPULSORES ---
    const thrusterTopic = new window.ROSLIB.Topic({
      ros: ros,
      name: '/thrusters/u',
      messageType: 'std_msgs/msg/Int32MultiArray',
      throttle_rate: 150 
    });
    
    thrusterTopic.subscribe((msg) => {
      if (!isActiveRef.current) return;
      setThrusters(msg.data);
    });

    // --- LIMPEZA ---
    return () => {
      quatTopic.unsubscribe();
      targetTopic.unsubscribe(); 
      thrusterTopic.unsubscribe();
    };
  }, [ros]);

  return (
    <div className="viz-container">
      <div className="viz-card video-card" style={{ position: 'relative' }}>
          <VideoStreamDisplay 
            videoWsUrl="ws://172.20.10.4:9092"
            topic="/camera/compressed" 
            cameraLabel="Câmara Sentinel" 
          />
        <div className="hud-thrusters" style={{ position: 'absolute', zIndex: 10, top: '15px', left: '15px' }}>
          <p className="hud-label">THRUSTER ARRAY</p>
          <div className="thruster-grid">
            {thrusters.map((active, i) => (
              <div key={i} className={`thruster-led ${active ? 'active' : ''}`}>
                <span className="thruster-id">{i+1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="viz-card three-card" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '20px', zIndex: 10 }}>
          <h2 style={{ fontSize: '11px', color: '#888', letterSpacing: '2px', margin: 0 }}>3D MODEL</h2>
        </div>
        <Canvas camera={{ position: [6, 4, 6], fov: 45 }} shadows={{ type: THREE.PCFShadowMap }}>
          <color attach="background" args={['#0d0d0d']} />
          <ambientLight intensity={0.6} /> 
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          <Suspense fallback={null}>
            <SentinelModel rotationQuatRef={rotationQuatRef} positionRef={positionRef} />
            <SentinelModel rotationQuatRef={targetQuatRef} positionRef={targetPositionRef} isGhost={true} />
            
            {/* O RASTO DA TRAJETÓRIA (Desenhado a vermelho/azul) */}
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
          {/* AFUNDÁMOS A GRELHA E A SOMBRA PARA Y = -4 PARA SER O "FUNDO DA PISCINA" */}
          <Grid position={[0, -4, 0]} args={[40, 40]} cellSize={1} cellThickness={1} cellColor="#222" sectionSize={5} sectionThickness={1.5} sectionColor="#00d66b" fadeDistance={30} fadeStrength={1.5} />
          <ContactShadows position={[0, -3.9, 0]} opacity={0.5} scale={15} blur={2.5} far={4} />
          <OrbitControls makeDefault enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} />
          <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
            <GizmoViewport axisColors={['#ff4d4d', '#00d66b', '#3498db']} labelColor="white" />
          </GizmoHelper>
        </Canvas>
        <div className="hud-orientation modern-hud">
          <div className="hud-data"><span className="axis-x">ROLL</span> {euler.roll}°</div>
          <div className="hud-data"><span className="axis-y">PITCH</span> {euler.pitch}°</div>
          <div className="hud-data"><span className="axis-z">YAW</span> {euler.yaw}°</div>
        </div>
      </div>
    </div>
  );
}

export default PaginaVisualizacao;