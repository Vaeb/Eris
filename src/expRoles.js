import { client, minExp, maxExp, definedGuilds } from './setup';
import { db, dataMembersAll } from './db';
import { onError, sendEmbed } from './util';
// import { fetchProp } from './db';

const baseExp = (minExp + maxExp) / 2;

export const expRoleGuilds = [definedGuilds.vashta];

export const expRoleSettings = [
    { name: 'Adamantite', expRequired: baseExp * 13000 }, // 195000
    { name: 'Orichalcum', expRequired: baseExp * 8000 }, // 120000
    { name: 'Mythril', expRequired: baseExp * 5000 }, // 75000
    { name: 'Platinum', expRequired: baseExp * 3000 }, // 45000
    { name: 'Gold', expRequired: baseExp * 1800 }, // 27000
    { name: 'Silver', expRequired: baseExp * 800 }, // 12000
    { name: 'Iron', expRequired: baseExp * 150 }, // 2250
    { name: 'Copper', expRequired: baseExp * 5 }, // 75
];

const expRolesAll = {};
const expRoleIdsAll = {};
export const memberRoleCacheAll = {};

export const getRankFromXp = exp => expRoleSettings.find(({ expRequired }) => exp >= expRequired);

const cacheCurrentRole = (guild, member) => {
    const userId = member.id;

    const expRoles = expRolesAll[guild.id];
    const expRoleIds = expRoleIdsAll[guild.id];
    const memberRoleCache = memberRoleCacheAll[guild.id];

    const memberRoleIds = member.roles.filter(r => expRoleIds[r.id]).map(r => r.id);

    if (memberRoleIds.length === 0) {
        memberRoleCache[userId] = -1;
    } else {
        memberRoleCache[userId] = expRoles.find(({ roleId }) => memberRoleIds.includes(roleId)).index;
    }
};

const updateExpRole = (guild, member, exp) => {
    // console.log('checking', member.user.username, exp);

    const userId = member.id;

    const expRoles = expRolesAll[guild.id];
    const memberRoleCache = memberRoleCacheAll[guild.id];

    const expRoleIndex = memberRoleCache[userId];
    // const expRoleData = expRoleIndex > -1 ? expRoles[expRoleIndex] : {};

    const newExpRoleIndex = expRoles.findIndex(({ expRequired }) => exp >= expRequired);

    // console.log(newExpRoleIndex, expRoleIndex);

    if (newExpRoleIndex === expRoleIndex) return false;

    memberRoleCache[userId] = newExpRoleIndex;

    if (newExpRoleIndex === -1) {
        console.log('Removing all exp roles');
        member.removeRoles(expRoles.map(({ role }) => role));
        return false;
    }

    const newExpRoleData = expRoles[newExpRoleIndex];
    console.log(`${member.user.username} unlocked ${newExpRoleData.name} xp role at ${exp} xp`);

    const removeRoles = expRoles.filter(({ roleId }) => roleId !== newExpRoleData.roleId);

    member
        .removeRoles(removeRoles.map(({ role }) => role))
        .then(() => {
            member.addRole(newExpRoleData.roleId).catch(err => onError(err, 'AddExpRole'));
        })
        .catch(err => onError(err, 'RemExpRole'));

    console.log('Removing:', removeRoles.map(({ name }) => name));
    console.log('Adding:', newExpRoleData.name, newExpRoleData.roleId);

    return newExpRoleData;
};

export const forceUpdateExpRole = async (guild, member, exp) => {
    cacheCurrentRole(guild, member);
    updateExpRole(guild, member, exp);
};

export const addXp = async (member, changeXp) => {
    const { guild } = member;

    const memberData = dataMembersAll[guild.id][member.id];
    const newXp = memberData.exp + changeXp;

    memberData.exp = newXp;

    await db.members
        .update({ guildId: guild.id, userId: member.id }, { $inc: { exp: changeXp } }, { upsert: false, multi: false })
        .catch(err => onError(err, 'Query_ExpAdd'));

    forceUpdateExpRole(guild, member, newXp);

    return newXp;
};

export const checkExpRole = (channel, member, exp) => {
    const { guild } = channel;

    if (!expRolesAll[guild.id]) return;

    if (memberRoleCacheAll[guild.id][member.id] === undefined) cacheCurrentRole(guild, member);

    const newExpRoleData = updateExpRole(guild, member, exp);

    if (newExpRoleData) {
        sendEmbed(channel, 'XP Role Unlocked', `${member} unlocked the ${newExpRoleData.name} role! 🎉🎉🎉`);
    }
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
