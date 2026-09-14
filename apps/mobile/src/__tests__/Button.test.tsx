import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../components/Button';

describe('Button', () => {
  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button label="Save" onPress={onPress} haptics={false} />);
    fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button label="Save" onPress={onPress} disabled haptics={false} />);
    fireEvent.press(getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner instead of the label while loading', async () => {
    const { queryByText } = await render(<Button label="Save" onPress={jest.fn()} loading haptics={false} />);
    expect(queryByText('Save')).toBeNull();
  });

  it('does not call onPress while loading', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(<Button label="Save" onPress={onPress} loading haptics={false} />);
    fireEvent.press(getByLabelText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
