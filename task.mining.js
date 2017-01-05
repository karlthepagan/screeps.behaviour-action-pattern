// This task will react on white/brown flags
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
    // check if a new creep has to be spawned
    checkForRequiredCreeps: (flag) => {
        let spawnRoom = Game.rooms[Room.bestSpawnRoomFor(flag.pos.roomName)];
        let room = Game.rooms[flag.pos.roomName];
        let memory = Task.mining.memory(flag);

        let sources = room.find(FIND_SOURCES);

        // todo count creeps by type needed per source / mineral
        let haulerCount = null;
        let minerCount = null;

        if(haulerCount < sources.length) {
            for(var i = 0; i < sources.length; i++) {
                let fixedBody = [MOVE, CARRY, CARRY, WORK];
                let multiBody = [MOVE, CARRY, CARRY, CARRY];
                let name = 'remoteHauler-' + flag.name;
                let creep = {
                    parts: Creep.Setup.compileBody(room, fixedBody, multiBody, true),
                    name: name,
                    setup: 'remoteHauler',
                    destiny: { task: "mining", flagName: flag.name }
                };
                if( creep.parts.length === 0 ) {
                    // creep has no body.
                    global.logSystem(flag.pos.roomName, dye(CRAYON.error, 'Mining Flag tried to queue a zero parts body creep. Aborted.' ));
                    return;
                }
                // queue creep for spawning
                room.spawnQueueLow.push(creep);
                // save queued creep to task memory
                memory.queued.push({
                    room: room.name,
                    name: name
                });
            }
        }

        if(minerCount < sources.length * 2) {
            for(var i = 0; i < sources.length * 2; i++) {
                let fixedBody = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
                let multiBody = null;
                let name = 'remoteMiner-' + flag.name;
                let creep = {
                    parts: Creep.Setup.compileBody(room, fixedBody, multiBody, true),
                    name: name,
                    setup: 'remoteMiner',
                    destiny: { task: "mining", flagName: flag.name }
                };
                if( creep.parts.length === 0 ) {
                    // creep has no body.
                    global.logSystem(flag.pos.roomName, dye(CRAYON.error, 'Mining Flag tried to queue a zero parts body creep. Aborted.' ));
                    return;
                }
                // queue creep for spawning
                room.spawnQueueLow.push(creep);
                // save queued creep to task memory
                memory.queued.push({
                    room: room.name,
                    name: name
                });
            }
        }
    }
    // todo: rest of task
};

module.exports = mod;
