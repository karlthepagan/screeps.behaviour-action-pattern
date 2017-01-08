/**
 * Symbol.toPrimitive is the key! everything triggers when that evaluates
 */
const CLI = {
    ROOT:{},
    handlers: {},
    register: function(command, func, ...resolvers) { // TODO arity? wraps function and protects empty execution
        resolvers = resolvers; // TODO resolvers / arity?
        // TODO proxy chain builder?
        const parts = command.split(".");
        let node = this.handlers;
        for (let i = 0; i < parts.length; i++) {
            const addr = parts[i];
            if (typeof node[addr] === "function" || (i === parts.length - 1 && node[addr])) {
                throw new Error("already registered: " + parts.slice(0, i).join("."));
            }

            if (node[addr]) {
                node = node[addr] as CommandTree;
            } else if (i === parts.length - 1) {
                node[addr] = func;
            } else {
                node = node[addr] = {};
            }
        }
    },
    get: function(target, p) {
        if (p === Symbol.toPrimitive) {
            // resolve builder stack
        }

        const node = target !== this.ROOT ? (target as CommandTree)[p] : this.handlers[p];
        if (typeof node === "function") {
            node();
            // returning proxy allows args (better with arity option)
        }
        return new Proxy(node, this);
    },
    apply: function(target, thisArg, argArray) {
        const func = target as Function; // assert: is a function
        return func.apply(thisArg, argArray);
    }
};

module.exports = CLI;