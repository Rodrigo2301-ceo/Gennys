// Configuração do átomo: estados reativos e parâmetros de qualidade.
// Sem three/react aqui — só dados.

export type AtomEstado =
  | "idle" // rotação lenta + respiração no glow
  | "typing" // elétrons aceleram levemente
  | "processing" // órbitas aceleram forte, núcleo pulsa e brilha
  | "success" // pulso de expansão + flash na cor do módulo
  | "error" // tremor curto + glow vermelho/laranja
  | "photo"; // partículas convergem da borda para o núcleo

// Duração dos estados transitórios (ms), depois voltam para idle.
export const DURACAO_TRANSITORIA: Record<string, number> = {
  success: 1100,
  error: 1000,
  photo: 1300,
};

// Velocidade-alvo das órbitas por estado (rad/s), suavizada com lerp.
export const VELOCIDADE_ORBITA: Record<AtomEstado, number> = {
  idle: 0.35,
  typing: 0.7,
  processing: 2.4,
  success: 1.2,
  error: 0.5,
  photo: 0.5,
};

// Intensidade emissiva-alvo do núcleo por estado.
export const BRILHO_NUCLEO: Record<AtomEstado, number> = {
  idle: 1.0,
  typing: 1.15,
  processing: 1.9,
  success: 1.6,
  error: 1.3,
  photo: 1.4,
};

export interface QualidadeConfig {
  bloom: boolean;
  segmentosNucleo: number;
  segmentosTorus: [number, number];
  particulas: number;
  dpr: [number, number];
}

export const QUALIDADE_ALTA: QualidadeConfig = {
  bloom: true,
  segmentosNucleo: 48,
  segmentosTorus: [64, 20],
  particulas: 90,
  dpr: [1, 2],
};

export const QUALIDADE_BAIXA: QualidadeConfig = {
  bloom: false,
  segmentosNucleo: 24,
  segmentosTorus: [40, 10],
  particulas: 40,
  dpr: [1, 1.4],
};

// Cores base do átomo (azul royal + brilhos).
export const COR_NUCLEO = "#2563eb";
export const COR_GLOW = "#67e8f9";
export const COR_ANEL = "#93c5fd";
export const COR_ERRO = "#f97316"; // laranja/vermelho para erro/dúvida
