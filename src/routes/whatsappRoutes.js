const express = require('express');
const router = express.Router();
const {
    createConnection,
    sendWhatsAppMessage,
    sendWhatsAppImage,
    sendWhatsAppAudio,
    sendWhatsAppDocument,
} = require('../controllers/whatsappController');

// Rota para conectar um número WhatsApp
router.post('/connect', createConnection);

// Rota para enviar uma mensagem
router.post('/send', sendWhatsAppMessage);

// Rota para enviar uma imagem
router.post('/send/image', sendWhatsAppImage);

router.post('/send/document', sendWhatsAppDocument);

// Rota para enviar um áudio
router.post('/send/audio', sendWhatsAppAudio);

module.exports = router;
