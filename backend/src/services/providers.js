'use strict';
const config = require('../config');
const { randomToken, hmacHex } = require('../utils/crypto');

// Interface d'un fournisseur de paiement :
//   createCheckout({ reference, amount, currency }) -> { checkoutUrl }
//   verify(reference) -> { status: 'succeeded'|'failed'|'pending', amount }   (appel serveur-à-serveur : on ne fait jamais confiance au webhook seul)
//   verifySignature(rawBody, signatureHeader) -> boolean
// Pour brancher FedaPay, KKiaPay, CinetPay, etc. : ajouter un objet respectant cette interface dans `providers`.

const mockState = new Map(); // reference -> { status, amount }  (développement uniquement)

const mock = {
  name: 'mock',
  async createCheckout({ reference, amount, currency }) {
    mockState.set(reference, { status: 'pending', amount });
    return { checkoutUrl: `${config.appUrl}/paiement-simule/${encodeURIComponent(reference)}?amount=${amount}&currency=${currency}` };
  },
  async verify(reference) {
    return mockState.get(reference) || { status: 'failed', amount: 0 };
  },
  setState(reference, status) {
    const cur = mockState.get(reference);
    if (cur) cur.status = status;
  },
  signature: (rawBody) => hmacHex(config.webhookSecret, rawBody),
  verifySignature(rawBody, sig) {
    const { safeEqual } = require('../utils/crypto');
    return !!sig && !!config.webhookSecret && safeEqual(hmacHex(config.webhookSecret, rawBody), sig);
  },
};

const providers = { mock };

function getProvider(name) {
  if (name === 'none' || !providers[name]) return null;
  return providers[name];
}

const newReference = () => `PAY-${randomToken(12)}`;

module.exports = { getProvider, newReference, mock };
