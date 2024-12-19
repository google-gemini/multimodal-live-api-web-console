import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface AvatarProps {
  url: string;
  volume: number; // Volume value passed from SidePanel
}

const Avatar: React.FC<AvatarProps> = ({ url, volume }) => {
  const { scene } = useGLTF(url); // Load 3D model
  const avatarMeshRef = useRef<THREE.Mesh | null>(null);
  const blinkTimerRef = useRef<number>(0); // Timer for random blink animation

  useEffect(() => {
    if (scene) {
      const avatarMesh = scene.getObjectByName("Wolf3D_Avatar") as THREE.Mesh;
      avatarMeshRef.current = avatarMesh || null;

      // Debugging: Log morph target dictionary for controlling eyes and mouth
      console.log("Morph Target Dictionary:", avatarMesh?.morphTargetDictionary);
    }
  }, [scene]);

  useFrame((_, delta) => {
    if (
      avatarMeshRef.current &&
      avatarMeshRef.current.morphTargetInfluences &&
      avatarMeshRef.current.morphTargetDictionary
    ) {
      const { morphTargetInfluences, morphTargetDictionary } = avatarMeshRef.current;

      // Control mouth movement based on volume
      const jawOpenIndex = morphTargetDictionary["jawOpen"];
      if (jawOpenIndex !== undefined) {
        morphTargetInfluences[jawOpenIndex] = volume; // Adjust mouth movement with volume
      }

      // Random blink animation
      const blinkLeftIndex = morphTargetDictionary["blinkLeft"];
      const blinkRightIndex = morphTargetDictionary["blinkRight"];
      if (blinkLeftIndex !== undefined && blinkRightIndex !== undefined) {
        blinkTimerRef.current += delta;

        // Trigger blink randomly after a certain interval
        if (blinkTimerRef.current > Math.random() * 4 + 1) {
          morphTargetInfluences[blinkLeftIndex] = 1; // Close left eye
          morphTargetInfluences[blinkRightIndex] = 1; // Close right eye

          setTimeout(() => {
            morphTargetInfluences[blinkLeftIndex] = 0; // Open left eye
            morphTargetInfluences[blinkRightIndex] = 0; // Open right eye
          }, 150); // Blink duration: 150ms

          blinkTimerRef.current = 0; // Reset blink timer
        }
      }
    }
  });

  return <primitive object={scene} position={[0, -1.5, 0]} />;
};

export default Avatar;
