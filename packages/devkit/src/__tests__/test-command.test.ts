import { Command } from 'commander';
import { describe, expect, it } from 'vitest';

import registerTestCommand from '../commands/test';

describe('devkit test commands', () => {
  it('registers test, test:server, and test:client commands', () => {
    const cli = new Command();

    registerTestCommand(cli);

    expect(cli.commands.map((command) => command.name())).toEqual(
      expect.arrayContaining(['test', 'test:server', 'test:client']),
    );
  });
});
