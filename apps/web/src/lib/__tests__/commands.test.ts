import { describe, it, expect, beforeEach } from 'vitest';
import { commandHistory, type Command } from '../commands';

beforeEach(() => {
  commandHistory.clear();
});

describe('CommandHistory', () => {
  it('executes a command', () => {
    let value = 0;
    const cmd: Command = {
      execute: () => { value = 1; },
      undo: () => { value = 0; },
      description: 'set to 1',
    };
    commandHistory.execute(cmd);
    expect(value).toBe(1);
  });

  it('undoes a command', () => {
    let value = 0;
    const cmd: Command = {
      execute: () => { value = 1; },
      undo: () => { value = 0; },
      description: 'set to 1',
    };
    commandHistory.execute(cmd);
    commandHistory.undo();
    expect(value).toBe(0);
  });

  it('redoes a command', () => {
    let value = 0;
    const cmd: Command = {
      execute: () => { value = 1; },
      undo: () => { value = 0; },
      description: 'set to 1',
    };
    commandHistory.execute(cmd);
    commandHistory.undo();
    commandHistory.redo();
    expect(value).toBe(1);
  });

  it('clears redo stack on new execute', () => {
    let value = 0;
    const cmd1: Command = {
      execute: () => { value = 1; },
      undo: () => { value = 0; },
      description: 'set to 1',
    };
    const cmd2: Command = {
      execute: () => { value = 2; },
      undo: () => { value = 1; },
      description: 'set to 2',
    };
    commandHistory.execute(cmd1);
    commandHistory.undo();
    expect(commandHistory.canRedo).toBe(true);
    commandHistory.execute(cmd2);
    expect(commandHistory.canRedo).toBe(false);
  });

  it('reports canUndo/canRedo correctly', () => {
    expect(commandHistory.canUndo).toBe(false);
    expect(commandHistory.canRedo).toBe(false);

    const cmd: Command = {
      execute: () => {},
      undo: () => {},
      description: 'noop',
    };
    commandHistory.execute(cmd);
    expect(commandHistory.canUndo).toBe(true);
    expect(commandHistory.canRedo).toBe(false);

    commandHistory.undo();
    expect(commandHistory.canUndo).toBe(false);
    expect(commandHistory.canRedo).toBe(true);
  });
});
