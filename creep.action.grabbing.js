// grab loose minerals and energy while en route
let action = new Creep.Action('grabbing');
module.exports = action;
action.isValidAction = function(creep){
    return creep.sum < creep.carryCapacity;
};
action.isValidTarget = function(target){
    return (target != null && target.amount);
};
action.isAddableAction = function(creep){
    return !creep.data.actionName || action.addableActions[creep.data.actionName];
};
action.isAddableTarget = function(target, creep){
    // TODO no path or check target for direction along current path
    return true;
};
action.newTarget = function(creep){
    const targetBucket = action.defaultStrategy.targetBucket(creep);
    // TODO choose smallest pile in direction of next movement
    return target;
};
action.work = function(creep){
    var result = creep.pickup(creep.target);
    if( result == OK ){
        if( creep.sum < creep.carryCapacity ) {
            // is there another in range?
            let loot = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
                filter: (o) => o.resourceType != RESOURCE_ENERGY && this.isAddableTarget(o, creep)
            });
            if( !loot || loot.length < 1 ) loot = creep.pos.findInRange(FIND_DROPPED_ENERGY, 1, {
                filter: (o) => this.isAddableTarget(o, creep)
            });
            if( loot && loot.length > 0 ) {
                this.assign(creep, loot[0]);
                return result;
            }
        }
        // unregister
        delete creep.data.actionName;
        delete creep.data.targetId;
    }
    return result;
};
action.onAssignment = function(creep, target) {
    if( SAY_ASSIGNMENT ) creep.say(String.fromCharCode(128080), SAY_PUBLIC);
};
action.defaultStrategy = {
    addableActions: {
        charging: true,
        dismantling: true,
        feeding: true,
        fortifying: true,
        fueling: true,
        idle: true,
        picking: true,
        recycling: true,
        repairing: true,
        storing: true,
        travelling: true,
        withdrawing: true,
        // do not add with scheduled energy transfers like uncharging
    },
    maxTargetRange: 4,
    targetBucket: function(creep) {
        const range = action.defaultStrategy.maxTargetRange;
        return creep.room.lookForAtArea(LOOK_RESOURCES, creep.pos.y - range, creep.pos.x - range,
            creep.pos.y + range, creep.pos.x + range, true);
    }
};
