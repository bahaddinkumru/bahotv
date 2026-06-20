const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

const SERVER_URL = 'http://localhost:4000';
const JWT_SECRET = 'your-super-secret-access-key-change-this';
const BOT_COUNT = 500;
const RAMP_UP_SPEED = 20;

let connectedCount = 0;
let matchCount = 0;
let errorCount = 0;

console.log(`🚀 BAHOTV SABİT YÜK TESTİ BAŞLIYOR...`);
console.log(`🤖 Hedef: ${BOT_COUNT} Bot -> ${BOT_COUNT / 2} Eşleşme`);

function spawnBot(id) {
    const userId = `bot_${id}`;
    const email = `bot${id}@stress.test`;

    const token = jwt.sign(
        { sub: userId, email: email, role: 'user', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    const socket = io(SERVER_URL, {
        transports: ['websocket'],
        auth: { token: `Bearer ${token}` },
        reconnection: false,
        forceNew: true
    });

    socket.on('connect', () => {
        connectedCount++;
        updateStatus();

        socket.emit('find_match');
    });

    socket.on('match_found', (data) => {
        matchCount++;
        updateStatus();
    });

    socket.on('error_message', (msg) => {
        errorCount++;
        updateStatus();
    });

    socket.on('disconnect', () => {
        connectedCount--;
        updateStatus();
    });

    socket.on('connect_error', (err) => {
        errorCount++;
        updateStatus();
    });
}

function updateStatus() {
    process.stdout.write(
        `\r🟢 Online: ${connectedCount} | 🤝 Kusursuz Eşleşme: ${Math.floor(matchCount / 2)} | ❌ Hata: ${errorCount}      `
    );
}

let currentBotId = 0;
const interval = setInterval(() => {
    spawnBot(currentBotId);
    currentBotId++;

    if (currentBotId >= BOT_COUNT) {
        clearInterval(interval);
        console.log('\n\n✅ Tüm botlar sahada sabitlendi! Eşleşmelerin 250\'de durması lazım.\n');
    }
}, RAMP_UP_SPEED);