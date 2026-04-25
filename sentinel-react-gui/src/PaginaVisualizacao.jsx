// 1. Adicionar o useRef no import
import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import * as THREE from 'three';
import SentinelModel from './SentinelModel';
import VideoStreamDisplay from './VideoStreamDisplay';

// 2. Receber o isActive
function PaginaVisualizacao({ ros, isActive }) {
  const [rotationQuat, setRotationQuat] = useState({ x: 0, y: 0, z: 0, w: 1 });
  const [euler, setEuler] = useState({ roll: 0, pitch: 0, yaw: 0 });
  const [thrusters, setThrusters] = useState(new Array(8).fill(0));

  // 3. Criar a referência espiã
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!ros) return;

    const quatTopic = new window.ROSLIB.Topic({
      ros: ros,
      name: '/vvhub_odom',
      messageType: 'nav_msgs/msg/Odometry',
      throttle_rate: 50 
    });

    quatTopic.subscribe((msg) => {
      // 🛑 CORTA-CORRENTE: Se a aba não estiver ativa, ignora os dados!
      if (!isActiveRef.current) return;

      try {
        if (!msg || !msg.pose || !msg.pose.pose || !msg.pose.pose.orientation) {
          return; 
        }
        const quat = msg.pose.pose.orientation;
        if (typeof quat.x === 'undefined' || isNaN(quat.x)) {
          return;
        }

        setRotationQuat(quat); 

        const threeQuat = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
        const eulerOrder = new THREE.Euler().setFromQuaternion(threeQuat, 'XYZ');
        
        setEuler({
          roll: (eulerOrder.x * (180 / Math.PI)).toFixed(1),
          pitch: (eulerOrder.y * (180 / Math.PI)).toFixed(1),
          yaw: (eulerOrder.z * (180 / Math.PI)).toFixed(1)
        });
      } catch (error) {
        console.warn("Erro a ler Odometria", error);
      }
    });

    const thrusterTopic = new window.ROSLIB.Topic({
      ros: ros,
      name: '/thrusters/u',
      messageType: 'std_msgs/msg/Int32MultiArray',
      throttle_rate: 150 
    });
    
    thrusterTopic.subscribe((msg) => {
      // 🛑 CORTA-CORRENTE
      if (!isActiveRef.current) return;
      setThrusters(msg.data);
    });

    return () => {
      quatTopic.unsubscribe();
      thrusterTopic.unsubscribe();
    };
  }, [ros]);

  return (
    <div className="viz-container">
      {/* O resto do return mantém-se EXATAMENTE IGUAL ao que tinhas */}
      <div className="viz-card video-card" style={{ position: 'relative' }}>
          <VideoStreamDisplay 
            videoWsUrl="ws://192.168.31.14:9092"
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
        <Canvas camera={{ position: [6, 4, 6], fov: 45 }} shadows>
          <color attach="background" args={['#0d0d0d']} />
          <ambientLight intensity={0.6} /> 
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          <Suspense fallback={null}>
            <SentinelModel rotationQuat={rotationQuat} />
          </Suspense>
          <Grid position={[0, -1.01, 0]} args={[20, 20]} cellSize={1} cellThickness={1} cellColor="#222" sectionSize={5} sectionThickness={1.5} sectionColor="#00d66b" fadeDistance={25} fadeStrength={1.5} />
          <ContactShadows position={[0, -1, 0]} opacity={0.6} scale={10} blur={2.5} far={2} />
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