export interface RenderedMessage {
  /** Null para WhatsApp (wa.me nao suporta subject). */
  readonly subject: string | null;
  readonly body: string;
}

export interface WhatsAppDispatchInput {
  readonly phoneWhatsAppDigits: string;
  readonly message: RenderedMessage;
}

export interface EmailDispatchInput {
  readonly to: string;
  readonly message: RenderedMessage;
}

export interface DispatchResult {
  readonly url: string;
}

export interface ContactDispatcherService {
  /**
   * Dispara wa.me em nova aba. Operacao sincrona (apenas abre URL no browser).
   * Lanca DispatchFailedError se o ambiente nao suportar window.open.
   * Retorna { url } gerada para facilitar testes e logs.
   */
  dispatchWhatsApp(input: WhatsAppDispatchInput): DispatchResult;

  /** Dispara mailto:. Mesmas garantias do dispatchWhatsApp. */
  dispatchEmail(input: EmailDispatchInput): DispatchResult;
}
