import { Command } from 'commander';
import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import registerTestCommand from '../commands/test';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

const mockedExeca = vi.mocked(execa);

function createCli() {
  const cli = new Command();
  registerTestCommand(cli);
  return cli;
}

function getCommand(cli: Command, name: string) {
  const command = cli.commands.find((command) => command.name() === name);
  expect(command).toBeDefined();
  return command!;
}

async function runCli(args: string[]) {
  const cli = createCli();
  await cli.parseAsync(['node', 'cli', ...args], { from: 'node' });
}

describe('devkit test commands', () => {
  beforeEach(() => {
    mockedExeca.mockReset();
  });

  it('registers test, test:server, and test:client commands', () => {
    const cli = createCli();

    expect(cli.commands.map((command) => command.name())).toEqual(
      expect.arrayContaining(['test', 'test:server', 'test:client']),
    );
  });

  it('runs vitest with forwarded test arguments', async () => {
    await runCli(['test', '--project', 'server', 'packages/foo.test.ts']);

    expect(mockedExeca).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'vitest', '--project', 'server', 'packages/foo.test.ts'],
      { stdio: 'inherit' },
    );
  });

  it('runs server tests with server project and forwarded arguments', async () => {
    await runCli(['test:server', '--project', 'custom', 'packages/server.test.ts']);

    expect(mockedExeca).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'vitest', '--project', 'server', '--project', 'custom', 'packages/server.test.ts'],
      { stdio: 'inherit' },
    );
  });

  it('runs client tests with client project and forwarded arguments', async () => {
    await runCli(['test:client', '--project', 'custom', 'packages/client.test.ts']);

    expect(mockedExeca).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'vitest', '--project', 'client', '--project', 'custom', 'packages/client.test.ts'],
      { stdio: 'inherit' },
    );
  });
});
