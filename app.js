const express = require('express');
const http = require('http'); // Importa o módulo HTTP
const { Server } = require('socket.io'); // Importa o módulo socket.io
const whatsappRoutes = require('./src/routes/whatsappRoutes');
const app = express();

app.use(express.json());
app.use(express.json({ limit: '1000mb' }));
const server = http.createServer(app); // Cria o servidor HTTP para usar com o socket.io

const io = new Server(server, {
  cors: {
    origin: '*', // Permite qualquer origem (ideal para testes, mas para produção deve ser ajustado)
  }
});

io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);

    // Lida com o evento `join` para adicionar o cliente à sala correta
    socket.on('join', (sessionId) => {
        socket.join(sessionId); // Adiciona o cliente à sala identificada pelo `sessionId`
        console.log(`Socket ${socket.id} entrou na sala ${sessionId}`);
    });

    // Lida com a desconexão do cliente
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

app.use('/whatsapp', (req, res, next) => {
    req.io = io; // Adiciona o `io` ao objeto `req`
    next();
  }, whatsappRoutes);


const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
