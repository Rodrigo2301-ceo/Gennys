"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
// Ambiente procedural (gerado localmente): dá o reflexo de "estúdio" no metal
// sem baixar HDR de CDN — a CSP do app (connect-src 'self') bloquearia.
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  type AtomEstado,
  type QualidadeConfig,
  VELOCIDADE_ORBITA,
  BRILHO_NUCLEO,
  COR_NUCLEO,
  COR_GLOW,
  COR_ANEL,
  COR_ERRO,
} from "./atomConfig";

// Arranjo clássico do símbolo de átomo (referência): três órbitas do MESMO
// raio, inclinadas quase de perfil e distribuídas em leque (0°/120°/240°).
// `leque` gira no plano da tela (grupo externo); o tilt de perfil é aplicado
// num grupo interno — a ordem importa, senão os anéis colapsam numa elipse só.
// `fase` é a posição inicial do elétron na órbita (defasadas entre si).
const TILT_X = 1.15;
const RINGS = [
  { leque: 0, R: 1.6, mult: 1.0, fase: 0.6, tube: 0.026 },
  { leque: (2 * Math.PI) / 3, R: 1.6, mult: -0.8, fase: 2.7, tube: 0.026 },
  { leque: (-2 * Math.PI) / 3, R: 1.6, mult: 1.25, fase: 4.4, tube: 0.026 },
];


// Textura radial (branco -> transparente) para o halo aditivo (glow).
function useHaloTexture(): THREE.Texture {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

export default function AtomScene({
  estado,
  corModulo,
  qualidade,
  reduzMov = false,
}: {
  estado: AtomEstado;
  corModulo: string;
  qualidade: QualidadeConfig;
  reduzMov?: boolean;
}) {
  const tiltRef = useRef<THREE.Group>(null!);
  const spinRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);
  const coreMatRef = useRef<THREE.MeshPhysicalMaterial>(null!);
  const haloRef = useRef<THREE.Sprite>(null!);
  const haloMatRef = useRef<THREE.SpriteMaterial>(null!);
  const ringSpins = useRef<THREE.Group[]>([]);
  const particlesRef = useRef<THREE.Points>(null!);

  const halo = useHaloTexture();

  // Environment map procedural: reflexo metal/vidro de estúdio, offline.
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    return () => {
      scene.environment = null;
      env.texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  // Cores base como THREE.Color (evita realocar por frame).
  const cores = useMemo(
    () => ({
      nucleo: new THREE.Color(COR_NUCLEO),
      glow: new THREE.Color(COR_GLOW),
      erro: new THREE.Color(COR_ERRO),
      modulo: new THREE.Color(corModulo),
      prata: new THREE.Color("#dbe6ff"), // superfície cromada do núcleo
      tmpCore: new THREE.Color(),
      tmpHalo: new THREE.Color(),
    }),
    [corModulo],
  );

  // Partículas (efeito "foto recebida"): posições externas -> centro.
  const particulas = useMemo(() => {
    const n = qualidade.particulas;
    const outer = new Float32Array(n * 3);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 2.4 + Math.random() * 0.6;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      outer.set([x, y, z], i * 3);
      pos.set([x, y, z], i * 3);
    }
    return { n, outer, pos };
  }, [qualidade.particulas]);

  // Valores suavizados (lerp) entre frames.
  const suav = useRef({ orbita: VELOCIDADE_ORBITA.idle, brilho: 1 });

  // Marcadores de tempo dos efeitos transitórios.
  const fx = useRef({ successAt: -1, errorAt: -1, photoAt: -1 });

  useEffect(() => {
    const agora = performance.now();
    if (estado === "success") fx.current.successAt = agora;
    if (estado === "error") fx.current.errorAt = agora;
    if (estado === "photo") fx.current.photoAt = agora;
  }, [estado, corModulo]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05); // trava passos grandes (aba volta ao foco)
    const now = performance.now();

    // Parallax sutil ao ponteiro/toque (desligado em "reduzir movimento").
    if (tiltRef.current && !reduzMov) {
      const px = state.pointer.x;
      const py = state.pointer.y;
      tiltRef.current.rotation.x +=
        (-py * 0.22 - tiltRef.current.rotation.x) * 0.05;
      tiltRef.current.rotation.y +=
        (px * 0.3 - tiltRef.current.rotation.y) * 0.05;
    }

    // Rotação global bem lenta (tombamento 3D sutil; some em reduzir-movimento).
    if (spinRef.current && !reduzMov) {
      spinRef.current.rotation.y += dt * 0.06;
    }

    // Suaviza órbita e brilho rumo aos alvos do estado.
    const alvoOrbita = VELOCIDADE_ORBITA[estado];
    const alvoBrilho = BRILHO_NUCLEO[estado];
    suav.current.orbita += (alvoOrbita - suav.current.orbita) * 0.06;
    suav.current.brilho += (alvoBrilho - suav.current.brilho) * 0.08;

    // Motor central: cada elétron viaja pela SUA órbita (giro em z do grupo,
    // que carrega o elétron sobre o torus — nunca sai da linha). É a única
    // animação mantida em "reduzir movimento", num ritmo mais calmo.
    const fatorMov = reduzMov ? 0.4 : 1;
    for (let i = 0; i < ringSpins.current.length; i++) {
      const g = ringSpins.current[i];
      if (g) g.rotation.z += dt * suav.current.orbita * RINGS[i].mult * fatorMov;
    }

    // Núcleo: respiração + pulso proporcional à órbita (estático se reduzMov).
    const resp = reduzMov ? 0 : 1;
    const pulso = 0.03 + (suav.current.orbita / VELOCIDADE_ORBITA.processing) * 0.06;
    const escalaBase =
      1 + (Math.sin(t * 1.4) * 0.03 + Math.sin(t * 8) * pulso * 0.4) * resp;

    // Cores default; sobrescritas pelos transitórios abaixo.
    cores.tmpCore.copy(cores.nucleo);
    cores.tmpHalo.copy(cores.glow);
    let haloEscala = 2.8 + Math.sin(t * 1.4) * 0.15 * resp;
    let haloOpacidade = 0.48 + (suav.current.brilho - 1) * 0.25;
    let emissivo = suav.current.brilho + Math.sin(t * 2.2) * 0.06;
    let shakeX = 0;
    let escalaNucleo = escalaBase;

    // Sucesso: pulso de expansão + flash na cor do módulo.
    if (fx.current.successAt >= 0) {
      const e = now - fx.current.successAt;
      if (e <= 1100) {
        const p = e / 1100;
        const onda = Math.sin(p * Math.PI); // 0 -> 1 -> 0
        haloEscala += onda * 1.6;
        haloOpacidade += onda * 0.4;
        emissivo += onda * 0.8;
        escalaNucleo += onda * 0.12;
        cores.tmpCore.lerp(cores.modulo, onda);
        cores.tmpHalo.lerp(cores.modulo, onda);
      } else {
        fx.current.successAt = -1;
      }
    }

    // Erro/dúvida: tremor curto + glow vermelho/laranja.
    if (fx.current.errorAt >= 0) {
      const e = now - fx.current.errorAt;
      if (e <= 1000) {
        const p = e / 1000;
        const decay = 1 - p;
        shakeX = Math.sin(e * 0.045) * 0.08 * decay;
        cores.tmpCore.lerp(cores.erro, decay);
        cores.tmpHalo.lerp(cores.erro, decay);
        haloOpacidade += decay * 0.2;
      } else {
        fx.current.errorAt = -1;
      }
    }

    // Foto recebida: partículas convergem da borda para o núcleo.
    if (particlesRef.current) {
      if (fx.current.photoAt >= 0) {
        const e = now - fx.current.photoAt;
        if (e <= 1300) {
          const p = e / 1300;
          const ease = 1 - Math.pow(1 - p, 3);
          const arr = particulas.pos;
          const out = particulas.outer;
          for (let i = 0; i < particulas.n * 3; i++) {
            arr[i] = out[i] * (1 - ease);
          }
          const geo = particlesRef.current.geometry;
          (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
            true;
          particlesRef.current.visible = true;
          const mat = particlesRef.current.material as THREE.PointsMaterial;
          mat.opacity = 0.9 * (1 - p);
        } else {
          fx.current.photoAt = -1;
          particlesRef.current.visible = false;
        }
      } else {
        particlesRef.current.visible = false;
      }
    }

    // Aplica.
    if (spinRef.current) spinRef.current.position.x = shakeX;
    if (coreRef.current) coreRef.current.scale.setScalar(escalaNucleo);
    if (coreMatRef.current) {
      // Cromado em idle (emissivo quase zero, reflexo domina); os estados
      // reativos continuam acendendo o núcleo por cima do metal.
      coreMatRef.current.emissiveIntensity =
        0.16 + Math.max(0, emissivo - 1) * 1.25;
      coreMatRef.current.emissive.copy(cores.tmpCore);
      coreMatRef.current.color.copy(cores.tmpCore).lerp(cores.prata, 0.7);
    }
    if (haloRef.current) haloRef.current.scale.setScalar(haloEscala);
    if (haloMatRef.current) {
      haloMatRef.current.opacity = haloOpacidade;
      haloMatRef.current.color.copy(cores.tmpHalo);
    }
  });

  return (
    <group ref={tiltRef}>
      <ambientLight intensity={0.3} />
      {/* Key light: dá o highlight especular "cromado" no núcleo */}
      <directionalLight position={[3, 4, 5]} intensity={0.9} color="#ffffff" />
      {/* Rim light azul-clara: contorno de vidro no lado oposto */}
      <pointLight position={[-3, -1.5, 3]} intensity={0.45} color="#93c5fd" />
      <group ref={spinRef}>
        {/* Halo (glow aditivo, tipo bloom mesmo sem pós-processamento) */}
        <sprite ref={haloRef} scale={2.6}>
          <spriteMaterial
            ref={haloMatRef}
            map={halo}
            color={COR_GLOW}
            transparent
            opacity={0.42}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>

        {/* Núcleo: esfera metal/vidro com reflexo de estúdio (envMap) */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.62, 3]} />
          <meshPhysicalMaterial
            ref={coreMatRef}
            color={COR_NUCLEO}
            emissive={COR_NUCLEO}
            emissiveIntensity={0.16}
            roughness={0.14}
            metalness={0.85}
            clearcoat={1}
            envMapIntensity={1.1}
          />
        </mesh>

        {/* Casca luminosa translúcida */}
        <mesh scale={0.85}>
          <sphereGeometry args={[1, qualidade.segmentosNucleo, qualidade.segmentosNucleo]} />
          <meshBasicMaterial
            color={COR_GLOW}
            transparent
            opacity={0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Órbitas cromadas + 1 elétron por anel (viaja com o giro do grupo).
            Fora→dentro: leque (plano da tela) · tilt de perfil fixo · giro do
            elétron. O elétron é filho do giro, logo nunca sai da sua linha. */}
        {RINGS.map((ring, i) => (
          <group key={i} rotation={[0, 0, ring.leque]}>
            <group rotation={[TILT_X, 0, 0]}>
            <group
              ref={(el) => {
                if (el) ringSpins.current[i] = el;
              }}
            >
              {/* trilha da órbita: metal fino com reflexo */}
              <mesh>
                <torusGeometry
                  args={[
                    ring.R,
                    ring.tube,
                    qualidade.segmentosTorus[1],
                    qualidade.segmentosTorus[0],
                  ]}
                />
                <meshPhysicalMaterial
                  color={COR_ANEL}
                  metalness={0.9}
                  roughness={0.18}
                  clearcoat={1}
                  envMapIntensity={1.3}
                />
              </mesh>
              {/* elétron: esfera cromada sobre a órbita */}
              <mesh
                position={[
                  Math.cos(ring.fase) * ring.R,
                  Math.sin(ring.fase) * ring.R,
                  0,
                ]}
              >
                <sphereGeometry args={[0.11, 20, 20]} />
                <meshPhysicalMaterial
                  color="#e6eefc"
                  metalness={0.75}
                  roughness={0.12}
                  clearcoat={1}
                  envMapIntensity={1.2}
                />
              </mesh>
            </group>
            </group>
          </group>
        ))}

        {/* Partículas do efeito "foto recebida" */}
        <points ref={particlesRef} visible={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particulas.pos, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color={COR_GLOW}
            size={0.08}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </group>
    </group>
  );
}
