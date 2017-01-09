// This task will react on yellow/yellow flags, sending a guarding creep to the flags position.
var mod = {
    // hook into events
    register: () => {
        // when a new flag has been found (occurs every tick, for each flag)
        Flag.found.on( flag => Task.guard.handleFlagFound(flag) );
        // a creep starts spawning
        Creep.spawningStarted.on( params => Task.guard.handleSpawningStarted(params) );
        // a creep completed spawning
        Creep.spawningCompleted.on( creep => Task.guard.handleSpawningCompleted(creep) );
        // a creep will die soon
        Creep.predictedRenewal.on( creep => Task.guard.handleCreepDied(creep.name) );
        // a creep died
        Creep.died.on( name => Task.guard.handleCreepDied(name) );
    },
    // for each flag
    handleFlagFound: flag => {
        // if it is a yellow/yellow flag
        if( flag.color == FLAG_COLOR.defense.color && flag.secondaryColor == FLAG_COLOR.defense.secondaryColor ){
            // check if a new creep has to be spawned
            Task.guard.checkForRequiredCreeps(flag);
        }
    },
    // check if a new creep has to be spawned
    checkForRequiredCreeps: (flag) => {
        // get task memory
        let memory = Task.guard.memory(flag);
        // count creeps assigned to task
        let count = memory.queued.length + memory.spawning.length + memory.running.length;
        // if creep count below requirement spawn a new creep creep
        if( count < 1 ) {
            // get nearest room
            let room = Room.bestSpawnRoomFor(flag.pos.roomName);
            // define new creep
            let fixedBody = [RANGED_ATTACK, MOVE];
            let multiBody = [TOUGH, RANGED_ATTACK, RANGED_ATTACK, HEAL, MOVE, MOVE];
            let name = 'ranger-' + flag.name;
            let creep = {
                parts: Creep.Setup.compileBody(room, fixedBody, multiBody, true),
                name: name,
                setup: 'ranger',
                destiny: { task: "guard", flagName: flag.name }
            };
            if( creep.parts.length === 0 ) {
                // creep has no body. 
                global.logSystem(flag.pos.roomName, dye(CRAYON.error, 'Guard Flag tried to queue a zero parts body creep. Aborted.' ));
                return;
            }
            // queue creep for spawning
            room.spawnQueueMedium.push(creep);
            // save queued creep to task memory
            memory.queued.push({
                room: room.name,
                name: name
            });
        }
    },
    // when a creep starts spawning
    handleSpawningStarted: params => { // params: {spawn: spawn.name, name: creep.name, destiny: creep.destiny}
        // ensure it is a creep which has been queued by this task (else return)
        if ( !params.destiny || !params.destiny.task || params.destiny.task != 'guard' )
            return;
        // get flag which caused queueing of that creep
        let flag = Game.flags[params.destiny.flagName];
        if (flag) {
            // get task memory
            let memory = Task.guard.memory(flag);
            // save spawning creep to task memory
            memory.spawning.push(params);
            // clean/validate task memory queued creeps
            let queued = []
            let validateQueued = o => {
                let room = Game.rooms[o.room];
                if(room.spawnQueueMedium.some( c => c.name == o.name)){
                    queued.push(o);
                }
            };
            memory.queued.forEach(validateQueued);
            memory.queued = queued;
        }
    },
    // when a creep completed spawning
    handleSpawningCompleted: creep => {
        // ensure it is a creep which has been requested by this task (else return)
        if (!creep.data || !creep.data.destiny || !creep.data.destiny.task || creep.data.destiny.task != 'guard')
            return;
        // get flag which caused request of that creep
        let flag = Game.flags[creep.data.destiny.flagName];
        if (flag) {
            // calculate & set time required to spawn and send next substitute creep
            // TODO: implement better distance calculation
            creep.data.predictedRenewal = creep.data.spawningTime + (routeRange(creep.data.homeRoom, flag.pos.roomName)*50);

            // get task memory
            let memory = Task.guard.memory(flag);
            // save running creep to task memory
            memory.running.push(creep.name);
            // clean/validate task memory spawning creeps
            let spawning = []
            let validateSpawning = o => {
                let spawn = Game.spawns[o.spawn];
                if( spawn && ((spawn.spawning && spawn.spawning.name == o.name) || (spawn.newSpawn && spawn.newSpawn.name == o.name))) {
                    count++;
                    spawning.push(o);
                }
            };
            memory.spawning.forEach(validateSpawning);
            memory.spawning = spawning;
        }
    },
    // when a creep died (or will die soon)
    handleCreepDied: name => {
        // get creep memory
        let mem = Memory.population[name];
        // ensure it is a creep which has been requested by this task (else return)
        if (!mem || !mem.destiny || !mem.destiny.task || mem.destiny.task != 'guard')
            return;
        // get flag which caused request of that creep
        let flag = Game.flags[mem.destiny.flagName];
        if (flag) {
            // get task memory
            let memory = Task.guard.memory(flag);
            // clean/validate task memory running creeps
            let running = []
            let validateRunning = o => {
                let creep = Game.creeps[o];
                // invalidate old creeps for predicted spawning
                // TODO: better distance calculation
                if( creep && creep.name != name && creep.data !== undefined && creep.data.spawningTime !== undefined && creep.ticksToLive > (creep.data.spawningTime + (routeRange(creep.data.homeRoom, flag.pos.roomName)*50) ) ) {
                    running.push(o);
                }
            };
            memory.running.forEach(validateRunning);
            memory.running = running;
        }
    },
    // get task memory
    memory: (flag) => {
        if( !flag.memory.tasks ) 
            flag.memory.tasks = {};
        if( !flag.memory.tasks.guard ) {
            flag.memory.tasks.guard = {
                queued: [], 
                spawning: [],
                running: []
            }
        }
        return flag.memory.tasks.guard;
    }
};

module.exports = mod; 
