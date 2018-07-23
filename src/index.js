import { client } from './setup';
import { onError } from './util';
import { discordToken } from './auth';
import './core/events';

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Promise Rejection at:', p);
    console.log('Reason:', reason);
});

client.login(discordToken).catch(err => onError(err, 'DiscordLogin'));
