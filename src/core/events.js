import { client } from '../setup';
import { newMessage } from './messageHandler';

export const ready = client.on('ready', () => {
    console.log(`> Connected as ${client.user.username}`);
});

export const disconnect = client.on('disconnect', (closeEvent) => {
    console.log('> Disconnected:', closeEvent);
});

export const reconnecting = client.on('reconnecting', () => {
    console.log('> Reconnecting...');
});

export const resume = client.on('resume', (replayed) => {
    console.log(`> Websocket resumed (${replayed})`);
});

export const warn = client.on('warn', (warning) => {
    console.log('> DiscordJS warning:', warning);
});

export const errorWS = client.on('error', (err) => {
    console.log('> WebSocket error:', err);
    console.log('-----------------------------');
    console.error(err);
});

export const message = client.on('message', (msgObj) => {
    if (!msgObj.guild) return;
    newMessage(msgObj);
});

console.log('Ran events module');
