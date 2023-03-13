"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  AuthenticationError: () => AuthenticationError,
  AuthorizationError: () => AuthorizationError,
  Client: () => Client,
  ClientError: () => ClientError,
  NetworkError: () => NetworkError,
  ProtocolError: () => ProtocolError,
  QueryCheckError: () => QueryCheckError,
  QueryRuntimeError: () => QueryRuntimeError,
  QueryTimeoutError: () => QueryTimeoutError,
  ServiceError: () => ServiceError,
  ServiceInternalError: () => ServiceInternalError,
  ServiceTimeoutError: () => ServiceTimeoutError,
  ThrottlingError: () => ThrottlingError,
  endpoints: () => endpoints,
  fql: () => fql
});
module.exports = __toCommonJS(src_exports);

// src/client-configuration.ts
var endpoints = {
  cloud: new URL("https://db.fauna.com"),
  preview: new URL("https://db.fauna-preview.com"),
  local: new URL("http://localhost:8443"),
  localhost: new URL("http://localhost:8443")
};

// src/client.ts
var defaultClientConfiguration = {
  max_conns: 10,
  endpoint: endpoints.cloud,
  timeout_ms: 6e4
};
var Client = class {
  clientConfiguration;
  #lastTxn;
  headers = {};
  constructor(clientConfiguration) {
    this.clientConfiguration = {
      ...defaultClientConfiguration,
      ...clientConfiguration,
      secret: this.#getSecret(clientConfiguration)
    };
    this.headers = {
      Authorization: `Bearer ${this.clientConfiguration.secret}`,
      "Content-Type": "application/json",
      "X-Format": "simple"
    };
    this.#setHeaders(this.clientConfiguration, this.headers);
  }
  #getSecret(partialClientConfig) {
    let fallback = void 0;
    if (typeof process === "object") {
      fallback = process.env["FAUNA_SECRET"];
    }
    const maybeSecret = partialClientConfig?.secret || fallback;
    if (maybeSecret === void 0) {
      throw new Error(
        `You must provide a secret to the driver. Set it in an environmental variable named FAUNA_SECRET or pass it to the Client constructor.`
      );
    }
    return maybeSecret;
  }
  async query(request, headers) {
    if ("query" in request) {
      return this.#query({ ...request, ...headers });
    }
    return this.#query(request.toQuery(headers));
  }
  async #query(queryRequest) {
    const { query, arguments: args } = queryRequest;
    this.#setHeaders(queryRequest, this.headers);
    try {
      const result = await fetch(
        `${this.clientConfiguration.endpoint.toString()}/query/1`,
        {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({ query, arguments: args }),
          keepalive: true
        }
      ).then(async (res) => res.json());
      if ("errors" in result) {
        throw new Error(JSON.stringify(result.errors[0]));
      }
      if ("error" in result) {
        throw new Error(JSON.stringify(result?.error));
      }
      const txn_time = result?.txn_time;
      const txnDate = new Date(txn_time);
      if (this.#lastTxn === void 0 && txn_time !== void 0 || txn_time !== void 0 && this.#lastTxn !== void 0 && this.#lastTxn < txnDate) {
        this.#lastTxn = txnDate;
      }
      return result;
    } catch (e) {
      throw new Error(e);
    }
  }
  #setHeaders(fromObject, headerObject) {
    for (const entry of Object.entries(fromObject)) {
      if ([
        "last_txn",
        "timeout_ms",
        "linearized",
        "max_contention_retries",
        "traceparent",
        "tags"
      ].includes(entry[0])) {
        let headerValue;
        let headerKey = `x-${entry[0].replaceAll("_", "-")}`;
        if ("tags" === entry[0]) {
          headerKey = "x-fauna-tags";
          headerValue = Object.entries(entry[1]).map((tag) => tag.join("=")).join(",");
        } else {
          if (typeof entry[1] === "string") {
            headerValue = entry[1];
          } else {
            headerValue = String(entry[1]);
          }
        }
        if ("traceparent" === entry[0]) {
          headerKey = entry[0];
        }
        headerObject[headerKey] = headerValue;
      }
    }
    if (headerObject["x-last-txn"] === void 0 && this.#lastTxn !== void 0) {
      headerObject["x-last-txn"] = this.#lastTxn.toISOString();
    }
  }
};

// src/errors.ts
var ServiceError = class extends Error {
  httpStatus;
  code;
  summary;
  constructor(failure, httpStatus) {
    super(failure.error.message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
    this.name = "ServiceError";
    this.code = failure.error.code;
    this.httpStatus = httpStatus;
    if (failure.summary) {
      this.summary = failure.summary;
    }
  }
};
var QueryRuntimeError = class extends ServiceError {
  constructor(failure, httpStatus) {
    super(failure, httpStatus);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryRuntimeError);
    }
    this.name = "QueryRuntimeError";
  }
};
var QueryCheckError = class extends ServiceError {
  constructor(failure, httpStatus) {
    super(failure, httpStatus);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryCheckError);
    }
    this.name = "QueryCheckError";
  }
};
var QueryTimeoutError = class extends ServiceError {
  stats;
  constructor(failure, httpStatus) {
    super(failure, httpStatus);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryTimeoutError);
    }
    this.name = "QueryTimeoutError";
    this.stats = failure.stats;
  }
};
var AuthenticationError = class extends ServiceError {
  constructor(failure, httpStatus) {
    super(failure, httpStatus);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
    this.name = "AuthenticationError";
  }
};
var AuthorizationError = class extends ServiceError {
  constructor(failure, httpStatus) {
    super(failure, httpStatus);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
    this.name = "AuthorizationError";
  }
};
var ThrottlingError = class extends ServiceError {
  constructor(failure, httpStatus) {
    super(failure, httpStatus);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ThrottlingError);
    }
    this.name = "ThrottlingError";
  }
};
var ServiceInternalError = class extends ServiceError {
  constructor(failure, httpStatus) {
    super(failure, httpStatus);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceInternalError);
    }
    this.name = "ServiceInternalError";
  }
};
var ServiceTimeoutError = class extends ServiceError {
  constructor(failure, httpStatus) {
    super(failure, httpStatus);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceTimeoutError);
    }
    this.name = "ServiceTimeoutError";
  }
};
var ClientError = class extends Error {
  constructor(message, options) {
    super(message, options);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ClientError);
    }
    this.name = "ClientError";
  }
};
var NetworkError = class extends Error {
  constructor(message, options) {
    super(message, options);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
    this.name = "NetworkError";
  }
};
var ProtocolError = class extends Error {
  httpStatus;
  constructor(error) {
    super(error.message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProtocolError);
    }
    this.name = "ProtocolError";
    this.httpStatus = error.httpStatus;
  }
};

// src/regex.ts
var yearpart = /(?:\d{4}|[\u2212-]\d{4,}|\+\d{5,})/;
var monthpart = /(?:0[1-9]|1[0-2])/;
var daypart = /(?:0[1-9]|[12]\d|3[01])/;
var hourpart = /(?:[01][0-9]|2[0-3])/;
var minsecpart = /(?:[0-5][0-9])/;
var decimalpart = /(?:\.\d+)/;
var datesplit = new RegExp(
  `(${yearpart.source}-(${monthpart.source})-(${daypart.source}))`
);
var timesplit = new RegExp(
  `(${hourpart.source}:${minsecpart.source}:${minsecpart.source}${decimalpart.source}?)`
);
var zonesplit = new RegExp(
  `([zZ]|[+\u2212-]${hourpart.source}(?::?${minsecpart.source}|:${minsecpart.source}:${minsecpart.source}))`
);
var plaindate = new RegExp(`^${datesplit.source}$`);
var startsWithPlaindate = new RegExp(`^${datesplit.source}`);
var datetime = new RegExp(
  `^${datesplit.source}T${timesplit.source}${zonesplit.source}$`
);

// src/values.ts
var TimeStub = class {
  isoString;
  constructor(isoString) {
    this.isoString = isoString;
  }
  static from(isoString) {
    if (typeof isoString !== "string") {
      throw new TypeError(
        `Expected string but received ${typeof isoString}: ${isoString}`
      );
    }
    const matches = datetime.exec(isoString);
    if (matches === null) {
      throw new RangeError(
        `(regex) Expected an ISO date string but received '${isoString}'`
      );
    }
    return new TimeStub(isoString);
  }
  static fromDate(date) {
    return new TimeStub(date.toISOString());
  }
  toDate() {
    const date = new Date(this.isoString);
    if (date.toString() === "Invalid Date") {
      throw new RangeError(
        "Fauna Date could not be converted to Javascript Date"
      );
    }
    return date;
  }
  toString() {
    return `TimeStub("${this.isoString}")`;
  }
};
var DateStub = class {
  dateString;
  constructor(dateString) {
    this.dateString = dateString;
  }
  static from(dateString) {
    if (typeof dateString !== "string") {
      throw new TypeError(
        `Expected string but received ${typeof dateString}: ${dateString}`
      );
    }
    const matches = plaindate.exec(dateString);
    if (matches === null) {
      throw new RangeError(
        `Expected a plain date string but received '${dateString}'`
      );
    }
    return new DateStub(matches[0]);
  }
  static fromDate(date) {
    const dateString = date.toISOString();
    const matches = startsWithPlaindate.exec(dateString);
    if (matches === null) {
      throw new ClientError(`Failed to parse date '${date}'`);
    }
    return new DateStub(matches[0]);
  }
  toDate() {
    const date = new Date(this.dateString + "T00:00:00Z");
    if (date.toString() === "Invalid Date") {
      throw new RangeError(
        "Fauna Date could not be converted to Javascript Date"
      );
    }
    return date;
  }
  toString() {
    return `DateStub("${this.dateString}")`;
  }
};

// src/tagged-type.ts
var TaggedTypeFormat = class {
  static encode(obj) {
    return new TaggedTypeEncoded(obj).result;
  }
  static decode(input) {
    return JSON.parse(input, (_, value) => {
      if (value == null)
        return null;
      if (value["@mod"]) {
        return value["@mod"];
      } else if (value["@doc"]) {
        if (typeof value["@doc"] === "string") {
          const [modName, id] = value["@doc"].split(":");
          return { coll: modName, id };
        }
        return value["@doc"];
      } else if (value["@ref"]) {
        return value["@ref"];
      } else if (value["@set"]) {
        return value["@set"];
      } else if (value["@int"]) {
        return Number(value["@int"]);
      } else if (value["@long"]) {
        return BigInt(value["@long"]);
      } else if (value["@double"]) {
        return Number(value["@double"]);
      } else if (value["@date"]) {
        return DateStub.from(value["@date"]);
      } else if (value["@time"]) {
        return TimeStub.from(value["@time"]);
      } else if (value["@object"]) {
        return value["@object"];
      }
      return value;
    });
  }
};
var LONG_MIN = BigInt("-9223372036854775808");
var LONG_MAX = BigInt("9223372036854775807");
var TaggedTypeEncoded = class {
  result;
  #encodeMap = {
    bigint: (value) => {
      if (value < LONG_MIN || value > LONG_MAX) {
        throw new RangeError(
          "Precision loss when converting BigInt to Fauna type"
        );
      }
      return {
        "@long": value.toString()
      };
    },
    number: (value) => {
      if (value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY) {
        throw new RangeError(`Cannot convert ${value} to a Fauna type.`);
      }
      if (`${value}`.includes(".")) {
        return { "@double": value.toString() };
      } else {
        if (value >= -(2 ** 31) && value <= 2 ** 31 - 1) {
          return { "@int": value.toString() };
        } else if (Number.isSafeInteger(value)) {
          return {
            "@long": value.toString()
          };
        }
        return { "@double": value.toString() };
      }
    },
    string: (value) => {
      return value;
    },
    object: (input) => {
      let wrapped = false;
      const _out = {};
      for (const k in input) {
        if (k.startsWith("@")) {
          wrapped = true;
        }
        _out[k] = TaggedTypeFormat.encode(input[k]);
      }
      return wrapped ? { "@object": _out } : _out;
    },
    array: (input) => {
      const _out = [];
      for (const i in input)
        _out.push(TaggedTypeFormat.encode(input[i]));
      return _out;
    },
    date: (dateValue) => ({
      "@time": dateValue.toISOString()
    }),
    faunadate: (value) => ({ "@date": value.dateString }),
    faunatime: (value) => ({ "@time": value.isoString })
  };
  constructor(input) {
    this.result = input;
    switch (typeof input) {
      case "bigint":
        this.result = this.#encodeMap["bigint"](input);
        break;
      case "string":
        this.result = this.#encodeMap["string"](input);
        break;
      case "number":
        this.result = this.#encodeMap["number"](input);
        break;
      case "object":
        if (input == null) {
          this.result = null;
        } else if (Array.isArray(input)) {
          this.result = this.#encodeMap["array"](input);
        } else if (input instanceof Date) {
          this.result = this.#encodeMap["date"](input);
        } else if (input instanceof DateStub) {
          this.result = this.#encodeMap["faunadate"](input);
        } else if (input instanceof TimeStub) {
          this.result = this.#encodeMap["faunatime"](input);
        } else {
          this.result = this.#encodeMap["object"](input);
        }
        break;
    }
  }
};

// src/query-builder.ts
var isQueryBuilder = (obj) => obj instanceof Object && typeof obj.toQuery === "function";
function fql(queryFragments, ...queryArgs) {
  return new TemplateQueryBuilder(queryFragments, ...queryArgs);
}
var TemplateQueryBuilder = class {
  #queryFragments;
  #queryArgs;
  constructor(queryFragments, ...queryArgs) {
    if (queryFragments.length === 0 || queryFragments.length !== queryArgs.length + 1) {
      throw new Error("invalid query constructed");
    }
    this.#queryFragments = queryFragments;
    this.#queryArgs = queryArgs;
  }
  toQuery(requestHeaders = {}) {
    return { ...this.#render(requestHeaders), ...requestHeaders };
  }
  #render(requestHeaders) {
    if (this.#queryFragments.length === 1) {
      return { query: { fql: [this.#queryFragments[0]] }, arguments: {} };
    }
    let resultArgs = {};
    const renderedFragments = this.#queryFragments.flatMap((fragment, i) => {
      if (i === this.#queryFragments.length - 1) {
        return fragment === "" ? [] : [fragment];
      }
      const arg = this.#queryArgs[i];
      let subQuery;
      if (isQueryBuilder(arg)) {
        const request = arg.toQuery(requestHeaders);
        subQuery = request.query;
        resultArgs = { ...resultArgs, ...request.arguments };
      } else {
        subQuery = { value: TaggedTypeFormat.encode(arg) };
      }
      return [fragment, subQuery].filter((x) => x !== "");
    });
    return {
      query: { fql: renderedFragments },
      arguments: resultArgs
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuthenticationError,
  AuthorizationError,
  Client,
  ClientError,
  NetworkError,
  ProtocolError,
  QueryCheckError,
  QueryRuntimeError,
  QueryTimeoutError,
  ServiceError,
  ServiceInternalError,
  ServiceTimeoutError,
  ThrottlingError,
  endpoints,
  fql
});
//# sourceMappingURL=index.js.map
