// Tests for getErrorMessage. Run them with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getErrorMessage } from './api-error.ts';

test('says the server cannot be reached when there is no answer', () => {
  const error = { isAxiosError: true, message: 'Network Error' };
  assert.equal(
    getErrorMessage(error),
    'Cannot reach the server. Check that brain_server is running, then try again.',
  );
});

test('joins the validation messages sent by NestJS', () => {
  const error = {
    isAxiosError: true,
    response: {
      status: 400,
      data: { message: ['credits must be a number', 'title should not be empty'] },
    },
  };
  assert.equal(getErrorMessage(error), 'credits must be a number; title should not be empty');
});

test('uses the message sentence sent by the server', () => {
  const error = { isAxiosError: true, response: { status: 404, data: { message: 'Course not found' } } };
  assert.equal(getErrorMessage(error), 'Course not found');
});

test('falls back to the status code when the server sends no message', () => {
  const error = { isAxiosError: true, response: { status: 502, data: '' } };
  assert.equal(getErrorMessage(error), 'The server answered with an error (502).');
});

test('uses the text of an ordinary error', () => {
  assert.equal(getErrorMessage(new Error('Timetable is empty')), 'Timetable is empty');
});

test('has a default sentence for anything else', () => {
  assert.equal(getErrorMessage(undefined), 'Something went wrong. Please try again.');
  assert.equal(getErrorMessage('oops'), 'Something went wrong. Please try again.');
});
