import { fireEvent, render, screen } from '@testing-library/react-native';
import { Counter } from './counter';

test('increments the counter when pressed', async () => {
  await render(<Counter />);
  expect(screen.getByText('Count is 0')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button'));
  expect(screen.getByText('Count is 1')).toBeTruthy();
});
