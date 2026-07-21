"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import AtomScene from "./AtomScene";
import {
  type AtomEstado,
  type QualidadeConfig,
  QUALIDADE_ALTA,
  QUALIDADE_BAIXA,
} from "./atomConfig";

function suportaWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

function detectarQualidade(): QualidadeConfig {
  const reduzir = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const nucleos = navigator.hardwareConcurrency ?? 4;
  // deviceMemory não é padrão em todos os navegadores.
  const memoria =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const fraco = reduzir || nucleos <= 4 || memoria <= 4;
  return fraco ? QUALIDADE_BAIXA : QUALIDADE_ALTA;
}

function BloomFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.85}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.35}
        mipmapBlur
        radius={0.7}
      />
    </EffectComposer>
  );
}

// Fallback estático (sem WebGL): um brilho em CSS, nunca a tela vazia.
function GlowFallback() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div
        className="h-40 w-40 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(103,232,249,0.7) 0%, rgba(37,99,235,0.4) 40%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />
    </div>
  );
}

export default function Atom3D({
  estado,
  corModulo,
}: {
  estado: AtomEstado;
  corModulo: string;
}) {
  const [montado, setMontado] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [qualidade, setQualidade] = useState<QualidadeConfig>(QUALIDADE_BAIXA);
  const [ativo, setAtivo] = useState(true); // pausa render em background
  const [reduzMov, setReduzMov] = useState(false); // "reduzir movimento" do SO

  useEffect(() => {
    setMontado(true);
    setWebgl(suportaWebGL());
    setQualidade(detectarQualidade());
    setReduzMov(
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    );

    const onVis = () => setAtivo(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!montado) {
    return <div className="absolute inset-0" />;
  }
  if (!webgl) {
    return <GlowFallback />;
  }

  return (
    <Canvas
      // style (não className): o r3f injeta position:relative inline no
      // wrapper, que venceria a classe e colapsaria o canvas para 150px.
      style={{ position: "absolute", inset: 0 }}
      dpr={qualidade.dpr}
      // Anima sempre que a aba está visível; "reduzir movimento" não congela
      // (a órbita é a essência do ícone), apenas acalma — tratado na cena.
      frameloop={ativo ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, -0.3, 8], fov: 50 }}
    >
      <AtomScene
        estado={estado}
        corModulo={corModulo}
        qualidade={qualidade}
        reduzMov={reduzMov}
      />
      {qualidade.bloom && <BloomFX />}
    </Canvas>
  );
}
