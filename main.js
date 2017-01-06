/* https://github.com/ScreepsOCS/screeps.behaviour-action-pattern */

function looseBindAll(thisArg, keys) {
    const iterKeys = keys ? keys : _.keys(thisArg);

    for (const fn of iterKeys) {
        if (typeof thisArg[fn] === "function") {
            const original = thisArg[fn];
            thisArg[fn] = thisArg[fn].bind(thisArg);
            thisArg[fn].unbound = original;
        }
    }

    return thisArg;
}

module.exports.loop = function () {
    // ensure required memory namespaces
    if (Memory.modules === undefined) 
        Memory.modules = {};
    if (Memory.modules.viral === undefined) 
        Memory.modules.viral = {};
    if (Memory.modules.internalViral === undefined) 
        Memory.modules.internalViral = {};
    // check if a path is valid
    global.validatePath = path => {
        let mod;
        try {
            mod = require(path);
        }
        catch (e) {
            mod = null;
        }
        return mod != null;
    };
    // evaluate existing module overrides and store them to memory. 
    // return current module path to use for require
    global.getPath = (modName, reevaluate = false) => {
        if( reevaluate || !Memory.modules[modName] ){
            // find base file
            let path = './custom.' + modName;
            if(!validatePath(path)) {
                path = './internal.' + modName;
                if(!validatePath(path)) 
                    path = './' + modName;
            }
            Memory.modules[modName] = path;
            // find viral file
            path = './internalViral.' + modName;
            if(validatePath(path))
                Memory.modules.internalViral[modName] = true;
            else if( Memory.modules.internalViral[modName] )
                delete Memory.modules.internalViral[modName];
            path = './viral.' + modName;
            if(validatePath(path))
                Memory.modules.viral[modName] = true;
            else if( Memory.modules.viral[modName] )
                delete Memory.modules.viral[modName];
        }
        return Memory.modules[modName];
    };
    // try to require a module. Log errors.
    global.tryRequire = (path, silent = false) => {
        let mod;
        try{
            mod = require(path);
        } catch(e) {
            if( e.message && e.message.indexOf('Unknown module') > -1 ){
                if(!silent) console.log(`Module "${path}" not found!`);
            } else if(mod == null) {
                console.log(`Error loading module "${path}"!<br/>${e.toString()}`);
            }
            mod = null;
        }
        return mod;
    };
    // partially override a module using a registered viral file
    global.infect = (mod, namespace, modName, bindAll) => {
        if( Memory.modules[namespace][modName] ) {
            // get module from stored viral override path
            let viralOverride = tryRequire(`./${namespace}.${modName}`);
            // override, _.create preserves mod as the __proto__
            if( viralOverride ) {
                mod = _.create(mod, viralOverride);
                if( bindAll ) mod = looseBindAll(mod, _.keys(viralOverride));
            }
            // cleanup
            else delete Memory.modules[namespace][modName];
        }
        return mod;
    };
    // loads (require) a module. use this function anywhere you want to load a module.
    // respects custom and viral overrides
    // the mod can inherit and bind to a provided prototype
    global.load = (modName, prototype) => {
        // read stored module path
        let path = getPath(modName);
        // try to load module
        let mod = tryRequire(path, true);
        if( !mod ) {
            // re-evaluate path
            path = getPath(modName, true);
            // try to load module. Log error to console.
            mod = tryRequire(path);
        }
        if( mod ) {
            if( prototype ) {
                mod = looseBindAll(_.create(prototype, mod), _.keys(mod));
            }
            // load viral overrides
            mod = infect(mod, 'internalViral', modName, !!prototype);
            mod = infect(mod, 'viral', modName, !!prototype);
        }
        return mod;
    };

    // initialize global & parameters
    let params = load("parameter");
    let glob = load("global");
    glob.init(params);
    // Extend Server Objects
    Extensions.extend();
    Creep.extend();
    Room.extend();
    Spawn.extend();
    FlagDir.extend();
    if( glob.extend ) glob.extend();
    // use a viral.global.js module to implement your own custom function
    if( glob.custom ) glob.custom();

    // Register task hooks
    Task.register();

    // Analyze environment
    Population.loop();
    FlagDir.loop();
    Room.loop();

    // Execution
    Creep.loop();
    Spawn.loop();

    // Evaluation
    if( !Memory.statistics || ( Memory.statistics.tick && Memory.statistics.tick + TIME_REPORT <= Game.time ))
        load("statistics").loop();
    processReports();
    Game.cacheTime = Game.time;
};
