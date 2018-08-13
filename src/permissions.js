import { vaebId, definedGuilds } from './setup';
import { isStaff, isAdmin } from './util';
import { dataGuilds } from './db';
import { expRoleGuilds } from './expRoles';

/* const createResolver = (resolver) => {
    const baseResolver = resolver;

    baseResolver.createResolver = (childResolver) => {
        const newResolver = async (parent, args, context, info) => {
            try {
                const passed = await resolver(parent, args, context, info);
                return passed && childResolver(parent, args, context, info);
            } catch (err) {
                return false;
            }
        };

        return createResolver(newResolver, false);
    };

    return baseResolver;
}; */

const createResolver = (resolver) => {
    const baseResolver = resolver;

    baseResolver.createResolver = (childResolver) => {
        const newResolver = context => resolver(context) && childResolver(context);

        return createResolver(newResolver, false);
    };

    return baseResolver;
};

export const requiresDev = createResolver(({ member }) => member.id === vaebId);

export const requiresAdmin = createResolver(({ member }) => isAdmin(member));

export const requiresStaff = createResolver(({ member }) => isStaff(member));

export const requiresServer = (...serverNames) =>
    createResolver(({ guild }) => serverNames.map(name => definedGuilds[name] || 'ServerNameNotDefined').includes(guild.id));

export const requiresExp = createResolver(({ guild }) => dataGuilds[guild.id].expEnabled);

export const requiresExpRoles = requiresExp.createResolver(({ guild }) => expRoleGuilds.includes(guild.id));
