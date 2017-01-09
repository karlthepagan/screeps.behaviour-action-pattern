var mod = {
    register: () => {
        // when a new flag has been found (occurs every tick, for each flag)
        Flag.found.on( flag => Task.mining.handleFlagFound(flag) );
        // a creep starts spawning
        Creep.spawningStarted.on( params => Task.mining.handleSpawningStarted(params) );
        // a creep completed spawning
        Creep.spawningCompleted.on( creep => Task.mining.handleSpawningCompleted(creep) );
        // a creep will die soon
        Creep.predictedRenewal.on( creep => Task.mining.handleCreepDied(creep.name) );
        // a creep died
        Creep.died.on( name => Task.mining.handleCreepDied(name) );
    },
    handleFlagFound: flag => {
        if( flag.color == FLAG_COLOR.claim.mining.color && flag.secondaryColor == FLAG_COLOR.claim.mining.secondaryColor ){
            // check if a new creep has to be spawned
            Task.mining.checkForRequiredCreeps(flag);
        }
    },
    handleSpawningStarted: params => {
        if ( !params.destiny || !params.destiny.task || params.destiny.task != 'mining' )
            return;
        let memory = Task.mining.memory(params.destiny.room);
        memory.creeps[params.name] = Game.creeps[params.name];
        memory.queued[params.destiny.role+'s'].pop();
    },
    handleSpawningCompleted: creep => {
        let creepMemory = Memory.population[creep.name];
        if (!creepMemory || !creepMemory.destiny || !creepMemory.destiny.task || creepMemory.destiny.task != 'mining' )
            return;
        Task.mining.nextAction(creep);
    },
    handleCreepDied: creepName => {
        let creepMemory = Memory.population[creepName];
        if (!creepMemory || !creepMemory.destiny || !creepMemory.destiny.task || creepMemory.destiny.task != 'mining' )
            return;
        // check if the invader is still there
        let memory = Task.mining.memory(creepMemory.destiny.room);
        if( !Game.creeps[creepName] ) {
            delete memory.creeps[creepName];
        }
    },

    // check if a new creep has to be spawned
    checkForRequiredCreeps: (flag) => {
        let spawnRoom = Game.rooms[Room.bestSpawnRoomFor(flag.pos.roomName)];
        let room = Game.rooms[flag.pos.roomName];
        if(undefined == room) { // No room visibility, wait until we have a creep there?
            global.logSystem(flag.pos.roomName, dye(CRAYON.error, `No visibility of room ${flag.pos.roomName} for remote mining.` ));
            return;
        }

        let memory = Task.mining.memory(flag.pos.roomName);
        if( !memory.hasOwnProperty('creeps') ){
            memory.creeps = {};
        }

        if( !memory.hasOwnProperty('queued') )
            memory.queued = {miners:[], haulers:[]};

        if( !memory.hasOwnProperty('sources') ){
            memory.sources = [];
            let sources = room.find(FIND_SOURCES);
            for(x=0; x<sources.length;x++)
                memory.sources.push(sources[x].id);
        }

        // todo count creeps by type needed per source / mineral
        let haulerCount = memory.queued.haulers.length+_.size(memory.creeps, c => {c.data.destiny.role=="hauler"});
        let minerCount = memory.queued.miners.length+_.size(memory.creeps, c => {c.data.destiny.role=="miner"});

        if(minerCount < memory.sources.length) {
            for(var i = 0; i < memory.sources.length; i++) {
                let fixedBody = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
                let multiBody = [];
                let name = 'remoteMiner-' + flag.name;
                let creep = {
                    parts: Creep.Setup.compileBody(room, fixedBody, multiBody, true),
                    name: name,
                    setup: 'remoteMiner',
                    destiny: { task: "mining", role: "miner", flagName: flag.name, room: flag.pos.roomName }
                };
                if( creep.parts.length === 0 ) {
                    // creep has no body.
                    global.logSystem(flag.pos.roomName, dye(CRAYON.error, 'Mining Flag tried to queue a zero parts body creep. Aborted.' ));
                    return;
                }
                // queue creep for spawning
                spawnRoom.spawnQueueLow.push(creep);

                // save queued creep to task memory
                memory.queued.miners.push({
                    room: room.name,
                    name: name
                });
            }
        }

        if(haulerCount < memory.sources.length * REMOTE_HAULER_MULTIPLIER ) {
            for(var i = 0; i < memory.sources.length * REMOTE_HAULER_MULTIPLIER; i++) {
                let fixedBody = [MOVE, CARRY, CARRY, WORK];
                let multiBody = [MOVE, CARRY, CARRY, CARRY];
                let name = 'remoteHauler-' + flag.name;
                let creep = {
                    parts: Creep.Setup.compileBody(room, fixedBody, multiBody, true),
                    name: name,
                    setup: 'remoteHauler',
                    destiny: { task: "mining", role: "hauler", flagName: flag.name, room: flag.pos.roomName }
                };
                if( creep.parts.length === 0 ) {
                    // creep has no body.
                    global.logSystem(flag.pos.roomName, dye(CRAYON.error, 'Mining Flag tried to queue a zero parts body creep. Aborted.' ));
                    return;
                }
                // queue creep for spawning
                room.spawnQueueLow.push(creep);

                // save queued creep to task memory
                memory.queued.haulers.push({
                    room: room.name,
                    name: name
                });
            }
        }
    },
    memory: roomName => {
        // Use the roomName as key in Task.memory? 
        // Prevents accidentally processing same room multiple times if flags > 1
        return Task.memory('mining', roomName);
    },
    // define action assignment for creeps

    minerNextAction: creep => {
        // Mining
        // if not in the target room, travel there
        if( creep.room.name != creep.data.destiny.room ){
            if(CHATTY) creep.say('travelling', SAY_PUBLIC);
            Creep.action.travelling.assign(creep, Game.flags[creep.data.destiny.flagName]);
        }
    },

    haulerNextAction: creep => {
        // Hauling
        if( creep.sum < creep.carryCapacity*.8 ){
            // if no energy, fill up
            if(creep.room == creep.data.destiny.room){
                priority = [
                    Creep.action.uncharging,
                    Creep.action.picking,
                    Creep.action.withdrawing,
                    Creep.action.reallocating,
                    Creep.action.idle];

                for(var iAction = 0; iAction < priority.length; iAction++) {
                    var action = priority[iAction];
                    if(action.isValidAction(creep) &&
                        action.isAddableAction(creep) &&
                        action.assign(creep)) {
                            return;
                    }
                }
            } else {
                Creep.action.travelling.assign(creep, Game.flags[creep.data.destiny.flagName]);
                return;
            }
        } else {
            // if full energy, go back to homeRoom
            if(creep.room == creep.data.homeRoom){
                priority = [
                    Creep.action.feeding,
                    Creep.action.charging,
                    Creep.action.fueling,
                    Creep.action.storing,
                    Creep.action.idle];

                for(var iAction = 0; iAction < priority.length; iAction++) {
                    var action = priority[iAction];
                    if(action.isValidAction(creep) &&
                        action.isAddableAction(creep) &&
                        action.assign(creep)) {
                            return;
                    }
                }
            } else {
                Creep.action.travelling.assign(creep, Game.rooms[creep.data.homeRoom].controller);
                return;
            }
        }
    },

    nextAction: creep => {
        if(creep.data.destiny.role == "hauler")
            Task.mining.haulerNextAction(creep);
        else
            Task.mining.minerNextAction(creep);
    }
    // todo: rest of task
};

module.exports = mod;
