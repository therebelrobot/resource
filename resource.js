function initResource (config) {
  const { resources, connectors } = config
  async function generateResource (type, method, options, viewer) {
    log(`Generating ${type} ${method} resource`)
    const resource = new Resource(type, method, viewer)
    log(`Validating ${type} ${method} request`)
    try {
      await resource.validate(options)
    } catch (e) {
      debug('An Error occurred while validating:', e)
      return null
    }
    log(`Executing ${type} ${method} request`)
    try {
      await resource.exec(options)
    } catch (e) {
      debug('An Error occurred while executing resource:', e)
      return null
    }
    log(`Sanitizing and returning ${type} ${method} request`)
    return resource.sanitize()
  }
  class Resource {
    constructor (type, method, viewer) {
      this.resources = resources
      this.context = { viewer, connectors}

      this.methodExists = methodExists
      this.typeExists = typeExists

      this.type = type
      this.typeExists()

      this.method = method
      this.methodExists()
    }
    validate (...args) { return validate.apply(this, args); }
    exec (...args) { return exec.apply(this, args); }
    sanitize (...args) { return sanitize.apply(this, args); }
  }
  return {
    Resource,
  generateResource}
}

function typeExists () {
  if (!Object.keys(this.resources).includes(this.type)) throw new Error(`${this.type} does not exist as a resource.`)
}

function methodExists () {
  if (!this.resources[this.type][this.method] || typeof this.resources[this.type][this.method] !== 'function') throw new Error(`${this.type} does not contain a ${this.method} method`)
}

function log (...args) {
  if (process.env.VERBOSE) console.log.apply(console, args)
}
function debug (...args) {
  if (process.env.DEBUG) console.log.apply(console, args)
}
async function validate (options) {
  this.valid = await this.resources[this.type].validate(this.method, options, this.context)
  return this.valid
}

async function exec (options) {
  if (this.type.constructor === Array) { // allow for exec chaining
    for (let typeIndex in this.type) {
      options.previous_results = options.previous_results || {}
      options.previous_results[this.type[typeIndex]] = this.results // store previous results for inspection further in the chain
      this.results = await this.resources[this.type[typeIndex]][this.method](options, this.context) // update results
    }
  } else { // else run just one exec
    this.results = await this.resources[this.type][this.method](options, this.context)
  }
  return this.results
}

async function sanitize () {
  this.methodExists('sanitize')
  this.sanitizeResults = await this.resources[this.type].sanitize(this.method, this.results, this.context)
  return this.sanitizeResults
}

module.exports = {
  initResource,
  __internals: {
    typeExists,
    methodExists,
    log,
    debug,
    validate,
    exec,
    sanitize
  }
}
