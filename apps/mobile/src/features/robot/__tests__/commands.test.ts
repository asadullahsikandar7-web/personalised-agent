import { parseRobotChoices, friendlyToolName } from '../commands';

describe('parseRobotChoices', () => {
  it('extracts the numbered choices from a "which robot" question', () => {
    const content =
      "You have 2 robots. Which one do you mean?\n1. Robo Freenove Pi (online)\n2. Robo (offline)\nReply with the robot's number or name.";
    expect(parseRobotChoices(content)).toEqual([
      { number: 1, name: 'Robo Freenove Pi', status: 'online' },
      { number: 2, name: 'Robo', status: 'offline' },
    ]);
  });

  it('ignores ordinary numbered replies', () => {
    expect(parseRobotChoices('Your robots:\n1. Robo (online)')).toEqual([]);
  });
});

describe('friendlyToolName', () => {
  it('labels robot tools and falls back to spaced names', () => {
    expect(friendlyToolName('get_robot_distance')).toBe('📏 Distance');
    expect(friendlyToolName('create_task')).toBe('create task');
  });
});
