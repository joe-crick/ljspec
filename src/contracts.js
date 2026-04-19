import { getSpec, isValid, conform, explain } from "./core.js";
import { ContractError } from "./errors.js";

const contractRegistry = new Map();

// --- Wishful Thinking: High-Level Entry Points ---

export function fdef(name, { args, ret, fn }) {
  const contract = createContractDefinition(name, { args, ret, fn });
  registerContract(name, contract);
  return contract;
}

export function instrument(fnToWrap, nameOrContract, options = {}) {
  const contract = resolveContract(nameOrContract);
  return createInstrumentedWrapper(fnToWrap, contract, options);
}

export function getContract(nameOrContract) {
  return resolveContract(nameOrContract);
}

// --- Implementation: Fine-Grained Named Functions ---

function createContractDefinition(name, { args, ret, fn }) {
  return {
    name,
    args: args ? getSpec(args) : null,
    ret: ret ? getSpec(ret) : null,
    fn, // (argsArray, result) => boolean
  };
}

function resolveContract(nameOrContract) {
  if (isString(nameOrContract)) return lookupContract(nameOrContract);
  return nameOrContract;
}

function createInstrumentedWrapper(fn, contract, options) {
  const config = getInstrumentationConfig(options);
  if (!config.enabled) return fn;

  const wrapper = function (...args) {
    validateInboundArguments(contract, args, config.onError);

    const effectiveArgs = getEffectiveArguments(contract, args, config.conformArgs);
    const result = invokeWrappedFunction(fn, this, effectiveArgs);

    if (isPromiseLike(result)) {
      return result.then((resolved) => finalizeResult(contract, resolved, effectiveArgs, config));
    }

    return finalizeResult(contract, result, effectiveArgs, config);
  };

  attachMetadata(wrapper, fn, contract, config);
  return wrapper;
}

function getInstrumentationConfig(options) {
  return {
    conformArgs: options.conformArgs || false,
    conformReturn: options.conformReturn || false,
    enabled: options.enabled !== false,
    onError: options.onError || defaultErrorHandler,
  };
}

function validateInboundArguments(contract, args, onError) {
  if (hasArgsSpec(contract) && !isValid(contract.args, args)) {
    onError(createContractError("args", contract, args, { args }));
  }
}

function getEffectiveArguments(contract, args, shouldConform) {
  return hasArgsSpec(contract) && shouldConform ? conform(contract.args, args) : args;
}

function invokeWrappedFunction(fn, context, args) {
  return fn.apply(context, args);
}

function finalizeResult(contract, result, args, config) {
  validateOutboundReturn(contract, result, args, config.onError);
  const effectiveResult = getEffectiveResult(contract, result, config.conformReturn);

  validateRelationalConstraint(contract, args, effectiveResult, config.onError);

  return effectiveResult;
}

function validateOutboundReturn(contract, result, args, onError) {
  if (hasRetSpec(contract) && !isValid(contract.ret, result)) {
    onError(createContractError("ret", contract, result, { args, result }));
  }
}

function getEffectiveResult(contract, result, shouldConform) {
  return hasRetSpec(contract) && shouldConform ? conform(contract.ret, result) : result;
}

function validateRelationalConstraint(contract, args, result, onError) {
  if (hasFnPredicate(contract) && !contract.fn(args, result)) {
    onError(createContractError("fn", contract, null, { args, result }));
  }
}

// --- Construction & Registry Helpers ---

const registerContract = (name, contract) => contractRegistry.set(name, contract);
const lookupContract = (name) => {
  const contract = contractRegistry.get(name);
  if (!contract) throw new Error(`Contract not found: ${name}`);
  return contract;
};

const hasArgsSpec = (contract) => !!contract.args;
const hasRetSpec = (contract) => !!contract.ret;
const hasFnPredicate = (contract) => !!contract.fn;

const isString = (v) => typeof v === "string";
const isPromiseLike = (v) => !!v && typeof v.then === "function";
const defaultErrorHandler = (err) => {
  throw err;
};

function createContractError(kind, contract, value, context) {
  const messages = {
    args: () =>
      `Invalid arguments for ${contract.name || "anonymous"}: ${explain(contract.args, value)}`,
    ret: () =>
      `Invalid return value for ${contract.name || "anonymous"}: ${explain(contract.ret, value)}`,
    fn: () => `Relational predicate failed for ${contract.name || "anonymous"}`,
  };

  return new ContractError(messages[kind](), {
    kind,
    spec: kind === "args" ? contract.args : kind === "ret" ? contract.ret : null,
    value,
    ...context,
  });
}

function attachMetadata(wrapper, original, contract, config) {
  Object.defineProperties(wrapper, {
    raw: {
      value: original,
      configurable: false,
      enumerable: false,
      writable: false,
    },
    contract: {
      value: contract,
      configurable: false,
      enumerable: false,
      writable: false,
    },
    instrumentation: {
      value: { ...config },
      configurable: false,
      enumerable: false,
      writable: false,
    },
  });
}
