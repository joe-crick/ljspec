export class ContractError extends Error {
  constructor(message, { kind, spec, value, args, result, cause } = {}) {
    super(message);
    this.name = "ContractError";
    this.kind = kind; // 'args' | 'ret' | 'fn'
    this.spec = spec;
    this.value = value;
    this.args = args;
    this.result = result;
    this.cause = cause;
  }
}
