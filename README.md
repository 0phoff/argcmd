![TodoCMD][logo]

  __[WIP]__ _Advanced argument parser for your terminal applications._

  [![NPM Version][npm-version-img]][npm-url]
  [![NPM Downloads][npm-dl-img]][npm-url]
  [![XO code style][style-img]][style-url]

## Features
I wrote my own argument parser for the [TodoCMD Application][todocmd-url], because existing solutions did not fit my needs.  
Because the codebase grew more and more, I decided to split this up into its own package.

The main difference between this package and others, is that this package has built-in support for nesting subcommands,
whilst still being able to use the regular command without the subcommand.  

## Usage
Here is a small example of how to use this package.
``` javascript
#!/usr/bin/env node
const Argcmd = require('argcmd')

const program = new Argcmd('This is a global description for your application')
  .version('0.0.1')
  .globalFlag('g', 'global', false, 'Dummy global flag without argument')

program
  .description('This is the description of what happens when you use ./application.js')
  .argument('filename', false)
  .action(my_function)

program
  .command('subcommand1')
  .description('Showing off subcommands ./application.js subcommand1')
  .action(console.log)

const subprogram = program
  .command('subcommand2')
  .description('This is the description of ./application.js subcommand')
  .flag('t', 'test', true, 'test flag for this subcommand with extra argument')
  .argument('title', true)                                                          // Required arg
  .argument('subtitle', false)                                                      // Optional arg
  .action(my_subcmd_function)

subprogram
  .command('subsubcommand')
  .description('Showing off nested subcommands ./application.js subcommand2 subsubcommand')
  .action(console.log)

program.parse(process.argv)

function my_function(options) {
  // TODO: main function code here.
}

function my_subcmd_function(options) {
  // TODO: subcommand function code here
}
```

The previous example generates a terminal application with the following possible calls
``` bash
./application.js -h                                         # Automatically generated help
./application.js subcommand1 -h                             # Automatically generated help
./application.js filename                                   # calls my_function
./application.js subcommand2 -g --test test_argument title  # calls my_subcmd_function
./application.js subcommand2 subsubcommand -g               # calls console.log
```


[logo]:             assets/logo.png
[npm-version-img]:  https://img.shields.io/npm/v/argcmd.svg
[npm-dl-img]:       https://img.shields.io/npm/dt/argcmd.svg
[npm-url]:          https://npmjs.org/package/argcmd
[style-img]:        https://img.shields.io/badge/code_style-XO-5ed9c7.svg
[style-url]:        https://github.com/sindresorhus/xo
[todocmd-url]:      https://github.com/0phoff/todocmd
