// src/controllers/whatsappController.js
const WhatsAppService = require('../services/whatsappService');

const connections = {}; // Objeto para armazenar múltiplas conexões

// Criar uma conexão
const createConnection = async (req, res) => {
    const { sessionId } = req.body;
    const { io } = req; // Obtém a instância do `io` do objeto `req`

    try {
        const whatsappService = new WhatsAppService(sessionId, io); // Passa o `io` ao criar a instância
        connections[sessionId] = whatsappService;
        res.status(200).json({ message: 'Conexão iniciada, escaneie o QR Code.', qrCode: whatsappService.qrCode });
    } catch (error) {
        console.error('Erro ao conectar ao WhatsApp:', error);
        res.status(500).json({ error: 'Erro ao conectar', details: error.message });
    }
};

// Enviar uma mensagem
const sendWhatsAppMessage = async (req, res) => {
    const { sessionId, number, message } = req.body;

    const whatsappService = connections[sessionId];
    if (!whatsappService) {
        return res.status(400).json({ error: 'Conexão do WhatsApp não estabelecida para este sessionId' });
    }

    try {
        await whatsappService.sendMessage(number, message);
        res.status(200).json({ message: 'Mensagem enviada com sucesso' });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem', details: error.message });
    }
};

// Enviar uma imagem
const sendWhatsAppImage = async (req, res) => {
    const { sessionId, number, base64Image, caption } = req.body;

    const whatsappService = connections[sessionId];
    if (!whatsappService) {
        return res.status(400).json({ error: 'Conexão do WhatsApp não estabelecida para este sessionId' });
    }

    try {
        await whatsappService.sendImage(number, base64Image, caption);
        res.status(200).json({ message: 'Imagem enviada com sucesso' });
    } catch (error) {
        console.error('Erro ao enviar imagem:', error);
        res.status(500).json({ error: 'Erro ao enviar imagem', details: error.message });
    }
};

// Enviar um áudio
const sendWhatsAppAudio = async (req, res) => {
    const { sessionId, number, base64Audio } = req.body;

    const whatsappService = connections[sessionId];
    if (!whatsappService) {
        return res.status(400).json({ error: 'Conexão do WhatsApp não estabelecida para este sessionId' });
    }

    try {
        await whatsappService.sendAudio(number, base64Audio);
        res.status(200).json({ message: 'Áudio enviado com sucesso' });
    } catch (error) {
        console.error('Erro ao enviar áudio:', error);
        res.status(500).json({ error: 'Erro ao enviar áudio', details: error.message });
    }
};

const sendWhatsAppDocument = async (req, res) => {
    const { sessionId, number, base64Document, mimetype, filename } = req.body;

    const whatsappService = connections[sessionId];
    if (!whatsappService) {
        return res.status(400).json({ error: 'Conexão do WhatsApp não estabelecida para este sessionId' });
    }

    try {
        await whatsappService.sendDocument(number, base64Document, mimetype, filename);
        res.status(200).json({ message: 'Documento enviado com sucesso' });
    } catch (error) {
        console.error('Erro ao enviar documento:', error);
        res.status(500).json({ error: 'Erro ao enviar documento', details: error.message });
    }
};

module.exports = {
    createConnection,
    sendWhatsAppMessage,
    sendWhatsAppImage,
    sendWhatsAppAudio,
    sendWhatsAppDocument
};
