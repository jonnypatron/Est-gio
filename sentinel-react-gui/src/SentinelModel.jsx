import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function SentinelModel({ rotationQuat, ...props }) {
  const { scene } = useGLTF('/sentinel.glb'); 
  const modelRef = useRef();

  useEffect(() => {
    if (modelRef.current && rotationQuat) {

      const quat = new THREE.Quaternion(
        rotationQuat.x,
        rotationQuat.z,   
        -rotationQuat.y,  
        rotationQuat.w
      );
      modelRef.current.setRotationFromQuaternion(quat);
    }
  }, [rotationQuat]);

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