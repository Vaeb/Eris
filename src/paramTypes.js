import { getMemberByMixed, isId } from './util';

export const userResolvable = {
    types: ['UserId', 'Username', 'UsernamePartial', 'Username#0000'],
    examples: [
        ['107593015014486016', '469495067506376704'],
        ['Vaeb', 'Niimp Now'],
        ['Vae', 'Niim', 'Niimp N'],
        ['Vaeb#0001', 'Niimp Now#6015'],
    ],
    parse: ({ str, guild }) => getMemberByMixed(str, guild) || isId(str) || undefined,
    parseFail: ({ str }) => `User not found from resolvable "${str}"`,
};

export const timeFormat = {
    parse: ({ str }) => {
        let mult;
        str = str.toLowerCase();
        if (str.substr(str.length - 1, 1) == 's' && str.length > 2) str = str.substr(0, str.length - 1);
        if (str == 'millisecond' || str == 'ms') mult = 1 / 60 / 60 / 1000;
        if (str == 'second' || str == 's' || str == 'sec') mult = 1 / 60 / 60;
        if (str == 'minute' || str == 'm' || str == 'min') mult = 1 / 60;
        if (str == 'hour' || str == 'h') mult = 1;
        if (str == 'day' || str == 'd') mult = 24;
        if (str == 'week' || str == 'w') mult = 24 * 7;
        if (str == 'month' || str == 'mo') mult = 24 * 30.42;
        if (str == 'year' || str == 'y') mult = 24 * 365.2422;
        return mult;
    },
};
