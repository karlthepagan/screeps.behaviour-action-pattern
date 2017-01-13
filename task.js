var mod = {
    // load all task modules
    guard: load("task.guard"),
    defense: load("task.defense"),
    mining: load("task.mining"),
    claim: load("task.claim"),
    reserve: load("task.reserve"),
    attackController: load("task.attackController"),

    // register tasks (hook up into events)
    register: function () {
        let tasks = [
            Task.guard, 
            Task.defense,
            Task.claim,
            Task.reserve,
            Task.mining,
            Task.attackController
        ];
        var loop = task => {
            task.register();
        }
        _.forEach(tasks, loop);
    },
    memory: (task, s) => { // task:  (string) name of the task, s: (string) any selector for that task, could be room name, flag name, enemy name
        if( !Memory.tasks ) Memory.tasks = {};
        if( !Memory.tasks[task] ) Memory.tasks[task] = {};
        if( !Memory.tasks[task][s] ) Memory.tasks[task][s] = {};
        return Memory.tasks[task][s];
    },
    clearMemory: (task, s) => {
        if( Memory.tasks[task] && Memory.tasks[task][s] )
            delete Memory.tasks[task][s];
    }
};
module.exports = mod;
