import { client, minExp, maxExp, definedGuilds } from './setup';
import { onError, sendEmbed } from './util';
// import { fetchProp } from './db';

const baseExp = (minExp + maxExp) / 2;

const expRoleGuilds = [definedGuilds.vashta];

export const expRoleSettings = [
    { name: 'Adamantite', expRequired: baseExp * 5500 }, // 82500
    { name: 'Orichalcum', expRequired: baseExp * 3500 }, // 52500
    { name: 'Mythril', expRequired: baseExp * 2000 }, // 30000
    { name: 'Platinum', expRequired: baseExp * 1000 }, // 15000
    { name: 'Gold', expRequired: baseExp * 600 }, // 9000
    { name: 'Silver', expRequired: baseExp * 250 }, // 3750
    { name: 'Iron', expRequired: baseExp * 80 }, // 1200
    { name: 'Copper', expRequired: baseExp * 5 }, // 75
];

const expRolesAll = {};
const expRoleIdsAll = {};
const memberRoleCacheAll = {};

export const getRankFromXp = exp => expRoleSettings.find(({ expRequired }) => exp >= expRequired);

export const checkExpRole = (channel, member, exp) => {
    const { guild } = channel;
    const userId = member.id;

    if (!expRolesAll[guild.id]) return;

    const expRoles = expRolesAll[guild.id];
    const expRoleIds = expRoleIdsAll[guild.id];
    const memberRoleCache = memberRoleCacheAll[guild.id];

    if (!memberRoleCache.hasOwnProperty(userId)) {
        const memberRoleIds = member.roles.filter(r => expRoleIds[r.id]).map(r => r.id);

        if (memberRoleIds.length === 0) {
            memberRoleCache[userId] = -1;
        } else {
            memberRoleCache[userId] = expRoles.find(({ roleId }) => memberRoleIds.includes(roleId)).index;
        }

        // console.log(`cached current xp role for ${member.user.username}: ${memberRoleCache[userId]}`);
    }

    const expRoleIndex = memberRoleCache[userId];
    const expRoleData = expRoleIndex > -1 ? expRoles[expRoleIndex] : {};

    const newExpRoleIndex = expRoles.findIndex(({ expRequired }) => exp >= expRequired);

    if (newExpRoleIndex === -1 || newExpRoleIndex === expRoleIndex) return;

    const newExpRoleData = expRoles[newExpRoleIndex];

    memberRoleCache[userId] = newExpRoleIndex;

    console.log(`${member.user.username} unlocked ${newExpRoleData.name} xp role at ${exp} xp`);

    if (expRoleIndex > -1) member.removeRole(expRoleData.roleId).catch(err => onError(err, 'RemExpRole'));
    member.addRole(newExpRoleData.roleId).catch(err => onError(err, 'AddExpRole'));

    sendEmbed(channel, 'XP Role Unlocked', `${member} unlocked the ${newExpRoleData.name} role! 🎉🎉🎉`);
};

export const expRolesInit = () => {
    client.guilds.filter(({ id }) => expRoleGuilds.includes(id)).forEach((guild) => {
        expRolesAll[guild.id] = expRoleSettings.map(o => Object.assign({}, o));
        expRoleIdsAll[guild.id] = {};
        memberRoleCacheAll[guild.id] = {};

        expRolesAll[guild.id].forEach((expRoleData, index) => {
            const role = guild.roles.find(r => r.name === expRoleData.name);

            if (!role) {
                console.log(`${expRoleData.name} role not found in guild ${guild.name}`);
                return;
            }

            expRoleData.role = role;
            expRoleData.roleId = role.id;
            expRoleData.index = index;

            expRoleIdsAll[guild.id][role.id] = true;
        });
    });

    console.log('Setup xp roles');
};
