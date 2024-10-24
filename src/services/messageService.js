const db = require('../config/db');

class WhatsAppService {
    constructor(socket) {
        this.sock = socket; // Socket já conectado
    }

    // Formata o número com o prefixo do WhatsApp
    formatNumber(to) {
        return `${to}@s.whatsapp.net`;
    }

    async sendMessage(to, text, msg) {
        try {
            const formattedNumber = this.formatNumber(to); // Formata o número
            console.log(`Enviando mensagem para: ${formattedNumber}`);
            
            const message = await this.sock.sendMessage(formattedNumber, { text });
            console.log(`Mensagem enviada para ${formattedNumber}:`, message);

            const connectionId = this.sock.id; 
            console.log(`Connection ID: ${connectionId}`); 

            const profilePicUrl = this.sock.user.profilePictureUrl || '';
            const name = this.sock.user.name || 'Desconhecido'; 

            let is_sent;
            let fromNumber;
            let toNumber;

            is_sent = true;
            fromNumber = this.sock.user.id.split(':')[0]; 
            toNumber = to;
            
            // Valores a serem inseridos no banco de dados
            const values = [
                this.sock.id,                // connection_id
                text,                        // message
                formattedNumber,             // jid
                profilePicUrl,              // profile_pic_url
                name,                        // name
                'text',                      // message_type
                null,                        // media_base64 (ou uma string vazia '')
                null,                        // media_mimetype (ou uma string vazia '')
                null,                        // media_filename (ou uma string vazia '')
                is_sent,                    // is_sent
                fromNumber,                 // from
                toNumber                    // to
            ];

            // Inserir a mensagem no banco de dados
            await db.query(
                'INSERT INTO messages (connection_id, message, created_at, jid, profile_pic_url, name, message_type, media_base64, media_mimetype, media_filename, is_sent, `from`, `to`) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                values
            );

            console.log(`Mensagem salva no banco de dados para ${formattedNumber}`);
            return message;
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    }

    async sendImage(to, base64Image, caption = '', msg) {
        try {
            const formattedNumber = this.formatNumber(to); // Formata o número
            const message = await this.sock.sendMessage(formattedNumber, {
                image: {
                    url: `data:image/jpeg;base64,${base64Image}`, // Usando o URL data
                    caption 
                }
            });
            console.log(`Imagem enviada para ${formattedNumber}:`, message);

            // Obtém os dados necessários para a inserção
            const connectionId = this.sock.id; // Obtenha o connection_id do socket
            const profilePicUrl = this.sock.user.profilePictureUrl || ''; // Use um valor padrão se não houver
            const name = this.sock.user.name || 'Desconhecido'; // Nome padrão se não houver

            let is_sent;
            let fromNumber;
            let toNumber;

            // A lógica de determinação de 'is_sent', 'fromNumber' e 'toNumber'
            if (msg && msg.key.fromMe) {
                is_sent = true;
                fromNumber = this.sock.user.id.split(':')[0]; // O número do bot
                toNumber = to; // O número do cliente
            } else {
                is_sent = false;
                fromNumber = to; // O número do cliente
                toNumber = this.sock.user.id.split(':')[0]; // O número do bot
            }

            // Valores a serem inseridos no banco de dados
            const values = [
                connectionId,                // connection_id
                caption,                     // message
                formattedNumber,             // jid
                profilePicUrl,              // profile_pic_url
                name,                        // name
                'image',                     // message_type
                base64Image,                // media_base64
                'image/jpeg',               // media_mimetype
                'image.jpg',                // media_filename
                is_sent,                    // is_sent
                fromNumber,                 // from
                toNumber                    // to
            ];

            // Inserir a imagem no banco de dados
            await db.query(
                'INSERT INTO messages (connection_id, message, created_at, jid, profile_pic_url, name, message_type, media_base64, media_mimetype, media_filename, is_sent, `from`, `to`) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                values
            );

            console.log(`Imagem salva no banco de dados para ${formattedNumber}`);
            return message;
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
        }
    }

    async sendAudio(to, base64Audio, msg) {
        try {
            const formattedNumber = this.formatNumber(to); // Formata o número
            const message = await this.sock.sendMessage(formattedNumber, {
                audio: {
                    url: `data:audio/mpeg;base64,${base64Audio}` // Usando o URL data
                }
            });
            console.log(`Áudio enviado para ${formattedNumber}:`, message);

            // Obtém os dados necessários para a inserção
            const connectionId = this.sock.id; // Obtenha o connection_id do socket
            const profilePicUrl = this.sock.user.profilePictureUrl || ''; // Use um valor padrão se não houver
            const name = this.sock.user.name || 'Desconhecido'; // Nome padrão se não houver

            let is_sent;
            let fromNumber;
            let toNumber;

            // A lógica de determinação de 'is_sent', 'fromNumber' e 'toNumber'
            if (msg && msg.key.fromMe) {
                is_sent = true;
                fromNumber = this.sock.user.id.split(':')[0]; // O número do bot
                toNumber = to; // O número do cliente
            } else {
                is_sent = false;
                fromNumber = to; // O número do cliente
                toNumber = this.sock.user.id.split(':')[0]; // O número do bot
            }

            // Valores a serem inseridos no banco de dados
            const values = [
                connectionId,                // connection_id
                '',                          // message
                formattedNumber,             // jid
                profilePicUrl,              // profile_pic_url
                name,                        // name
                'audio',                     // message_type
                base64Audio,                // media_base64
                'audio/mpeg',               // media_mimetype
                'audio.mp3',                // media_filename
                is_sent,                    // is_sent
                fromNumber,                 // from
                toNumber                    // to
            ];

            // Inserir o áudio no banco de dados
            await db.query(
                'INSERT INTO messages (connection_id, message, created_at, jid, profile_pic_url, name, message_type, media_base64, media_mimetype, media_filename, is_sent, `from`, `to`) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                values
            );

            console.log(`Áudio salvo no banco de dados para ${formattedNumber}`);
            return message;
        } catch (error) {
            console.error('Erro ao enviar áudio:', error);
        }
    }
}

module.exports = WhatsAppService;
