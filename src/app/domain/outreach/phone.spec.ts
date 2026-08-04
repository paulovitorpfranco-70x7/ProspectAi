import { buildWhatsappUrl, normalizeBrazilianPhone } from './phone';

describe('normalizeBrazilianPhone', () => {
  it.each([
    '(21) 99999-8888',
    '+55 21 99999-8888',
    '55 21 99999-8888',
    '21999998888',
    '21 9 9999-8888',
    '(21) 9999-8888',
  ])('should normalize %s to the same Brazilian mobile number', (raw) => {
    expect(normalizeBrazilianPhone(raw)).toBe('5521999998888');
  });

  it.each(['', 'abc', '123', '(21) 9999'])('should return null for invalid value %s', (raw) => {
    expect(normalizeBrazilianPhone(raw)).toBeNull();
  });
});

describe('buildWhatsappUrl', () => {
  it('should encode line breaks and emoji in the message', () => {
    const message = 'Olá!\nTudo certo? 👍';

    expect(buildWhatsappUrl('(21) 99999-8888', message)).toBe(
      `https://wa.me/5521999998888?text=${encodeURIComponent(message)}`,
    );
  });

  it('should return null when the phone is invalid', () => {
    expect(buildWhatsappUrl('abc', 'Mensagem')).toBeNull();
  });
});
