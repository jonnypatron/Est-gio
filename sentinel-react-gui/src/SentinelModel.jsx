import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber'; // Importamos o useFrame!
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Recebe a Ref em vez do State
function SentinelModel({ rotationQuatRef, ...props }) {
  const { scene } = useGLTF('/sentinel.glb'); 
  const modelRef = useRef();

  // O useFrame corre a cada frame (60 vezes por segundo) diretamente no motor 3D.
  // Isto IGNORA o ciclo de vida do React, poupando imenso processador!
  useFrame(() => {
    // Verificamos se o modelo já carregou e se a REF tem dados
    if (modelRef.current && rotationQuatRef && rotationQuatRef.current) {
      
      const q = rotationQuatRef.current;

      // Mantemos a TUA conversão de eixos exata (Mapeamento ROS -> Three.js)
      const quat = new THREE.Quaternion(
        q.x,
        q.z,   
        -q.y,  
        q.w
      );
      
      modelRef.current.setRotationFromQuaternion(quat);
    }
  });

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={50.0} 
      position={[0, 0, 0]} 
      {...props} 
    />
  );
}

useGLTF.preload('/sentinel.glb');
export default SentinelModel;