import { DispatchFailedError } from '@domain/lead/errors/dispatch-failed.error';
import { WhatsAppDispatcher } from './whatsapp.dispatcher';

describe('WhatsAppDispatcher', () => {
  let openSpy: jest.SpiedFunction<typeof window.open>;

  beforeEach(() => {
    openSpy = jest.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('should produce wa.me URL with phone and encoded message', () => {
    const dispatcher = new WhatsAppDispatcher();

    const result = dispatcher.dispatch({
      phoneWhatsAppDigits: '5521999990001',
      message: { subject: null, body: 'Olá cliente' },
    });

    expect(result.url).toBe(`https://wa.me/5521999990001?text=${encodeURIComponent('Olá cliente')}`);
  });

  it('should URL-encode special chars in message', () => {
    const dispatcher = new WhatsAppDispatcher();
    const body = 'Olá & tudo bem? #promoção = 10%\n🚀';

    const result = dispatcher.dispatch({
      phoneWhatsAppDigits: '5521999990001',
      message: { subject: null, body },
    });

    expect(result.url).toContain(encodeURIComponent(body));
  });

  it('should call window.open with _blank', () => {
    const dispatcher = new WhatsAppDispatcher();

    const result = dispatcher.dispatch({
      phoneWhatsAppDigits: '5521999990001',
      message: { subject: null, body: 'Mensagem' },
    });

    expect(openSpy).toHaveBeenCalledWith(result.url, '_blank');
  });

  it('should truncate long body before encoding', () => {
    const dispatcher = new WhatsAppDispatcher();
    const body = 'a'.repeat(3600);

    const result = dispatcher.dispatch({
      phoneWhatsAppDigits: '5521999990001',
      message: { subject: null, body },
    });

    expect(decodeURIComponent(result.url.split('text=')[1] ?? '')).toHaveLength(3500);
  });

  it('should throw DispatchFailedError when window.open returns null', () => {
    openSpy.mockReturnValueOnce(null);
    const dispatcher = new WhatsAppDispatcher();

    expect(() =>
      dispatcher.dispatch({
        phoneWhatsAppDigits: '5521999990001',
        message: { subject: null, body: 'Mensagem' },
      }),
    ).toThrow(DispatchFailedError);
  });
});
