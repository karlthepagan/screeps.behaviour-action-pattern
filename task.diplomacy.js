const NPC = {
    ["Source Keeper"]: true,
    ["Invasion"]: true,
};
const CONST = {
    MY_SCORE: 1000,
    WHITELIST_SCORE: 200,
    ALLY: 100,
    NEUTRAL: 1,
    NPC_SCORE: -200,
};

const mod = {
    myName: () => _.values(Game.spawns)[0].owner.username,
    isNPC: username => NPC[username] === true,
    npcOwner: creep => mod.isNPC(creep.owner.username),
    isAlly: username => mod.reputation(username) >= CONST.ALLY,
    notAlly: username => !mod.isAlly(username),
    allyOwner: creep => mod.isAlly(creep.owner.username),
    isHostile: username => mod.reputation(username) < CONST.NEUTRAL,
    notHostile: username => !mod.isHostile(username),
    hostileOwner: creep => mod.isHostile(creep.owner.username),
    whitelist: () => mod.cache('whitelist'),
    reputation: username => {
        const reps = mod.cache('reputation');
        if( username === undefined ) {
            return reps;
        } else if( reps[username] ) {
            return reps[username];
        } else {
            return reps[username] = 0;
        }
    },
    setReputation: (username, score) => {
        mod.reputation()[username] = score;
        mod.playerMemory(username).score = score;
    },

    register: () => {
        mod._loadWhitelist();
        mod._loadReputation();
    },
    cache: table => Task.cache('diplomacy', table),
    killReputationCache: () => {
        Task.clearCache('diplomacy', 'reputation');
        return mod.reputation();
    },
    killWhitelistCache: () => {
        Task.clearCache('diplomacy', 'reputation');
        Task.clearCache('diplomacy', 'whitelist');
        return mod.whitelist();
    },
    memory: table => Task.memory('diplomacy', table),
    playerMemory: username => {
        const playerMemory = mod.memory('players');
        if( playerMemory[username] ) {
            return playerMemory[username];
        } else {
            return playerMemory[username] = {};
        }
    },

    _loadReputation: () => {
        const etc = mod.cache('etc');
        const playerMemory = mod.memory('players');
        const whitelist = mod.whitelist();
        let reputation = mod.reputation();
        if( _.keys(playerMemory).length + _.keys(whitelist).length
                !== _.keys(reputation).length + etc.whitelistRepUnion) {
            reputation = mod.killReputationCache();
            for( const n in NPC ) {
                reputation[n] = CONST.NPC_SCORE;
            }
            _.keys(whitelist).forEach(function(player) {
                reputation[player] = CONST.WHITELIST_SCORE;
            });

            etc.whitelistRepUnion = 0;
            _.reduce(playerMemory, function(list, player, name) {
                if( typeof player.score === "number" ) {
                    if( whitelist[name] ) {
                        etc.whitelistRepUnion++;
                    }
                    list[name] = player.score;
                }
                return list;
            }, reputation);

            reputation[mod.myName()] = CONST.MY_SCORE;
        }
    },
    _loadWhitelist: () => {
        let whitelist = mod.whitelist();
        if( _.keys(whitelist).length !== PLAYER_WHITELIST.length ) {
            whitelist = mod.killWhitelistCache();

            _.forEach(PLAYER_WHITELIST, function(playerName) {
                whitelist[playerName] = true;
            });
        }
    },
};
module.exports = mod;
