import { Command } from 'commander';
import { execa } from 'execa';

function runVitest(args: string[]) {
  return execa('pnpm', ['exec', 'vitest', ...args], {
    shell: true,
    stdio: 'inherit',
  });
}

export default function test(cli: Command) {
  cli
    .command('test')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .description('Run Vitest tests')
    .action(async (_, command: Command) => {
      await runVitest(command.args);
    });

  cli
    .command('test:server')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .description('Run server Vitest tests')
    .action(async (_, command: Command) => {
      await runVitest(['--project', 'server', ...command.args]);
    });

  cli
    .command('test:client')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .description('Run client Vitest tests')
    .action(async (_, command: Command) => {
      await runVitest(['--project', 'client', ...command.args]);
    });
}
