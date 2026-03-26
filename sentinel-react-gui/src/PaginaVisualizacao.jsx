import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import SentinelModel from './SentinelModel';

function PaginaVisualizacao({ ros }) {


  return (
    <div className="card" style={{ width: '90%', height: '70vh', margin: '0 auto', overflow: 'hidden' }}>
      <h2>Visualização 3D Sentinel</h2>
      

      <Canvas 
        camera={{ position: [5, 2, 5], fov: 50 }} // Posição inicial da câmara
        shadows // Ativar sombras se o teu modelo as suportar
      >
        
        <ambientLight intensity={0.5} /> 
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        
        <Environment preset="city" /> 

        <Suspense fallback={<mesh><boxGeometry /><meshStandardMaterial color="gray" /></mesh>}>
          <SentinelModel />
        </Suspense>

        <ContactShadows 
          position={[0, -1, 0]} 
          opacity={0.6} 
          scale={10} 
          blur={2.5} 
          far={1} 
        />

        <OrbitControls 
          enableZoom={true} 
          enablePan={true} 
          minDistance={2} // Zoom máximo
          maxDistance={15} // Zoom mínimo
        />
        
      </Canvas>
    </div>
  );
}

export default PaginaVisualizacao;