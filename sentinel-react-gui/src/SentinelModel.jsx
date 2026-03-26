import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function SentinelModel(props) {

  const { scene } = useGLTF('/sentinel.glb');
  
  const modelRef = useRef();

  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.1; 
    }
  });

  return (
    <primitive 
      ref={modelRef} // Prendemos a referência
      object={scene}   // O objeto 3D em si
      scale={1.5}      // Ajusta o tamanho se o robô for gigante ou minúsculo!
      position={[0, -1, 0]} // Sobe/desce o robô para centrar na câmara
      {...props}       // Passa outras propriedades (como sombras, etc.)
    />
  );
}

useGLTF.preload('/sentinel.glb');

export default SentinelModel;