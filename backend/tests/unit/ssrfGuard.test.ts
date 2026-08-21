import { assertPublicUrl } from '../../src/utils/ssrfGuard';

describe('ssrfGuard.assertPublicUrl', () => {
  it('aceita uma URL pública comum', async () => {
    await expect(assertPublicUrl('https://example.com/webhook')).resolves.toBeUndefined();
  });

  it('rejeita localhost', async () => {
    await expect(assertPublicUrl('http://localhost:3000')).rejects.toThrow();
  });

  it('rejeita loopback (127.0.0.1)', async () => {
    await expect(assertPublicUrl('http://127.0.0.1')).rejects.toThrow();
  });

  it('rejeita o endpoint de metadata de nuvem (169.254.169.254)', async () => {
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow();
  });

  it('rejeita rede privada (192.168.x.x)', async () => {
    await expect(assertPublicUrl('http://192.168.1.1')).rejects.toThrow();
  });

  it('rejeita rede privada (10.x.x.x)', async () => {
    await expect(assertPublicUrl('http://10.0.0.5')).rejects.toThrow();
  });

  it('rejeita loopback IPv6 (::1)', async () => {
    await expect(assertPublicUrl('http://[::1]')).rejects.toThrow();
  });

  it('rejeita protocolo não http/https', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow();
  });

  it('rejeita URL malformada', async () => {
    await expect(assertPublicUrl('não é uma url')).rejects.toThrow();
  });
});
