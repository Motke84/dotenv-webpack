import dotenv from 'dotenv'
import fs from 'fs'
import { DefinePlugin } from 'webpack'

// Mostly taken from here: https://github.com/motdotla/dotenv-expand/blob/master/lib/main.js#L4
const interpolate = (env, vars) => {
  const matches = env.match(/\$([a-zA-Z0-9_]+)|\${([a-zA-Z0-9_]+)}/g) || []

  matches.forEach((match) => {
    const key = match.replace(/\$|{|}/g, '')
    let variable = vars[key] || ''
    variable = interpolate(variable, vars)
    env = env.replace(match, variable)
  })

  return env
}

class Dotenv {
  /**
   * The dotenv-webpack plugin.
   * @param {Object} options - The parameters.
   * @param {String} [options.path=./.env] - The location of the environment variable.
   * @param {Boolean|String} [options.safe=false] - If false ignore safe-mode, if true load `'./.env.example'`, if a string load that file as the sample.
   * @param {Boolean} [options.systemvars=false] - If true, load system environment variables.
   * @param {Boolean} [options.silent=false] - If true, suppress warnings, if false, display warnings.
   * @returns {webpack.DefinePlugin}
   */
  constructor ({
    path = './.env',
    safe,
    systemvars,
    silent,
    sample,
    expand = false
  } = {}) {
    // Catch older packages, but hold their hand (just for a bit)
    if (sample) {
      if (safe) {
        safe = sample
      }
      this.warn('dotenv-webpack: "options.sample" is a deprecated property. Please update your configuration to use "options.safe" instead.', silent)
    }

    let vars = {}
    if (systemvars) {
      Object.keys(process.env).map(key => {
        vars[key] = process.env[key]
      })
    }

    const env = this.loadFile(path, silent)

    let blueprint = env
    if (safe) {
      let file = './.env.example'
      if (safe !== true) {
        file = safe
      }
      blueprint = this.loadFile(file, silent)
    }

    Object.keys(blueprint).map(key => {
      const value = vars.hasOwnProperty(key) ? vars[key] : env[key]
      if (!value && safe) {
        throw new Error(`Missing environment variable: ${key}`)
      } else {
        vars[key] = value
      }
    })

    const formatData = Object.keys(vars).reduce((obj, key) => {
      const v = vars[key]
      const vKey = `process.env.${key}`
      let vValue
      if (expand) {
        if (v.substring(0, 2) === '\\$') {
          vValue = v.substring(1)
        } else if (v.indexOf('\\$') > 0) {
          vValue = v.replace(/\\\$/g, '$')
        } else {
          vValue = interpolate(v, vars)
        }
      } else {
        vValue = v
      }

      obj[vKey] = JSON.stringify(vValue)

      return obj
    }, {})

    return new DefinePlugin(formatData)
  }

  /**
   * Load and parses a file.
   * @param {String} file - The file to load.
   * @param {Boolean} silent - If true, suppress warnings, if false, display warnings.
   * @returns {Object}
   */
  loadFile (file, silent) {
    try {
      return dotenv.parse(fs.readFileSync(file))
    } catch (err) {
      this.warn(`Failed to load ${file}.`, silent)
      return {}
    }
  }

  /**
   * Displays a console message if 'silent' is falsey
   * @param {String} msg - The message.
   * @param {Boolean} silent - If true, display the message, if false, suppress the message.
   */
  warn (msg, silent) {
    !silent && console.warn(msg)
  }
}

export default Dotenv
