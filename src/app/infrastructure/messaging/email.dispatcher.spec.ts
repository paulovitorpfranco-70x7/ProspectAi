import { DispatchFailedError } from '@domain/lead/errors/dispatch-failed.error';
import { EmailDispatcher } from './email.dispatcher';

function getQuery(url: string): URLSearchParams {
  const query = url.split('?')[1] ?? '';
  return new URLSearchParams(query);
}

describe('EmailDispatcher', () => {
  let openSpy: jest.SpiedFunction<typeof window.open>;

  beforeEach(() => {
    openSpy = jest.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('should produce mailto URL with to, subject and body', () => {
    const dispatcher = new EmailDispatcher();

    const result = dispatcher.dispatch({
      to: 'contato@acme.com',
      message: { subject: 'Proposta', body: 'Olá cliente' },
    });

    expect(result.url.startsWith('mailto:contato@acme.com?')).toBe(true);
    expect(getQuery(result.url).get('subject')).toBe('Proposta');
    expect(getQuery(result.url).get('body')).toBe('Olá cliente');
  });

  it('should URL-encode special chars in subject and body', () => {
    const dispatcher = new EmailDispatcher();
    const subject = 'Olá & proposta? #1';
    const body = 'Linha 1\nPreço = R$ 10 & prazo? 🚀';

    const result = dispatcher.dispatch({
      to: 'contato@acme.com',
      message: { subject, body },
    });

    expect(result.url).toContain(encodeURIComponent(subject).replace(/%20/g, '+'));
    expect(result.url).toContain(encodeURIComponent(body).replace(/%20/g, '+'));
  });

  it('should handle null subject by omitting it from query string', () => {
    const dispatcher = new EmailDispatcher();

    const result = dispatcher.dispatch({
      to: 'contato@acme.com',
      message: { subject: null, body: 'Olá cliente' },
    });

    expect(getQuery(result.url).has('subject')).toBe(false);
    expect(getQuery(result.url).get('body')).toBe('Olá cliente');
  });

  it('should call window.open with _blank', () => {
    const dispatcher = new EmailDispatcher();

    const result = dispatcher.dispatch({
      to: 'contato@acme.com',
      message: { subject: 'Proposta', body: 'Olá cliente' },
    });

    expect(openSpy).toHaveBeenCalledWith(result.url, '_blank');
  });

  it('should truncate long body before encoding', () => {
    const dispatcher = new EmailDispatcher();
    const body = 'a'.repeat(1900);

    const result = dispatcher.dispatch({
      to: 'contato@acme.com',
      message: { subject: 'Proposta', body },
    });

    expect(getQuery(result.url).get('body')).toHaveLength(1800);
  });

  it('should throw DispatchFailedError when window.open returns null', () => {
    openSpy.mockReturnValueOnce(null);
    const dispatcher = new EmailDispatcher();

    expect(() =>
      dispatcher.dispatch({
        to: 'contato@acme.com',
        message: { subject: 'Proposta', body: 'Olá cliente' },
      }),
    ).toThrow(DispatchFailedError);
  });
});
