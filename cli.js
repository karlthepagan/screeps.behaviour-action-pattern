const cli = load('cli.api');

module.exports = new Proxy(cli.ROOT, cli);

// TODO erase construction sites
// TODO list spawn queues in all rooms
// TODO mark hostile rooms
// TODO explain what all creeps in room are doing
// TODO recycle an idle proximity creep
// TODO report on all creeps by role name