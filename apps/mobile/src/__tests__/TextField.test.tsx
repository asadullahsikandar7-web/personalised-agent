import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextField } from '../components/TextField';

describe('TextField', () => {
  it('renders the label and calls onChangeText', async () => {
    const onChangeText = jest.fn();
    const { getByLabelText, getByText } = await render(
      <TextField label="Email" value="" onChangeText={onChangeText} />,
    );
    expect(getByText('Email')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Email'), 'hello@example.com');
    expect(onChangeText).toHaveBeenCalledWith('hello@example.com');
  });

  it('renders an error message when provided', async () => {
    const { getByText } = await render(
      <TextField label="Email" value="" onChangeText={jest.fn()} error="Email is required" />,
    );
    expect(getByText('Email is required')).toBeTruthy();
  });

  it('renders no error text when none is provided', async () => {
    const { queryByText } = await render(<TextField label="Email" value="" onChangeText={jest.fn()} />);
    expect(queryByText(/required/i)).toBeNull();
  });
});
