const http = require('http');
const express = require('express');
const colyseus = require('colyseus');
const monitor = require("@colyseus/monitor").monitor;
const path = require('path');
//const socialRoutes = require("@colyseus/social/express").default;

const outdoor = require('./room/public').outdoor; 

const port = Number(process.env.PORT || 2567);
const app = express()

const server = http.createServer(app);
const gameServer = new colyseus.Server({ server });

// register your room handlers
gameServer.register('outdoor', outdoor);

/* register @colyseus/social routes
app.use("/", socialRoutes);*/

// Set CSP header to allow unsafe-eval for Phaser.js compatibility
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://www.gstatic.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self' ws: wss:; " +
        "media-src 'self';"
    );
    next();
});

app.use("/", express.static(path.join(__dirname, "./../client/public")));

// register colyseus monitor AFTER registering your room handlers
app.use("/colyseus", monitor(gameServer));

gameServer.listen(port);
console.log(`Listening on ws://localhost:${ port }`)
