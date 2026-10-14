import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

const DRAWER_NAMES = [
  'metal_office_desk_drawer_01',
  'metal_office_desk_drawer_02',
  'metal_office_desk_drawer_03',
  'metal_office_desk_drawer_04',
  'metal_office_desk_drawer_05',
  'metal_office_desk_drawer_06',
];

const OPEN_DISTANCE = 0.42;
const ANIMATION_SPEED = 4;

function DeskModel({ onDrawersReady, drawerStatesRef }) {
  const groupRef = useRef();
  const drawerRefs = useRef({});
  const drawerStates = drawerStatesRef || useRef(new Map());
  const [ready, setReady] = useState(false);
  const { camera, raycaster, mouse, gl } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  const gltf = useLoader(GLTFLoader, '/models/metal_office_desk_4k.gltf/metal_office_desk_4k.gltf');

  useEffect(() => {
    if (!gltf || !groupRef.current) return;

    const model = gltf.scene;
    groupRef.current.add(model);

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    DRAWER_NAMES.forEach((name) => {
      const drawer = model.getObjectByName(name);
      if (drawer) {
        drawerRefs.current[name] = drawer;
        const closedPos = drawer.position.clone();
        const direction = new THREE.Vector3(0, 0, 1);
        const openPos = closedPos.clone().addScaledVector(direction, OPEN_DISTANCE);

        const state = {
          isOpen: false,
          closedPos,
          openPos,
          targetPos: null,
        };
        drawerStates.current.set(drawer, state);
        if (drawerStatesRef) {
          drawerStatesRef.current.set(drawer, state);
        }
      }
    });

    setReady(true);
    onDrawersReady?.(Object.keys(drawerRefs.current));
  }, [gltf, onDrawersReady, drawerStatesRef]);

  const toggleDrawer = (drawer) => {
    const state = drawerStates.current.get(drawer);
    if (!state) return;
    state.isOpen = !state.isOpen;
    state.targetPos = state.isOpen ? state.openPos : state.closedPos;
  };

  useFrame((_, delta) => {
    drawerStates.current.forEach((state, drawer) => {
      if (!state.targetPos) return;
      const current = drawer.position;
      const target = state.targetPos;
      const distance = current.distanceTo(target);
      if (distance > 0.001) {
        const step = ANIMATION_SPEED * delta;
        current.lerp(target, Math.min(step / distance, 1));
      } else {
        current.copy(target);
        state.targetPos = null;
      }
    });
  });

  const handleClick = (event) => {
    const rect = event.target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const drawerMeshes = Object.values(drawerRefs.current);
    const intersects = raycaster.intersectObjects(drawerMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      let drawer = hitMesh;
      while (drawer.parent && !drawerStates.current.has(drawer)) {
        drawer = drawer.parent;
      }
      if (drawerStates.current.has(drawer)) {
        toggleDrawer(drawer);
      }
    }
  };

  return (
    <group ref={groupRef} onPointerDown={handleClick}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={gltf?.scene} dispose={null} />
      </group>
    </group>
  );
}

function DrawerHints({ drawerNames, drawerStates }) {
  const states = useRef(new Map());
  
  useEffect(() => {
    if (!drawerStates) return;
    const interval = setInterval(() => {
      drawerStates.forEach((state, drawer) => {
        const el = states.current.get(drawer.name);
        if (el) {
          el.classList.toggle('active', state.isOpen);
        }
      });
    }, 100);
    return () => clearInterval(interval);
  }, [drawerStates]);

  return (
    <Html
      wrapperClass="drawer-hints"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {drawerNames.map((name, i) => (
        <div
          key={name}
          ref={(el) => { if (el) states.current.set(name, el); }}
          className="hint"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: '0.75rem',
            color: '#aaa',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
        >
          {name.replace('metal_office_desk_', '').replace('_', ' ')}
        </div>
      ))}
    </Html>
  );
}

export function DeskScene() {
  const [drawerNames, setDrawerNames] = useState([]);
  const drawerStatesRef = useRef(new Map());

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key) - 1;
        const name = DRAWER_NAMES[index];
        const drawer = Array.from(drawerStatesRef.current.keys()).find(d => d.name === name);
        if (drawer) {
          const state = drawerStatesRef.current.get(drawer);
          if (state) {
            state.isOpen = !state.isOpen;
            state.targetPos = state.isOpen ? state.openPos : state.closedPos;
          }
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        drawerStatesRef.current.forEach((state) => {
          state.isOpen = !state.isOpen;
          state.targetPos = state.isOpen ? state.openPos : state.closedPos;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Canvas
      camera={{ position: [2.5, 1.5, 3], fov: 45 }}
      style={{ touchAction: 'none' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x1a1a2e, 1);
      }}
    >
      <color attach="background" args={['#1a1a2e']} />
      
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[3, 5, 2]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#4488ff" />
      <directionalLight position={[0, -2, -4]} intensity={0.4} color="#ffcc88" />

      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[20, 20]} />
        <shadowMaterial opacity={0.15} />
      </mesh>

      <DeskModel onDrawersReady={setDrawerNames} drawerStatesRef={drawerStatesRef} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        target={[0, 0.7, 0]}
        minDistance={1.5}
        maxDistance={8}
      />

      <Environment preset="city" background={false} />

      {drawerNames.length > 0 && <DrawerHints drawerNames={drawerNames} drawerStates={drawerStatesRef.current} />}
    </Canvas>
  );
}

export default DeskScene;