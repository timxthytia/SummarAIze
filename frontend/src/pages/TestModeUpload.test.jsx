

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TestModeUpload, { parseCorrectAnswer } from './TestModeUpload';
import '@testing-library/jest-dom';

// Mock Firebase Auth and Firestore
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => callback(null)),
}));
jest.mock('firebase/storage', () => ({
  getStorage: () => ({}),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(() => Promise.resolve('mocked-url')),
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
}));

describe('TestModeUpload component', () => {
  beforeEach(() => {
    render(<TestModeUpload />);
  });

  test('handleFileChange – shows error for unsupported file types', async () => {
    const fileInput = screen.getByLabelText(/choose file/i);
    const unsupportedFile = new File(['text'], 'test.txt', { type: 'text/plain' });

    await waitFor(() =>
      fireEvent.change(fileInput, { target: { files: [unsupportedFile] } })
    );

    await waitFor(() => {
      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    });
  });

  test('isFormValid – returns false for invalid MCQ answers', () => {
    const invalidMCQ = {
      type: 'MCQ',
      marks: '5',
      options: 'A,B,C',
      correctAnswer: 'D', // D not in options
    };
    const validMCQ = {
      ...invalidMCQ,
      correctAnswer: 'A',
    };

    // Extract isFormValid from component instance
    // Since isFormValid is not exported, test by simulating UI
    // Instead, check button disabled state
    fireEvent.click(screen.getByText('+ Add Question'));
    const marksInput = screen.getByLabelText(/marks/i);
    const optionsInput = screen.getByLabelText(/mcq options/i);
    const correctAnswerInput = screen.getByLabelText(/correct answer/i);
    const saveBtn = screen.getByText('Save Question');
    // Fill invalid MCQ
    fireEvent.change(marksInput, { target: { value: invalidMCQ.marks } });
    fireEvent.change(optionsInput, { target: { value: invalidMCQ.options } });
    fireEvent.change(correctAnswerInput, { target: { value: invalidMCQ.correctAnswer } });
    expect(saveBtn).toBeDisabled();
    // Fill valid MCQ
    fireEvent.change(correctAnswerInput, { target: { value: validMCQ.correctAnswer } });
    expect(saveBtn).not.toBeDisabled();
    // Close
    fireEvent.click(screen.getByText('Cancel'));
  });

  test('parseCorrectAnswer – formats based on question type', () => {
    expect(parseCorrectAnswer({ type: 'MCQ', correctAnswer: 'A,B' })).toEqual(['A', 'B']);
    expect(parseCorrectAnswer({ type: 'Open-ended', correctAnswer: 'Answer' })).toBe('Answer');
    const file = new File(['data'], 'answer.pdf', { type: 'application/pdf' });
    expect(parseCorrectAnswer({ type: 'Other', correctAnswerFile: file })).toBe(file);
  });

  test('handleSaveQuestion – adds new question to correct page', async () => {
    fireEvent.click(screen.getByText('+ Add Question'));
    fireEvent.change(screen.getByLabelText(/marks/i), { target: { value: 2 } });
    fireEvent.change(screen.getByLabelText(/mcq options/i), { target: { value: 'A,B,C,D' } });
    fireEvent.change(screen.getByLabelText(/correct answer/i), { target: { value: 'A' } });

    await waitFor(() => {
      expect(screen.getByText('Save Question')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText('Save Question'));
    await waitFor(() => {
      expect(screen.getByText(/correct answer/i)).toBeInTheDocument();
    });
  });

  test('handleSaveQuestion – edits an existing question', async () => {
    fireEvent.click(screen.getByText('+ Add Question'));
    fireEvent.change(screen.getByLabelText(/marks/i), { target: { value: 3 } });
    fireEvent.change(screen.getByLabelText(/mcq options/i), { target: { value: 'A,B,C,D' } });
    fireEvent.change(screen.getByLabelText(/correct answer/i), { target: { value: 'B' } });
    fireEvent.click(screen.getByText('Save Question'));

    await waitFor(() => {
      const editBtn = screen.getByLabelText('Edit');
      fireEvent.click(editBtn);
    });

    fireEvent.change(screen.getByLabelText(/correct answer/i), { target: { value: 'C' } });
    fireEvent.click(screen.getByText('Save Question'));

    await waitFor(() => {
      expect(screen.getByText('C...')).toBeInTheDocument();
    });
  });

  test('handleDeleteQuestion – deletes selected question', async () => {
    fireEvent.click(screen.getByText('+ Add Question'));
    fireEvent.change(screen.getByLabelText(/marks/i), { target: { value: 1 } });
    fireEvent.change(screen.getByLabelText(/mcq options/i), { target: { value: 'True,False' } });
    fireEvent.change(screen.getByLabelText(/correct answer/i), { target: { value: 'True' } });
    fireEvent.click(screen.getByText('Save Question'));

    await waitFor(() => {
      const deleteBtn = screen.getByLabelText('Delete');
      fireEvent.click(deleteBtn);
    });

    await waitFor(() => {
      expect(screen.queryByText('True...')).not.toBeInTheDocument();
    });
  });

  test('handleSubmitTestPaper – shows error if user is not logged in or title is missing', async () => {
    fireEvent.click(screen.getByText('Upload Test Paper'));

    await waitFor(() => {
      expect(screen.getByText(/missing paper title/i)).toBeInTheDocument();
    });
  });
});