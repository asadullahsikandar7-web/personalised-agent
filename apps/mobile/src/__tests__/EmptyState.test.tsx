import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../components/EmptyState';

describe('EmptyState', () => {
  it('renders title and description', async () => {
    const { getByText } = await render(<EmptyState title="No tasks" description="Add one to get started" />);
    expect(getByText('No tasks')).toBeTruthy();
    expect(getByText('Add one to get started')).toBeTruthy();
  });

  it('renders and triggers the action button when provided', async () => {
    const onAction = jest.fn();
    const { getByText } = await render(<EmptyState title="No tasks" actionLabel="Add task" onAction={onAction} />);
    fireEvent.press(getByText('Add task'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders no action button when none is provided', async () => {
    const { queryByText } = await render(<EmptyState title="No tasks" />);
    expect(queryByText('Add task')).toBeNull();
  });
});
