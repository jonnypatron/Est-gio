import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as ROSLIB from 'roslib';
import * as THREE from 'three';
import SentinelModel from './SentinelModel';

function PaginaVisualizacao({ ros }) {
  const [rotationQuat, setRotationQuat] = useState({ x: 0, y: 0, z: 0, w: 1 });
  const [euler, setEuler] = useState({ roll: 0, pitch: 0, yaw: 0 });
  const [thrusters, setThrusters] = useState(new Array(8).fill(0));

  useEffect(() => {
    if (!ros) return;

    const quatTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/quaternions',
      messageType: 'geometry_msgs/Quaternion'
    });

    quatTopic.subscribe((msg) => {
      setRotationQuat(msg);
      const threeQuat = new THREE.Quaternion(msg.x, msg.y, msg.z, msg.w);
      const eulerOrder = new THREE.Euler().setFromQuaternion(threeQuat, 'XYZ');
      setEuler({
        roll: (eulerOrder.x * (180 / Math.PI)).toFixed(1),
        pitch: (eulerOrder.y * (180 / Math.PI)).toFixed(1),
        yaw: (eulerOrder.z * (180 / Math.PI)).toFixed(1)
      });
    });

    const thrusterTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/propulsores_array',
      messageType: 'std_msgs/Int32MultiArray'
    });
    thrusterTopic.subscribe((msg) => setThrusters(msg.data));

    return () => {
      quatTopic.unsubscribe();
      thrusterTopic.unsubscribe();
    };
  }, [ros]);

  return (
    <div className="viz-container">
      
      <div className="viz-card video-card">
        <div className="video-placeholder">
          <span className="material-icons">videocam_off</span>
          <p>CAMERA OFFLINE</p>
        </div>
        
        <div className="hud-thrusters">
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

      <div className="viz-card three-card">
        <Canvas camera={{ position: [5, 2, 5], fov: 40 }} shadows>
          <ambientLight intensity={0.5} /> 
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          <Environment preset="city" /> 
          <Suspense fallback={null}>
            <SentinelModel rotationQuat={rotationQuat} />
          </Suspense>
          <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={10} blur={2} far={1} />
          <OrbitControls />
        </Canvas>

        <div className="hud-orientation">
          <div className="hud-data"><span>ROLL:</span> {euler.roll}°</div>
          <div className="hud-data"><span>PITCH:</span> {euler.pitch}°</div>
          <div className="hud-data"><span>YAW:</span> {euler.yaw}°</div>
        </div>
      </div>

    </div>
  );
}

export default PaginaVisualizacao;