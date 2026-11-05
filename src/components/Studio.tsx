/**
 * Estúdio virtual: luzes (key, rims, sweep, top, fill), ambiente refletivo para os metais,
 * piso espelhado com desfoque, fundo com brilho radial, poeira iluminada e fade global.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { rig, SpotState } from '../engine/rig';
import { fx } from '../engine/fx';
import { clock } from '../engine/clock';
import { rng } from '../motion/sequencing';
import { quality as Q } from '../engine/quality';

function Spot({ s }: { s: () => SpotState }) {
  const light = useRef<THREE.SpotLight>(null!);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const st = s();
    light.current.position.set(...st.pos);
    target.position.set(...st.target);
    target.updateMatrixWorld();
    light.current.intensity = st.intensity;
    light.current.color.set(st.color);
    light.current.angle = st.angle;
    light.current.penumbra = st.penumbra;
    light.current.visible = st.intensity > 0.001;
  }, -2);
  return (
    <>
      <spotLight ref={light} target={target} decay={1.6} distance={0} />
      <primitive object={target} />
    </>
  );
}

function Backdrop() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uBg: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uAmt: { value: 0 }, uDir: { value: new THREE.Vector3(0, 0, -1) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uBg; uniform vec3 uGlow; uniform float uAmt; uniform vec3 uDir; varying vec3 vDir;
      void main(){ float d = max(dot(normalize(vDir), normalize(uDir)), 0.0); float g = pow(d, 6.0) * uAmt;
      gl_FragColor = vec4(uBg + uGlow * g, 1.0); }`,
  }), []);
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ camera }) => {
    ref.current.position.copy(camera.position);
    mat.uniforms.uBg.value.set(rig.bg);
    mat.uniforms.uGlow.value.set(rig.glowColor);
    mat.uniforms.uAmt.value = rig.glow;
    mat.uniforms.uDir.value.set(...rig.glowPos).sub(camera.position).normalize();
  });
  return <mesh ref={ref} material={mat} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[60, 32, 16]} /></mesh>;
}

function Floor() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    ref.current.visible = rig.floor > 0.01;
    ref.current.position.y = rig.floorY;
    const m = ref.current.material as any;
    m.mixStrength = 3.2 * rig.floor;
    m.color.setScalar(0.02 * rig.floor);
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[60, 60]} />
      {Q.reflect > 0 ? <MeshReflectorMaterial
        resolution={Q.reflect} blur={[420, 120]} mixBlur={1} mixStrength={3.2} mirror={0.6} roughness={0.85} depthScale={1.1}
        minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#050608" metalness={0.6}
      /> : <meshStandardMaterial color="#050608" metalness={0.6} roughness={0.35} />}
    </mesh>
  );
}

const DUST_N = 900;
function Dust() {
  const { geo, mat } = useMemo(() => {
    const r = rng(77);
    const pos = new Float32Array(DUST_N * 3), seed = new Float32Array(DUST_N * 4);
    for (let i = 0; i < DUST_N; i++) {
      pos.set([(r() - 0.5) * 9, r() * 4.5, (r() - 0.5) * 9], i * 3);
      seed.set([r(), r(), r(), 0.3 + r() * 0.7], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAmt: { value: 0.6 }, uColor: { value: new THREE.Color('#ffe9c7') }, uPx: { value: 1 } },
      vertexShader: `attribute vec4 seed; uniform float uTime; uniform float uPx; varying float vA;
        void main(){
          vec3 p = position;
          float t = uTime * (0.05 + seed.x * 0.08);
          p.x += sin(t * 6.283 + seed.y * 20.0) * 0.35;
          p.y += mod(t * 0.6 + seed.z * 4.5, 4.5) - seed.z * 4.5 * 0.0;
          p.y = mod(p.y, 4.5);
          p.z += cos(t * 5.0 + seed.x * 30.0) * 0.35;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uPx * (2.0 + seed.w * 5.0) * (3.0 / -mv.z);
          vA = seed.w * (0.5 + 0.5 * sin(uTime * (0.6 + seed.y) + seed.x * 40.0));
        }`,
      fragmentShader: `uniform float uAmt; uniform vec3 uColor; varying float vA;
        void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor * a * vA * uAmt, 1.0); }`,
    });
    return { geo: g, mat: m };
  }, []);
  const { size } = useThree();
  useFrame(() => {
    mat.uniforms.uTime.value = clock.t;
    mat.uniforms.uAmt.value = rig.dust;
    mat.uniforms.uColor.value.set(rig.dustColor);
    mat.uniforms.uPx.value = size.height / 960;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

function Fill() {
  const ref = useRef<THREE.HemisphereLight>(null!);
  useFrame(({ scene, gl }) => {
    ref.current.intensity = rig.fill;
    ref.current.color.set(rig.fillColor);
    scene.environmentIntensity = fx.envIntensity;
    gl.toneMappingExposure = fx.exposure;
  });
  return <hemisphereLight ref={ref} groundColor="#000000" />;
}

/** Fade-to-black global na frente da câmera. */
function FadePlane() {
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#000', transparent: true, depthTest: false, depthWrite: false }), []);
  useFrame(({ camera }) => {
    ref.current.position.copy(camera.position);
    ref.current.quaternion.copy(camera.quaternion);
    ref.current.translateZ(-0.2);
    mat.opacity = fx.fade;
    ref.current.visible = fx.fade > 0.001;
  });
  return <mesh ref={ref} material={mat} renderOrder={999}><planeGeometry args={[2, 2]} /></mesh>;
}

export function Studio() {
  return (
    <>
      <color attach="background" args={['#060709']} />
      <fog attach="fog" args={['#060709', 9, 26]} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={3.2} position={[-5, 1.5, 0]} rotation-y={Math.PI / 2} scale={[0.6, 6, 1]} color="#e9eeff" />
        <Lightformer form="rect" intensity={3.2} position={[5, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[0.6, 6, 1]} color="#e9eeff" />
        <Lightformer form="rect" intensity={1.1} position={[0, 1, 6]} scale={[8, 1.2, 1]} color="#fff3e2" />
        <Lightformer form="ring" intensity={1.6} position={[2.5, 3, -5]} scale={2} color="#ffe2b8" />
        <Lightformer form="rect" intensity={0.5} position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color="#20242c" />
      </Environment>
      <Backdrop />
      <Fill />
      <Spot s={() => rig.key} />
      <Spot s={() => rig.rimL} />
      <Spot s={() => rig.rimR} />
      <Spot s={() => rig.sweep} />
      <Spot s={() => rig.top} />
      <Floor />
      <Dust />
      <FadePlane />
    </>
  );
}
