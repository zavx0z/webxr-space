// node_modules/@zavx0z/context/dist/index.js
function contextFromSchema(schema) {
  const isPrimitiveOrNull = (v) => v === null || typeof v !== "object" && typeof v !== "function";
  const assertNonObject = (value, msg) => {
    if (!isPrimitiveOrNull(value))
      throw new TypeError(msg);
  };
  const isFlatPrimitiveArray = (v) => Array.isArray(v) && v.every(isPrimitiveOrNull);
  const freezeArray = (arr) => Object.freeze(arr.slice());
  const data = {};
  const updateSubscribers = new Set;
  function initializeContext(schema2) {
    for (const key in schema2) {
      const def = schema2[key];
      if (!def)
        continue;
      let val;
      if ("default" in def && def.default !== undefined) {
        if (def.type === "array") {
          if (!isFlatPrimitiveArray(def.default)) {
            throw new TypeError(`[Context] "${String(key)}": default для типа array должен быть плоским массивом примитивов.`);
          }
          val = freezeArray(def.default);
        } else {
          assertNonObject(def.default, `[Context] "${String(key)}": default должен быть примитивом или null (объекты запрещены).`);
          val = def.default;
        }
      } else {
        def.type === "string" && (val = def.required ? "" : null);
        def.type === "number" && (val = def.required ? 0 : null);
        def.type === "boolean" && (val = def.required ? false : null);
        def.type === "enum" && (val = def.required ? def.values?.[0] : null);
        def.type === "array" && (val = def.required ? freezeArray([]) : null);
      }
      data[key] = val;
    }
    Object.seal(data);
  }
  function createReadOnlyContext() {
    const view = {};
    for (const key of Object.keys(schema)) {
      Object.defineProperty(view, key, {
        enumerable: true,
        configurable: false,
        get: () => data[key]
      });
    }
    return Object.freeze(view);
  }
  function update(values) {
    const entries = Object.entries(values).filter(([, v]) => v !== undefined);
    const updated = {};
    for (const [key, nextRaw] of entries) {
      if (!(key in data))
        continue;
      const def = schema[key];
      let next = nextRaw;
      if (nextRaw === null && def?.required) {
        throw new TypeError(`[Context.update] "${key}": поле не может быть null`);
      }
      if (def?.type === "array") {
        if (nextRaw === null) {
          next = nextRaw;
        } else if (!isFlatPrimitiveArray(nextRaw)) {
          throw new TypeError(`[Context.update] "${key}": ожидается плоский массив примитивов (string | number | boolean | null).`);
        } else {
          const defaultArray = def.default;
          if (defaultArray && Array.isArray(defaultArray) && defaultArray.length > 0) {
            const expectedType = typeof defaultArray[0];
            const hasTypeMismatch = nextRaw.some((item) => typeof item !== expectedType);
            if (hasTypeMismatch) {
              throw new TypeError(`[Context.update] "${key}": ожидается массив элементов типа '${expectedType}', получен массив с элементами разных типов.`);
            }
          }
          next = freezeArray(nextRaw);
        }
      } else if (def?.type === "enum") {
        const allowed = def.values;
        if (nextRaw === null) {
          next = nextRaw;
        } else if (!allowed?.includes(nextRaw)) {
          const variants = Array.isArray(allowed) ? allowed.map(String).join("' или '") : String(allowed);
          throw new TypeError(`[Context.update] "${key}": должно быть '${variants}', получено '${String(nextRaw)}'`);
        } else {
          next = nextRaw;
        }
      } else {
        assertNonObject(nextRaw, `[Context.update] "${key}": объекты и функции запрещены (используйте core или сериализуйте).`);
      }
      const prev = data[key];
      if (prev !== next) {
        data[key] = next;
        updated[key] = next;
      }
    }
    if (Object.keys(updated).length > 0) {
      for (const cb of updateSubscribers)
        cb(updated);
    }
    return updated;
  }
  function onUpdate(callback) {
    updateSubscribers.add(callback);
    return () => updateSubscribers.delete(callback);
  }
  function getSnapshot() {
    const context = {};
    for (const [key, value] of Object.entries(schema)) {
      context[key] = {
        type: value.type,
        ...value.required && { required: true },
        ...value.default && value.default !== undefined && { default: value.default },
        ...value.label && { label: value.label },
        ...value.values && { values: value.values },
        ...value.id && { id: true },
        ...value.data && { data: value.data },
        value: readOnlyContext[key]
      };
    }
    return context;
  }
  initializeContext(schema);
  const readOnlyContext = createReadOnlyContext();
  return {
    schema,
    context: readOnlyContext,
    update,
    onUpdate,
    get snapshot() {
      return getSnapshot();
    }
  };
}
function createPrimitiveType(type) {
  return {
    optional(defaultOrOptions, maybeOptions) {
      const hasDefault = defaultOrOptions !== undefined && typeof defaultOrOptions !== "object";
      const options = (hasDefault ? maybeOptions : defaultOrOptions) || {};
      const base = { type };
      if (hasDefault)
        base.default = defaultOrOptions;
      if (options.label !== undefined)
        base.label = options.label;
      return base;
    },
    required(defaultValue, options = {}) {
      const base = { type, required: true, default: defaultValue };
      if (options.label !== undefined)
        base.label = options.label;
      if (options.id === true)
        base.id = true;
      return base;
    },
    type
  };
}
var createArrayType = {
  optional(defaultOrOptions, maybeOptions) {
    const isDefaultArray = Array.isArray(defaultOrOptions);
    const options = (isDefaultArray ? maybeOptions : defaultOrOptions) || {};
    const base = { type: "array" };
    if (isDefaultArray)
      base.default = defaultOrOptions;
    if (options.label !== undefined)
      base.label = options.label;
    if (typeof options.data === "string" && options.data.length > 0)
      base.data = options.data;
    return base;
  },
  required(defaultValue, options = {}) {
    const base = { type: "array", required: true, default: defaultValue };
    if (options.label !== undefined)
      base.label = options.label;
    if (typeof options.data === "string" && options.data.length > 0)
      base.data = options.data;
    return base;
  }
};
var createEnumType = (...values) => ({
  optional(defaultOrOptions, maybeOptions) {
    const hasDefault = defaultOrOptions !== undefined && typeof defaultOrOptions !== "object";
    const options = (hasDefault ? maybeOptions : defaultOrOptions) || {};
    const base = { type: "enum", values };
    if (hasDefault)
      base.default = defaultOrOptions;
    if (options.label !== undefined)
      base.label = options.label;
    return base;
  },
  required(defaultValue, options = {}) {
    const base = { type: "enum", required: true, default: defaultValue, values };
    if (options.label !== undefined)
      base.label = options.label;
    if (options.id === true)
      base.id = true;
    return base;
  }
});
var types = {
  string: createPrimitiveType("string"),
  number: createPrimitiveType("number"),
  boolean: createPrimitiveType("boolean"),
  array: createArrayType,
  enum: Object.assign((...values) => {
    const enumBase = createEnumType(...values);
    return Object.assign((defaultValue, options) => enumBase.optional(defaultValue, options), enumBase, { type: "enum" });
  }, { type: "enum" })
};
var ToDo;
((ToDo2) => {
  ToDo2["editSchema"] = "Редактирование схемы контекста";
  ToDo2["description"] = "Описание поля (для отображения в UI)";
})(ToDo ||= {});

// core/states.ts
var checkTransition = (conditions, context) => {
  const evaluateCondition = (condition, value) => {
    if (typeof condition === "string" || typeof condition === "number" || typeof condition === "boolean") {
      return value === condition;
    }
    if (condition === null) {
      return value === null;
    }
    if (condition instanceof RegExp) {
      return typeof value === "string" && condition.test(value);
    }
    if (typeof condition === "object" && condition !== null) {
      return evaluateComplexCondition(condition, value);
    }
    return false;
  };
  const evaluateComplexCondition = (condition, value) => {
    if ("null" in condition) {
      if (condition.null !== (value === null)) {
        return false;
      }
    }
    if (typeof value === "string") {
      if ("eq" in condition && value !== condition.eq) {
        return false;
      }
      if ("startsWith" in condition && !value.startsWith(condition.startsWith)) {
        return false;
      }
      if ("endsWith" in condition && !value.endsWith(condition.endsWith)) {
        return false;
      }
      if ("include" in condition && !value.includes(condition.include)) {
        return false;
      }
      if ("notInclude" in condition && value.includes(condition.notInclude)) {
        return false;
      }
      if ("pattern" in condition && !condition.pattern.test(value)) {
        return false;
      }
      if ("length" in condition) {
        const length = condition.length;
        if (typeof length === "number" && value.length !== length) {
          return false;
        }
        if (typeof length === "object") {
          if (length.min !== undefined && value.length < length.min) {
            return false;
          }
          if (length.max !== undefined && value.length > length.max) {
            return false;
          }
        }
      }
    }
    if (typeof value === "number") {
      if ("eq" in condition && value !== condition.eq) {
        return false;
      }
      if ("gt" in condition && value <= condition.gt) {
        return false;
      }
      if ("gte" in condition && value < condition.gte) {
        return false;
      }
      if ("lt" in condition && value >= condition.lt) {
        return false;
      }
      if ("lte" in condition && value > condition.lte) {
        return false;
      }
      if ("between" in condition) {
        const [min, max] = condition.between;
        if (value < min || value > max) {
          return false;
        }
      }
    }
    if (typeof value === "boolean") {
      if ("eq" in condition && value !== condition.eq) {
        return false;
      }
      if ("logicalEq" in condition && !!value !== condition.logicalEq) {
        return false;
      }
    }
    if (Array.isArray(value)) {
      if ("length" in condition) {
        const length = condition.length;
        if (typeof length === "number" && value.length !== length) {
          return false;
        }
        if (typeof length === "object") {
          if (length.min !== undefined && value.length < length.min) {
            return false;
          }
          if (length.max !== undefined && value.length > length.max) {
            return false;
          }
        }
      }
      if ("includes" in condition && !value.includes(condition.includes)) {
        return false;
      }
      if ("notIncludes" in condition && value.includes(condition.notIncludes)) {
        return false;
      }
      if ("isEmpty" in condition && value.length === 0 !== condition.isEmpty) {
        return false;
      }
      if ("every" in condition) {
        const everyCondition = condition.every;
        if (!value.every((item) => evaluateArrayItemCondition(everyCondition, item))) {
          return false;
        }
      }
      if ("some" in condition) {
        const someCondition = condition.some;
        if (!value.some((item) => evaluateArrayItemCondition(someCondition, item))) {
          return false;
        }
      }
    }
    return true;
  };
  const evaluateArrayItemCondition = (condition, item) => {
    if (typeof item === "number") {
      if ("gt" in condition && item <= condition.gt) {
        return false;
      }
      if ("gte" in condition && item < condition.gte) {
        return false;
      }
      if ("lt" in condition && item >= condition.lt) {
        return false;
      }
      if ("lte" in condition && item > condition.lte) {
        return false;
      }
      if ("eq" in condition && item !== condition.eq) {
        return false;
      }
    }
    if (typeof item === "string") {
      if ("include" in condition && !item.includes(condition.include)) {
        return false;
      }
      if ("startsWith" in condition && !item.startsWith(condition.startsWith)) {
        return false;
      }
      if ("endsWith" in condition && !item.endsWith(condition.endsWith)) {
        return false;
      }
      if ("pattern" in condition && !condition.pattern.test(item)) {
        return false;
      }
    }
    return true;
  };
  for (const [field, condition] of Object.entries(conditions)) {
    const value = context[field];
    if (!evaluateCondition(condition, value))
      return false;
  }
  return true;
};

// core/processes.ts
function processesFromSchema(schema) {
  const processes = {};
  for (const [processName, processData] of Object.entries(schema)) {
    if (processData && typeof processData === "object") {
      const process = {
        action: new Function("return " + processData.action.src)(),
        ...processData.success && {
          success: new Function("return " + processData.success.src)()
        },
        ...processData.error && {
          error: new Function("return " + processData.error.src)()
        },
        ...processData.label && { title: processData.label },
        ...processData.desc && { description: processData.desc }
      };
      processes[processName] = process;
    }
  }
  return {
    getProcess: (name) => processes[name],
    hasProcess: (name) => (name in processes),
    getAllProcesses: () => ({ ...processes }),
    getProcessNames: () => Object.keys(processes)
  };
}

// core/reactions.ts
function reactionsFromSchema(schema) {
  const reactions = [];
  const stateToReactions = {};
  const checkCondition = {
    string(value, condition) {
      if (typeof condition === "string") {
        return value === condition;
      }
      if (condition instanceof RegExp) {
        return condition.test(value);
      }
      if (typeof condition === "object" && condition !== null) {
        if (condition.eq !== undefined && value !== condition.eq)
          return false;
        if (condition.notEq !== undefined && value === condition.notEq)
          return false;
        if (condition.startsWith !== undefined && !value.startsWith(condition.startsWith))
          return false;
        if (condition.endsWith !== undefined && !value.endsWith(condition.endsWith))
          return false;
        if (condition.include !== undefined && !value.includes(condition.include))
          return false;
        if (condition.notInclude !== undefined && value.includes(condition.notInclude))
          return false;
        if (condition.notStartsWith !== undefined && value.startsWith(condition.notStartsWith))
          return false;
        if (condition.notEndsWith !== undefined && value.endsWith(condition.notEndsWith))
          return false;
        if (condition.pattern !== undefined && !condition.pattern.test(value))
          return false;
        if (condition.length !== undefined) {
          if (typeof condition.length === "number") {
            if (value.length !== condition.length)
              return false;
          } else {
            if (condition.length.min !== undefined && value.length < condition.length.min)
              return false;
            if (condition.length.max !== undefined && value.length > condition.length.max)
              return false;
          }
        }
        if (condition.between !== undefined) {
          const [min, max] = condition.between;
          if (value < min || value > max)
            return false;
        }
      }
      return true;
    },
    number(value, condition) {
      if (typeof condition === "number") {
        return value === condition;
      }
      if (typeof condition === "object" && condition !== null) {
        if (condition.eq !== undefined && value !== condition.eq)
          return false;
        if (condition.notEq !== undefined && value === condition.notEq)
          return false;
        if (condition.gt !== undefined && value <= condition.gt)
          return false;
        if (condition.gte !== undefined && value < condition.gte)
          return false;
        if (condition.lt !== undefined && value >= condition.lt)
          return false;
        if (condition.lte !== undefined && value > condition.lte)
          return false;
        if (condition.notGt !== undefined && value > condition.notGt)
          return false;
        if (condition.notGte !== undefined && value >= condition.notGte)
          return false;
        if (condition.notLt !== undefined && value < condition.notLt)
          return false;
        if (condition.notLte !== undefined && value <= condition.notLte)
          return false;
        if (condition.between !== undefined) {
          const [min, max] = condition.between;
          if (value < min || value > max)
            return false;
        }
      }
      return true;
    },
    boolean(value, condition) {
      if (typeof condition === "boolean") {
        return value === condition;
      }
      if (typeof condition === "object" && condition !== null) {
        if (condition.eq !== undefined && value !== condition.eq)
          return false;
        if (condition.notEq !== undefined && value === condition.notEq)
          return false;
        if (condition.logicalEq !== undefined && Boolean(value) !== condition.logicalEq)
          return false;
      }
      return true;
    },
    array(value, condition) {
      if (Array.isArray(condition)) {
        return JSON.stringify(value) === JSON.stringify(condition);
      }
      if (typeof condition === "object" && condition !== null) {
        if (condition.length !== undefined) {
          if (typeof condition.length === "number") {
            if (value.length !== condition.length)
              return false;
          } else {
            if (condition.length.min !== undefined && value.length < condition.length.min)
              return false;
            if (condition.length.max !== undefined && value.length > condition.length.max)
              return false;
          }
        }
        if (condition.includes !== undefined && !value.includes(condition.includes))
          return false;
        if (condition.notIncludes !== undefined && value.includes(condition.notIncludes))
          return false;
        if (condition.isEmpty !== undefined && (condition.isEmpty ? value.length !== 0 : value.length === 0))
          return false;
        if (condition.every !== undefined) {
          if (!value.every((item) => {
            if (typeof item === "number")
              return checkCondition.number(item, condition.every);
            if (typeof item === "string")
              return checkCondition.string(item, condition.every);
            return false;
          }))
            return false;
        }
        if (condition.some !== undefined) {
          if (!value.some((item) => {
            if (typeof item === "number")
              return checkCondition.number(item, condition.some);
            if (typeof item === "string")
              return checkCondition.string(item, condition.some);
            return false;
          }))
            return false;
        }
      }
      return true;
    }
  };
  function createFilterFn(conditions) {
    function checkValueCondition(value, condition) {
      if (condition === null) {
        return value === null;
      }
      if (condition === undefined) {
        return value === undefined;
      }
      if (typeof condition === "object" && condition !== null && condition.null !== undefined) {
        if (condition.null && value !== null)
          return false;
        if (!condition.null && value === null)
          return false;
        return true;
      }
      if (typeof value === "string") {
        return checkCondition.string(value, condition);
      }
      if (typeof value === "number") {
        return checkCondition.number(value, condition);
      }
      if (typeof value === "boolean") {
        return checkCondition.boolean(value, condition);
      }
      if (Array.isArray(value)) {
        return checkCondition.array(value, condition);
      }
      if (typeof condition === "object" && condition !== null) {
        if (condition.eq !== undefined || condition.gt !== undefined || condition.startsWith !== undefined) {
          return false;
        }
      }
      return JSON.stringify(value) === JSON.stringify(condition);
    }
    return ({ meta, actor, timestamp, patch }) => {
      if (conditions.meta !== undefined && !checkCondition.string(meta, conditions.meta))
        return false;
      if (conditions.actor !== undefined && !checkCondition.string(actor, conditions.actor))
        return false;
      if (conditions.timestamp !== undefined && !checkCondition.number(timestamp, conditions.timestamp))
        return false;
      if (conditions.op !== undefined && patch.op !== conditions.op)
        return false;
      if (conditions.path !== undefined && patch.path !== conditions.path)
        return false;
      if (conditions.value !== undefined && !checkValueCondition(patch.value, conditions.value))
        return false;
      return true;
    };
  }
  for (const [reactionId, reactionData] of Object.entries(schema.reactions)) {
    if (reactionData && typeof reactionData === "object") {
      const updateFn = new Function("return " + reactionData.src)();
      const filterFn = createFilterFn(reactionData.cond);
      const reaction = {
        title: reactionData.label,
        ...reactionData.desc && { description: reactionData.desc },
        update: updateFn,
        filter: filterFn,
        states: []
      };
      reactions.push(reaction);
      for (const [state, reactionIds] of Object.entries(schema.states)) {
        if (reactionIds.includes(reactionId)) {
          reaction.states.push(state);
          if (!stateToReactions[state])
            stateToReactions[state] = [];
          stateToReactions[state].push(reactionId);
        }
      }
    }
  }
  return {
    run: (params) => {
      for (const reaction of reactions) {
        if (!reaction.states.includes(params.state))
          continue;
        if (reaction.filter({
          meta: params.meta,
          actor: params.actor,
          timestamp: params.timestamp,
          patch: params.patch
        })) {
          reaction.update({
            update: params.update,
            context: params.context,
            core: params.core,
            meta: params.meta,
            actor: params.actor,
            timestamp: params.timestamp,
            patch: params.patch,
            state: params.state
          });
        }
      }
    },
    hasReactions: () => reactions.length > 0,
    getAllReactions: () => reactions.map(({ states, ...reaction }) => reaction),
    getReactions: (state) => {
      return reactions.filter((reaction) => reaction.states.includes(state)).map(({ states, ...reaction }) => reaction);
    }
  };
}

// actor.ts
class Actor {
  name;
  id;
  description;
  context;
  state;
  processes;
  reactions;
  render;
  static coreWeakMap = new WeakMap;
  static channel = new BroadcastChannel("channel");
  constructor(name, id, description, context, state, processes, reactions, render) {
    this.name = name;
    this.id = id;
    this.description = description;
    this.context = context;
    this.state = state;
    this.processes = processes;
    this.reactions = reactions;
    this.render = render;
    this.update = this.update.bind(this);
    this.#init();
  }
  #init() {
    if (this.reactions.hasReactions())
      Actor.channel.addEventListener("message", this.handleReactionMessage);
    Actor.channel.postMessage({
      meta: this.name,
      actor: this.id,
      timestamp: Date.now(),
      patches: [
        {
          op: "add",
          path: "/",
          value: {
            context: this.context.snapshot,
            state: this.state.current,
            process: this.process
          }
        }
      ]
    });
    const transition = this.state.states[this.state.current];
    if (transition) {
      const process = this.processes.getProcess(this.state.current);
      if (process) {
        this.setProcess(true);
        this.executeAction(process);
        this.transition();
      } else {
        this.transition();
      }
    }
  }
  get core() {
    return Actor.coreWeakMap.get(this) ?? {};
  }
  set core(value) {
    Actor.coreWeakMap.set(this, value);
  }
  stateListeners = new Set;
  setState(state) {
    this.state.current = state;
    if (this.stateListeners.size > 0) {
      for (const listener of this.stateListeners)
        listener(state);
    }
  }
  onStateChange(listener) {
    this.stateListeners.add(listener);
    return this.unsubscribeState;
  }
  unsubscribeState(listener) {
    this.stateListeners.delete(listener);
  }
  process = false;
  setProcess(process) {
    if (this.process === process)
      return;
    this.process = process;
    if (!process) {
      this.transition();
    }
  }
  update(context) {
    const updated = this.context.update(context);
    if (Object.keys(updated).length > 0) {
      Actor.channel.postMessage(Actor.updateContextMessage(this.name, this.id, updated));
    }
    return updated;
  }
  executeAction(process) {
    try {
      Actor.channel.postMessage(Actor.stateBeforeActionMessage(this.name, this.id, this.state.current));
      const result = process.action({
        schema: this.context.schema,
        context: this.context.context,
        core: this.core
      });
      if (result instanceof Promise) {
        result.then((data) => {
          if (process.success)
            process.success({ update: this.update, data });
        }).catch((error) => {
          if (process.error) {
            if (error instanceof Error) {
              process.error({ update: this.update, error });
            } else if (typeof error === "string") {
              process.error({ update: this.update, error: new Error(error) });
            } else {
              throw new Error(`Передан неизвестный тип ошибки в состоянии: ${this.state.current}`);
            }
          } else
            throw new Error(`Обработчик ошибки не найден для состояния: ${this.state.current} 
 ${error}`);
        }).finally(() => {
          Actor.channel.postMessage(Actor.stateAfterActionMessage(this.name, this.id, this.state.current));
          this.setProcess(false);
        });
      } else {
        if (process.success)
          process.success({ update: this.update, data: result });
        Actor.channel.postMessage(Actor.stateAfterActionMessage(this.name, this.id, this.state.current));
        this.setProcess(false);
      }
    } catch (error) {
      console.error(error);
      if (error instanceof Error)
        process.error?.({ update: this.update, error });
      Actor.channel.postMessage(Actor.stateAfterActionMessage(this.name, this.id, this.state.current));
      this.setProcess(false);
    }
  }
  transition() {
    const transition = this.state.states[this.state.current];
    if (!transition)
      return;
    for (const [state, conditions] of Object.entries(transition)) {
      if (checkTransition(conditions, this.context.context)) {
        const process = this.processes.getProcess(state);
        if (this.process)
          return;
        if (process) {
          this.setProcess(true);
          this.setState(state);
          this.executeAction(process);
        } else {
          this.setState(state);
          Actor.channel.postMessage(Actor.stateAfterActionMessage(this.name, this.id, state));
          if (!this.process)
            this.transition();
        }
        break;
      }
    }
  }
  get snapshot() {
    return {
      name: this.name,
      state: this.state.current,
      process: this.process,
      states: this.state.states,
      context: this.context.snapshot,
      ...this.description ? { description: this.description } : {}
    };
  }
  handleReactionMessage(ev) {
    const { data } = ev;
    if (!this.reactions.hasReactions())
      return;
    if (data.meta === this.name && data.actor === this.id)
      return;
    for (const patch of data.patches) {
      this.reactions.run({
        context: this.context.context,
        core: this.core,
        meta: data.meta,
        actor: data.actor,
        timestamp: data.timestamp,
        patch,
        state: this.state.current,
        update: this.update
      });
    }
  }
  static initMessage(meta, actor, snapshot) {
    return { meta, actor, timestamp: Date.now(), patches: [{ op: "add", path: "/", value: snapshot }] };
  }
  static updateContextMessage(meta, actor, updated) {
    return { meta, actor, timestamp: Date.now(), patches: [{ op: "replace", path: "/context", value: updated }] };
  }
  static stateBeforeActionMessage(meta, actor, state) {
    return { meta, actor, timestamp: Date.now(), patches: [{ op: "test", path: "/state", value: state }] };
  }
  static stateAfterActionMessage(meta, actor, state) {
    return { meta, actor, timestamp: Date.now(), patches: [{ op: "replace", path: "/state", value: state }] };
  }
  static fromSchema(meta, id) {
    return new Actor(meta.name, id, meta.description, contextFromSchema(meta.context), { current: Object.keys(meta.states)[0], states: meta.states }, processesFromSchema(meta.processes ?? {}), reactionsFromSchema(meta.reactions ?? { reactions: {}, states: {} }), meta.render ?? []);
  }
}
export {
  Actor
};
