import { describe, it, expect } from 'vitest';
import { testEmailConnection, isEmailConfigured } from './_core/email';

const hasResendKey = !!process.env.RESEND_API_KEY;
const d = hasResendKey ? describe : describe.skip;

d('Email Service - Resend Connection', () => {
  it('should have Resend API Key configured', () => {
    expect(isEmailConfigured()).toBe(true);
  });

  it('should successfully connect to Resend API', async () => {
    const result = await testEmailConnection();
    if (!result.success) console.error('Resend Connection Error:', result.error);
    expect(result.success).toBe(true);
  }, 30000);
});
