'use strict';
const path = require('path');
const chalk = require('chalk');


class SubCommand {
  constructor(name, parent) {
    this._name = name;
    this._supercommand = parent;
    this._alias = undefined;
    this._description = undefined;

    this._subcommands = [];
    this._flags = [];
    this._arguments = [];
    this._action = null;
    this._unprocessed = null;

    this._help = null;
    this._helpColor = null;
    this._helpProlog = null;
    this._helpEpilog = null;
  }

  alias(string) {
    this._alias = String(string);
    return this;
  }

  description(desc) {
    this._description = String(desc);
    return this;
  }

  flag(short, long, desc = '', {argument = false, typecast = id => id} = {argument: true, typecast: id => id}) {
    this._flags.push({short: short[0], long, desc, argument, type: typecast});
    return this;
  }

  argument(name, {nargs = 1, required = true, typecast = id => id} = {nargs: 1, required: true, typecast: id => id}) {
    if (typeof nargs === 'string') {
      switch (nargs[0]) {
        case '?':
          nargs = 1;
          required = false;
          break;
        case '*':
          nargs = 0;
          required = false;
          break;
        case '+':
          nargs = 0;
          break;
        default:
          nargs = parseInt(nargs, 10);
          if (isNaN(nargs)) {
            nargs = 1;
          }
      }
    }
    else if (!(typeof nargs === 'number')) {
      nargs = 1;
    }

    this._arguments.push({name, required, nargs, type: typecast});
    return this;
  }

  command(name) {
    const sub = new SubCommand(name, this);
    sub._help = this._help;
    sub._helpColor = this._helpColor;

    this._subcommands.push(sub);
    return sub;
  }

  action(fn) {
    this._action = fn;
    return this;
  }

  help(autoGenerate, color, prolog, epilog) {
    this._help = autoGenerate === true;
    this._helpColor = color === true;
    this._helpProlog = prolog;
    this._helpEpilog = epilog;
    return this;
  }

  showHelp(options) {
    const color = this._helpColor ? new chalk.constructor() : new chalk.constructor({enabled: false});

    if (typeof this._helpProlog === 'function') {
      this._helpProlog(options);
    }
    else if (this._help) {
      console.log(color.bold.cyan(`${options.commands[0]} ${options._rootCommand._version}`));
      console.log(`  ${options._rootCommand._globalDesc}`);
      console.log();
    }

    if (this._help) {
      const flags = [];
      let flagLength = 0;
      for (let i = options._rootCommand._globalFlags.length - 1; i >= 0; --i) {
        let length = options._rootCommand._globalFlags[i].long.length;

        if (options._rootCommand._globalFlags[i].argument) {
          length += 11;
        }
        if (length > flagLength) {
          flagLength = length;
        }

        flags.push(options._rootCommand._globalFlags[i]);
      }
      for (let i = this._flags.length - 1; i >= 0; --i) {
        let length = this._flags[i].long.length;

        if (this._flags[i].argument) {
          length += 11;
        }
        if (length > flagLength) {
          flagLength = length;
        }

        flags.push(this._flags[i]);
      }

      console.log(color.underline.cyan('Usage:'));
      if (this._action) {
        process.stdout.write('  ');
        options.commands.forEach(cmd => process.stdout.write(cmd + ' '));
        if (flags.length !== 0) {
          process.stdout.write('[options] ');
        }
        if (this._arguments.length > 0) {
          this._arguments.forEach(argument => {
            if (argument.required) {
              process.stdout.write('<');
            }
            else {
              process.stdout.write('[');
            }

            if (argument.nargs === 0) {
              process.stdout.write(argument.name + ' ...');
            }
            else if (argument.nargs === 1) {
              process.stdout.write(argument.name);
            }
            else {
              for (let i = 1; i < argument.nargs; ++i) {
                process.stdout.write(argument.name + ' ');
              }
              process.stdout.write(argument.name);
            }

            if (argument.required) {
              process.stdout.write('> ');
            }
            else {
              process.stdout.write('] ');
            }
          });
        }

        console.log();
      }
      if (this._subcommands.length !== 0) {
        process.stdout.write('  ');
        options.commands.forEach(cmd => process.stdout.write(cmd + ' '));
        process.stdout.write((this._action ? '[' : '<'));
        this._subcommands.forEach((cmd, i) => {
          process.stdout.write(i ? '|' : '');
          process.stdout.write(cmd._name);
        });
        console.log((this._action ? ']' : '>'));
      }
      console.log();

      console.log(color.underline.cyan('Description:'));
      console.log(`  ${this._description}\n`);

      if (flags.length !== 0) {
        console.log(color.underline.cyan('Options:'));
        flags.reverse().forEach(flag => {
          if (flag.argument) {
            if (flag.long.length + 11 < flagLength) {
              process.stdout.write('  -' + flag.short + ', --' + flag.long + ' <argument>' + ' '.repeat(flagLength - 11 - flag.long.length));
            }
            else {
              process.stdout.write('  -' + flag.short + ', --' + flag.long + ' <argument>');
            }
          }
          else if (flag.long.length < flagLength) {
            process.stdout.write('  -' + flag.short + ', --' + flag.long + ' '.repeat(flagLength - flag.long.length));
          }
          else {
            process.stdout.write('  -' + flag.short + ', --' + flag.long);
          }

          process.stdout.write('\t' + color.gray(flag.desc) + '\n');
        });
      }
    }

    if (typeof this._helpEpilog === 'function') {
      this._helpEpilog(options);
    }
  }
}

class Command extends SubCommand {
  constructor(globalDescription) {
    super('root', null);
    this._globalDesc = globalDescription;
    this._version = '';
    this._globalFlags = [
      {short: 'h', long: 'help', desc: 'Print this help message', argument: false, type: id => id}
    ];

    this._help = true;
    this._helpColor = true;
  }

  version(string) {
    this._version = string;
    return this;
  }

  globalFlag(short, long, desc, argument = false, typecast = id => id) {
    this._globalFlags.push({short: short[0], long, desc, argument, type: typecast});
    return this;
  }

  parse(argv) {
    const options = {
      commands: [],
      _rootCommand: this
    };

    const remainingArgv = parseFlags(argv.slice(2), this._globalFlags, options);
    return parse(this, [path.basename(process.argv[1]), ...remainingArgv], options);
  }
}


function parse(cmd, argv, options) {
  let p;

  options.commands.push(argv[0]);
  cmd._unprocessed = argv.slice(1);

  let nextCommand = (cmd._unprocessed.length && cmd._unprocessed[0][0] !== '-');
  if (nextCommand) {
    nextCommand = cmd._subcommands.some(sub => {
      if (cmd._unprocessed[0] === sub._name || (sub._alias && cmd._unprocessed[0] === sub._alias)) {
        cmd._unprocessed[0] = sub._name;
        p = parse(sub, cmd._unprocessed, options);
        return true;
      }
      return false;
    });
  }

  if (!nextCommand) {
    try {
      cmd._unprocessed = parseFlags(cmd._unprocessed, cmd._flags, options);
    }
    catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    options._finalCommand = cmd;

    if (options.help) {
      p = cmd.showHelp(options);
    }
    else {
      try {
        cmd._unprocessed = parseArgs(cmd._unprocessed, cmd._arguments, options);
      }
      catch (err) {
        console.error(err.message);
        process.exit(1);
      }
      options.argv = cmd._unprocessed;
      p = cmd._action(options);
    }
  }

  return p;
}

function parseFlags(argv, flags, options) {
  if (flags.length === 0) {
    return argv;
  }

  flags = flags.slice();
  return argv.reduce((acc, cur, i) => {
    const test = flags.some((f, j) => {
      const re = new RegExp('^(-' + f.short + '|--' + f.long + ')');
      if (re.test(cur)) {
        const property = f.long.replace(/-(.)/g, (match, letter) => letter.toUpperCase());
        if (f.argument && cur[1] !== '-' && cur.length > 2) {
          options[property] = f.type(cur.substring(2));
        }
        else if (f.argument) {
          options[property] = f.type(argv[i + 1]);
          argv.splice(i + 1, 1);
        }
        else {
          options[property] = f.type(true);
        }

        flags.splice(j, 1);
        return true;
      }
      return false;
    });

    if (!test) {
      acc.push(cur);
    }
    return acc;
  }, []);
}

function parseArgs(argv, args, options) {
  if (args.length === 0) {
    return argv;
  }

  args.forEach(a => {
    const property = a.name.replace(/-(.)/g, (match, letter) => letter.toUpperCase());
    if (a.required) {
      if (argv.length > 0 && argv.length >= a.nargs) {
        if (a.nargs === 0) {
          options[property] = argv.map(a.type);
          argv = [];
        }
        else if (a.nargs === 1) {
          options[property] = a.type(argv.shift());
        }
        else {
          options[property] = argv.splice(0, a.nargs).map(a.type);
        }
      }
      else {
        throw new Error(`[${a.name}] requires ${a.nargs ? a.nargs : 'at least 1'} argument(s)`);
      }
    }
    else if (argv.length > 0) {
      if (a.nargs === 0) {
        options[property] = argv.map(a.type);
        argv = [];
      }
      else if (a.nargs === 1) {
        options[property] = a.type(argv.shift());
      }
      else if (argv.length >= a.nargs) {
        options[property] = argv.splice(0, a.nargs).map(a.type);
      }
    }
  });

  return argv;
}


module.exports = Command;
