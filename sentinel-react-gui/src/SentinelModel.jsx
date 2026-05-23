import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function SentinelModel({ rotationQuatRef, positionRef, isGhost = false, ...props }) {
  const { scene }      = useGLTF('/sentinel.glb');
  const modelRef       = useRef();
  const clonedScene    = useMemo(() => scene.clone(), [scene]);

  // ── Objetos Three.js reutilizáveis ─────────────────────────────────────────
  // useFrame corre a 60 Hz. Criar "new THREE.Quaternion()" e "new THREE.Vector3()"
  // em cada frame gera pressão desnecessária no GC (>3600 objetos/min descartados).
  // Alocamos uma vez e reutilizamos com set() / copy().
  const _quat = useMemo(() => new THREE.Quaternion(), []);
  const _pos  = useMemo(() => new THREE.Vector3(),    []);

  useEffect(() => {
    if (isGhost) {
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color:            '#00d66b',
            wireframe:        true,
            transparent:      true,
            opacity:          0.15,
            emissive:         '#00d66b',
            emissiveIntensity: 0.4,
            depthWrite:       false,   // não recorta o robô sólido
          });
        }
      });
    }
  }, [clonedScene, isGhost]);

  useFrame(() => {
    if (!modelRef.current) return;

    // Aplica rotação sem alocar um novo Quaternion por frame
    if (rotationQuatRef?.current) {
      const q = rotationQuatRef.current;
      // Mapeamento de eixos: ROS(x,y,z,w) → Three(x,z,-y,w)
      _quat.set(q.x, q.z, -q.y, q.w);
      modelRef.current.setRotationFromQuaternion(_quat);
    }

    // Aplica posição sem alocar um novo Vector3 por frame
    if (positionRef?.current) {
      const p = positionRef.current;
      // Mapeamento de eixos: ROS(x,y,z) → Three(x,z,-y)
      _pos.set(p.x, p.z, -p.y);
      modelRef.current.position.copy(_pos);
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