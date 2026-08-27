import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { encrypt, decrypt } from '../utils/crypto';

const ISSUER = 'Pipelines Perez & Filho';

export const TotpService = {
  generateSecret(): string {
    return authenticator.generateSecret();
  },

  buildOtpauthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, ISSUER, secret);
  },

  buildQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  },

  verify(code: string, secret: string): boolean {
    try {
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  },

  encryptSecret: encrypt,
  decryptSecret: decrypt,
};
