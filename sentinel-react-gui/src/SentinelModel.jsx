import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// AGORA RECEBE TAMBÉM O positionRef
function SentinelModel({ rotationQuatRef, positionRef, isGhost = false, ...props }) {
  const { scene } = useGLTF('/sentinel.glb'); 
  const modelRef = useRef();
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    if (isGhost) {
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: '#00d66b',        
            wireframe: true,         
            transparent: true,
            opacity: 0.15,           /* MUITO mais transparente (era 0.3) */
            emissive: '#00d66b',     
            emissiveIntensity: 0.4,  /* Brilho menos agressivo */
            depthWrite: false        /* MAGIA: Não recorta o robô sólido! */
          });
        }
      });
    }
  }, [clonedScene, isGhost]);

  useFrame(() => {
    if (modelRef.current) {
      // 1. APLICAR ROTAÇÃO
      if (rotationQuatRef && rotationQuatRef.current) {
        const q = rotationQuatRef.current;
        const quat = new THREE.Quaternion(q.x, q.z, -q.y, q.w);
        modelRef.current.setRotationFromQuaternion(quat);
      }

      // 2. APLICAR POSIÇÃO (Movimento no plano 3D)
      if (positionRef && positionRef.current) {
        const p = positionRef.current;
        // O mesmo mapeamento de eixos da rotação!
        // ROS(X,Y,Z) -> Three(X, Z, -Y)
        modelRef.current.position.set(p.x, p.z, -p.y);
      }
    }
  });

  return (
    <primitive 
      ref={modelRef}
      object={clonedScene} 
      scale={50.0} 
      {...props} 
    />
  );
}

useGLTF.preload('/sentinel.glb');
export default SentinelModel;