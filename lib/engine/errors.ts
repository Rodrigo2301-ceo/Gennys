export class EntradaInvalidaError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413 = 400,
  ) {
    super(message);
    this.name = "EntradaInvalidaError";
  }
}

export class SaidaIaInvalidaError extends Error {
  constructor() {
    super("Saida do provedor invalida.");
    this.name = "SaidaIaInvalidaError";
  }
}

export class ProvedorIaError extends Error {
  constructor(
    public readonly codigo:
      | "provedor_indisponivel"
      | "provedor_incompativel"
      | "falha_provedor",
  ) {
    super("O provedor de IA nao esta disponivel agora.");
    this.name = "ProvedorIaError";
  }
}

export class ConfirmacaoInvalidaError extends Error {
  constructor() {
    super("Confirmacao invalida ou expirada.");
    this.name = "ConfirmacaoInvalidaError";
  }
}

export class ConfiguracaoConfirmacaoError extends Error {
  constructor() {
    super("Confirmacao indisponivel.");
    this.name = "ConfiguracaoConfirmacaoError";
  }
}
