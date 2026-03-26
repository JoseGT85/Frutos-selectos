// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — lee variables de entorno con defaults seguros
// ─────────────────────────────────────────────────────────────────────────────
const config = {
  // API
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || '',

  // WhatsApp
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '5491112345678',

  // Pricing
  defaultMargin: Number(import.meta.env.VITE_MARGIN_DEFAULT) || 30,

  // Business
  businessName: import.meta.env.VITE_BUSINESS_NAME || 'Frutos Selectos',
  businessCity: import.meta.env.VITE_BUSINESS_CITY || 'Buenos Aires',

  // Automation
  automationWebhookUrl: import.meta.env.VITE_AUTOMATION_WEBHOOK_URL || '',
  automationApiKey: import.meta.env.VITE_AUTOMATION_API_KEY || '',
};

export default config;
