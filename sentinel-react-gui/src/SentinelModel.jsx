import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/sentinel_leve.glb';

// Tamanho-alvo do robô em unidades de cena (1 unidade = 1 célula da grelha).
// O modelo é redimensionado automaticamente para caber neste tamanho,
// por isso já NÃO precisas de andar a calibrar o "scale" à mão.
const TARGET_SIZE = 2.2;

function SentinelModel({ rotationQuatRef, positionRef, isGhost = false, ...props }) {
  const { scene }   = useGLTF(MODEL_URL);
  const groupRef    = useRef();           // recebe a rotação/posição vinda do ROS
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // ── Auto-fit: centra na origem e normaliza o tamanho ────────────────────────
  // Calcula a bounding box do modelo (seja qual for o tamanho/origem do export
  // do Blender) para o centrar e dar-lhe sempre o mesmo tamanho visível.
  const { fitScale, center } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { fitScale: TARGET_SIZE / maxDim, center };
  }, [clonedScene]);

  // ── Objetos Three.js reutilizáveis (evita alocações por frame) ──────────────
  const _quat = useMemo(() => new THREE.Quaternion(), []);
  const _pos  = useMemo(() => new THREE.Vector3(),    []);

  useEffect(() => {
    if (isGhost) {
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color:            '#3a8f63',   // verde mais dessaturado (menos "néon")
            wireframe:        true,
            transparent:      true,
            opacity:          0.08,        // mais discreto que o twin sólido
            emissive:         '#2e7d5b',
            emissiveIntensity: 0.12,       // brilho muito mais baixo
            depthWrite:       false,
          });
        }
      });
    }
  }, [clonedScene, isGhost]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Rotação (sem alocar por frame). Mapeamento ROS(x,y,z,w) → Three(x,z,-y,w)
    if (rotationQuatRef?.current) {
      const q = rotationQuatRef.current;
      _quat.set(q.x, q.z, -q.y, q.w);
      groupRef.current.setRotationFromQuaternion(_quat);
    }

    // Posição (sem alocar por frame). Mapeamento ROS(x,y,z) → Three(x,z,-y)
    if (positionRef?.current) {
      const p = positionRef.current;
      _pos.set(p.x, p.z, -p.y);
      groupRef.current.position.copy(_pos);
    }
  });

  // Hierarquia:
  //   groupRef  → posição/rotação dinâmica do robô (em metros ROS)
  //     group   → escala de normalização (auto-fit)
  //       primitive → modelo, deslocado para ficar centrado na origem
  return (
    <group ref={groupRef} {...props}>
      <group scale={fitScale}>
        <primitive object={clonedScene} position={[-center.x, -center.y, -center.z]} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
export default SentinelModel;