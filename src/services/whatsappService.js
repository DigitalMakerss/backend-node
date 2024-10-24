const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, downloadMediaMessage, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode'); 
const db = require('../config/db');

class WhatsAppService {
    constructor(sessionId, io) {
        this.sessionId = sessionId;
        this.sock = null;
        this.io = io;
        this.qrCode = null;
        this.lastQrTime = 0;
        this.initialize();
    }

    createAuthDir() {
        const authPath = path.join(__dirname, 'auth', this.sessionId);
        if (!fs.existsSync(authPath)) {
            fs.mkdirSync(authPath, { recursive: true }); 
            console.log(`Pasta de autenticação criada: ${authPath}`);
        }
    }

    deleteAuthDir() {
        const authPath = path.join(__dirname, 'auth', this.sessionId);
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log(`Pasta de autenticação removida: ${authPath}`);
        }
    }

    async insertOrUpdateWhatsAppAccount(isConnected) {
        try {
            const [results] = await db.query('SELECT * FROM whatsapp_accounts WHERE session_id = ?', [this.sessionId]);
            const existingAccount = results && results.length > 0;
    
            if (existingAccount) {
                await db.query('UPDATE whatsapp_accounts SET is_connected = ? WHERE session_id = ?', [isConnected, this.sessionId]);
                console.log(`Status da conta WhatsApp atualizado para o session_id: ${this.sessionId}`);
            } else {
                await db.query('INSERT INTO whatsapp_accounts (session_id, is_connected) VALUES (?, ?)', [this.sessionId, isConnected]);
                console.log(`Conta WhatsApp inserida para o session_id: ${this.sessionId}`);
            }
        } catch (error) {
            console.error('Erro ao inserir ou atualizar a conta do WhatsApp:', error);
        }
    }

    async deleteWhatsAppAccount() {
        try {
            await db.query('DELETE FROM whatsapp_accounts WHERE session_id = ?', [this.sessionId]);
            console.log(`Conta do WhatsApp deletada: ${this.sessionId}`);
        } catch (error) {
            console.error('Erro ao deletar a conta do WhatsApp:', error);
        }
    }

    async saveContact(remoteJid, name, profilePicUrl, sessionId) {
        const connectedNumber = this.sock.user.id.split(':')[0]; // Seu próprio número
        
        if (remoteJid.includes('@g.us')) {
            console.log("Ignorando salvar grupo como contato.");
            return null;
        }
    
        // Ignorar salvar o próprio número
        if (remoteJid.includes(connectedNumber)) {
            console.log("Ignorando salvar o próprio número nos contatos.");
            return null;
        }
    
    
        try {
            const number = remoteJid.split('@')[0];
    
            const [existingContact] = await db.query('SELECT id FROM whatsapp_contacts WHERE number = ?', [number]);
        
            if (existingContact.length > 0) {
                const contactId = existingContact[0].id;
                await db.query(
                    `UPDATE whatsapp_contacts 
                     SET name = ?, profile_pic_url = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [name, profilePicUrl, contactId]
                );
                console.log(`Contato atualizado: ${name} (${number})`);
                return contactId;
            } else {
                const [result] = await db.query(
                    `INSERT INTO whatsapp_contacts (number, name, profile_pic_url, status, setor_id, created_at, updated_at)
                     VALUES (?, ?, ?, TRUE, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [number, name, profilePicUrl, sessionId]
                );
                console.log(`Novo contato inserido: ${name} (${number})`);
                return result.insertId;
            }
        } catch (error) {
            console.error('Erro ao salvar ou atualizar o contato:', error);
        }
    }

    async saveMessage(contactId, message, messageType, mediaUrl, mediaMimetype, mediaFilename, isSent, fromNumber, toNumber) {
        try {
            const values = [
                contactId,
                message,
                messageType,
                mediaUrl,
                mediaMimetype,
                mediaFilename,
                isSent,
                fromNumber,
                toNumber
            ];
    
            const [result] = await db.query(
                'INSERT INTO messages (whatsapp_contact_id, content, message_type, media_url, media_mimetype, media_filename, is_sent, `from`, `to`, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 HOUR))',
                values
            );
            
            console.log(`Mensagem salva no banco de dados com ID: ${result.insertId}`);
    
            const [rows] = await db.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
    
            return rows[0];
        } catch (error) {
            console.error('Erro ao salvar a mensagem no banco de dados:', error);
        }
    }
    
    async initialize() {
        try {
            this.createAuthDir();
            
            const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth', this.sessionId));
    
            this.sock = makeWASocket({
                auth: state,
                printQRInTerminal: true,
            });
    
            this.io.on('connection', (socket) => {
                console.log('Novo cliente conectado ao WebSocket.');
    
                socket.on('generateQrCode', async (data) => {
                    console.log('Evento generateQrCode recebido.', data);
    
                    if (data.sessionId === this.sessionId) {
                        console.log(`Gerando QR Code para a sessão: ${this.sessionId}`);
    
                        if (this.qrCode) {
                            socket.emit('qrCode', {
                                sessionId: this.sessionId,
                                qrCode: this.qrCode,
                                message: 'QR Code gerado. Escaneie para conectar.',
                            });
                        } else {
                            console.log(`Nenhum QR Code disponível para a sessão: ${this.sessionId}`);
                        }
                    }
                });
            });
    
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
    
                if (qr && connection !== 'open') {
                    const currentTime = Date.now();
    
                    if (currentTime - this.lastQrTime >= 10000) {
                        try {
                            this.qrCode = await qrcode.toDataURL(qr);
                            this.lastQrTime = currentTime;
                            console.log('QR Code recebido.');
    
                            this.io.emit('qrCode', {
                                sessionId: this.sessionId,
                                qrCode: this.qrCode,
                                message: 'QR Code gerado. Escaneie para conectar.'
                            });
                        } catch (error) {
                            console.error('Erro ao processar QR Code:', error);
                        }
                    } else {
                        console.log('Aguardando 10 segundos para gerar novo QR Code.');
                    }
                }
    
                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
                    if (shouldReconnect) {
                        console.log('Conexão fechada, tentando reconectar em 5 segundos...');
                        setTimeout(() => {
                            this.initialize().catch(err => console.error('Erro ao tentar reconectar:', err));
                        }, 5000);
                    } else {
                        this.deleteAuthDir();
                        this.deleteWhatsAppAccount().catch(err => console.error('Erro ao deletar conta:', err));
                        console.log('Conexão fechada e não reconectada.');
                    }
                } else if (connection === 'open') {
                    const number = this.sock.user.id.split(':')[0];
                    console.log(`Número conectado: ${number}`);
    
                    await this.insertOrUpdateWhatsAppAccount(true);
    
                    this.io.emit('connectionSuccess', {
                        sessionId: this.sessionId,
                        message: 'Conexão estabelecida com sucesso.'
                    });
                }
            });
    
            this.sock.ev.on('creds.update', saveCreds);
    
            this.sock.ev.on('messages.upsert', async ({ messages }) => {
                try {
                    const msg = messages[0];
                    let is_sent = false;
            
                    if (!msg.message) return;
            
                    const remoteJid = msg.key.remoteJid;
                    const contactInfo = await this.sock.onWhatsApp(remoteJid);
                    const name = msg.pushName || (contactInfo && contactInfo.length > 0 ? contactInfo[0].notify || remoteJid.split('@')[0] : remoteJid.split('@')[0]);
            
                    let profilePicUrl;
                    try {
                        profilePicUrl = await this.sock.profilePictureUrl(remoteJid, 'image');
                    } catch (error) {
                        console.error('Erro ao obter foto de perfil:', error);
                        profilePicUrl = null;
                    }
            
                    let messageType = 'text';
                    let mediaBase64 = null;
                    let mediaMimetype = null;
                    let mediaFilename = null;
                    let messageText = null;
                
                    try {
                        if (msg.message.imageMessage) {
                            messageType = 'image';
                            const mediaBuffer = await downloadMediaMessage(msg, 'buffer', { messages: this.sock, mediaType: 'imageMessage' });
                            mediaBase64 = mediaBuffer.toString('base64');
                            mediaMimetype = msg.message.imageMessage.mimetype;
                            mediaFilename = msg.message.imageMessage.fileName;
                        } else if (msg.message.documentWithCaptionMessage) {
                            messageType = 'document';
                            const mediaBuffer = await downloadMediaMessage(msg, 'buffer', { messages: this.sock, mediaType: 'documentMessage' }, 'buffer');
                            mediaBase64 = mediaBuffer.toString('base64');
                            mediaMimetype = msg.message.documentWithCaptionMessage.message.documentMessage.mimetype;
                            mediaFilename = msg.message.documentWithCaptionMessage.message.documentMessage.fileName;
            
                        } else if (msg.message.documentMessage) {
                            messageType = 'document';
                            const mediaBuffer = await downloadMediaMessage(msg, 'buffer', { messages: this.sock, mediaType: 'documentMessage' }, 'buffer');
                            mediaBase64 = mediaBuffer.toString('base64');
                            mediaMimetype = msg.message.documentMessage.mimetype;
                            mediaFilename = msg.message.documentMessage.fileName;
                        } else if (msg.message.extendedTextMessage) {
                            messageType = 'text';
                            messageText = msg.message.extendedTextMessage.text;
                        } else if (msg.message.conversation) {
                            messageText = msg.message.conversation;
                        }
                    } catch (error) {
                        console.error('Erro ao processar mensagem:', error);
                    }
            
                    // Lógica para ignorar mensagens de texto sem conteúdo
                    if (messageType === 'text' && !messageText) {
                        console.log('Mensagem de texto sem conteúdo ignorada.');
                        return; // Se for texto e o conteúdo for nulo, saia da função
                    }
                
                    let connectedNumber;
                    let fromNumber;
            
                    if (msg.key.fromMe) {
                        is_sent = true;
                        fromNumber = this.sock.user.id.split(':')[0];
                        connectedNumber = remoteJid.split('@')[0];
                    } else {
                        is_sent = false;
                        fromNumber = remoteJid.split('@')[0];
                        connectedNumber = this.sock.user.id.split(':')[0];
                    }
            
                    try {
                        const contactId = await this.saveContact(remoteJid, name, profilePicUrl, this.sessionId);
                        const savedMessage = await this.saveMessage(contactId, messageText, messageType, mediaBase64, mediaMimetype, mediaFilename, is_sent, fromNumber, connectedNumber);
                  
                        this.io.emit('newMessage', {
                            ...savedMessage,
                            profile_pic_url: profilePicUrl,
                        });
                  
                    } catch (error) {
                        console.error('Erro ao salvar contato ou mensagem:', error);
                    }
                } catch (error) {
                    console.error('Erro no processamento de mensagens:', error);
                }
            });
    
        } catch (error) {
            console.error('Erro ao inicializar o WhatsApp Service:', error);
            // Adicionar um retry após falha para que o servidor continue ativo
            setTimeout(() => {
                console.log('Tentando reinicializar o serviço após erro...');
                this.initialize();
            }, 5000); // Tenta novamente após 5 segundos
        }
    }

    async sendMessage(number, message) {
        try {
            await this.sock.sendMessage(`${number}@s.whatsapp.net`, { text: message });
            console.log(`Mensagem enviada para ${number}: ${message}`);
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    }

    async sendImage(number, base64Image, caption = '') {
        try {
            const buffer = Buffer.from(base64Image, 'base64');
            await this.sock.sendMessage(`${number}@s.whatsapp.net`, {
                image: buffer,
                caption: caption
            });
            console.log(`Imagem enviada para ${number}`);
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
        }
    }

    async sendAudio(number, base64Audio) {
        try {
            const buffer = Buffer.from(base64Audio, 'base64');
            await this.sock.sendMessage(`${number}@s.whatsapp.net`, {
                audio: buffer,
                mimetype: 'audio/mp4'
            });
            console.log(`Áudio enviado para ${number}`);
        } catch (error) {
            console.error('Erro ao enviar áudio:', error);
        }
    }

    async sendDocument(number, base64Document, mimetype, filename) {
        try {
            const buffer = Buffer.from(base64Document, 'base64');
            await this.sock.sendMessage(`${number}@s.whatsapp.net`, {
                document: buffer,
                mimetype: mimetype,
                fileName: filename
            });
            console.log(`Documento enviado para ${number}: ${filename}`);
        } catch (error) {
            console.error('Erro ao enviar documento:', error);
        }
    }
}



module.exports = WhatsAppService;
