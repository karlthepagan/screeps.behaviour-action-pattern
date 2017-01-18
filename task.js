let mod = {};
module.exports = mod;
// register tasks (hook up into events)
mod.register = function () {
    let tasks = [
        Task.guard,
        Task.defense,
        Task.claim,
        Task.reserve,
        Task.mining,
        Task.pioneer,
        Task.attackController,
        Task.robbing,
        Task.diplomacy,
    ];
    var loop = task => {
        task.register();
    }
    _.forEach(tasks, loop);
};
mod.memory = (task, s) => { // task:  (string) name of the task, s: (string) any selector for that task, could be room name, flag name, enemy name
    if( !Memory.tasks ) Memory.tasks = {};
    if( !Memory.tasks[task] ) Memory.tasks[task] = {};
    if( !Memory.tasks[task][s] ) Memory.tasks[task][s] = {};
    return Memory.tasks[task][s];
};
mod.clearMemory = (task, s) => {
    if( Memory.tasks[task] && Memory.tasks[task][s] )
        delete Memory.tasks[task][s];
};
mod.cache = (task, s) => {
    if( !cache[task] ) cache[task] = {};
    if( !cache[task][s] ) cache[task][s] = {};
    return cache[task][s];
};
mod.clearCache = (task, s) => {
    if( cache[task] && cache[task][s] )
        delete cache[task][s];
};
mod.spawn = (queueName, taskName, targetRoomName, targetName, creepDefinition, destiny, onQueued) => {
    // get nearest room
    let room = Room.bestSpawnRoomFor(targetRoomName);
    if( Task[taskName].minControllerLevel && room.controller.level < Task[taskName].minControllerLevel ) return;
    // define new creep
    if(!destiny) destiny = {};
    destiny.task = taskName;
    destiny.room = targetRoomName;
    destiny.targetName = targetName;
    let name = `${creepDefinition.name || creepDefinition.behaviour}-${targetName}`;
    let creepSetup = {
        parts: Creep.compileBody(room, creepDefinition.fixedBody, creepDefinition.multiBody, true),
        name: name,
        behaviour: creepDefinition.behaviour,
        destiny: destiny,
        queueRoom: room.name
    };
    if( creepSetup.parts.length === 0 ) {
        // creep has no body.
        global.logSystem(flag.pos.roomName, dye(CRAYON.error, `${taskName} task tried to queue a zero parts body ${creepDefinition.behaviour} creep. Aborted.` ));
        return;
    }
    // queue creep for spawning
    let queue = room['spawnQueue' + queueName] || room.spawnQueueLow;
    queue.push(creepSetup);
    // save queued creep to task memory
    if( onQueued ) onQueued(creepSetup);
};
const cache = {};
