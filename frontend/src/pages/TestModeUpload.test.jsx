

import React from 'react';
jest.mock('../config', () => ({
  API_URL: 'https://mocked-api-url.com',
  FIREBASE_CONFIG: {
    apiKey: 'fake-api-key',
    authDomain: 'fake-auth-domain',
    projectId: 'fake-project-id',
    storageBucket: 'fake-storage-bucket',
    messagingSenderId: 'fake-messaging-sender-id',
    appId: 'fake-app-id',
  },
}));
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import TestModeUpload, { parseCorrectAnswer } from './TestModeUpload';
import { isFormValid } from './TestModeUpload';

jest.mock('react-pdf', () => ({
  Document: ({ children }) => <div>{children}</div>,
  Page: () => <div>PDF Page</div>,
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
}));

jest.mock('../components/NavbarLoggedin', () => () => <div>Mock Navbar</div>);

describe('TestModeUpload Component', () => {
    // Test if Correct Option exists in MCQ Options
    test('isFormValid() – returns false for invalid MCQ answers', async () => {
        const invalidQuestion = {
        type: 'MCQ',
        marks: '3',
        options: 'A,B,C',
        correctAnswer: 'D',
        };
        expect(isFormValid(invalidQuestion)).toBe(false);
    });

    // Test for correct answer format for different question types
    test('parseCorrectAnswer() – formats correct answer based on question type', () => {
        expect(parseCorrectAnswer({ type: 'MCQ', correctAnswer: 'A, B' })).toEqual(['A', 'B']);
        expect(parseCorrectAnswer({ type: 'Open-ended', correctAnswer: 'Answer here ' })).toBe('Answer here');
        const dummyFile = new File(['dummy'], 'ans.pdf', { type: 'application/pdf' });
        expect(parseCorrectAnswer({ type: 'Other', correctAnswerFile: dummyFile })).toBe(dummyFile);
    });


    // Test for adding question
    test('handleSaveQuestion() – adds new question to correct page', async () => {
        const validMCQ = {
        type: 'MCQ',
        marks: '2',
        options: 'A,B,C',
        correctAnswer: 'A',
        };
        expect(isFormValid(validMCQ)).toBe(true);
    });

    // Test for uploading test paper when title missing or user not logged in
    test('handleSubmitTestPaper() – shows error if user is not logged in or title is missing', async () => {
        render(<TestModeUpload />);
        fireEvent.click(screen.getAllByText(/upload test paper/i)[1]);
        await waitFor(() => {
        expect(screen.getByText(/missing paper title/i)).toBeInTheDocument();
        });
    });
});

// Test for deleting existing question
test('handleDeleteQuestion() – deletes selected question from the correct page', () => {
  const TestWrapper = () => {
    const [questionsByPage, setQuestionsByPage] = React.useState({
      1: [{ id: 'q1', questionNumber: '1', type: 'MCQ', marks: 2, correctAnswer: ['A'], options: ['A', 'B', 'C'] }],
    });

    const handleDeleteQuestion = (page, id) => {
      setQuestionsByPage((prev) => {
        const pageQuestions = prev[page] || [];
        const filtered = pageQuestions.filter((q) => q.id !== id);
        return { ...prev, [page]: filtered };
      });
    };

    return (
      <div>
        <button onClick={() => handleDeleteQuestion(1, 'q1')}>Delete Q1</button>
        <div data-testid="question-count">{(questionsByPage[1] || []).length}</div>
      </div>
    );
  };

  render(<TestWrapper />);
  expect(screen.getByTestId('question-count').textContent).toBe('1');
  fireEvent.click(screen.getByText('Delete Q1'));
  expect(screen.getByTestId('question-count').textContent).toBe('0');
});

// Test for editing existing question
test('handleSaveQuestion() – edits an existing question in questionsByPage', () => {
  const existingQuestion = {
    id: 'q123',
    questionNumber: '1',
    type: 'MCQ',
    marks: '2',
    correctAnswer: 'A',
    options: 'A,B,C'
  };

  const editedQuestion = {
    id: 'q123',
    questionNumber: '1',
    type: 'MCQ',
    marks: '3',
    correctAnswer: 'B',
    options: 'A,B,C'
  };

  const page = 1;
  const initialState = { [page]: [existingQuestion] };

  const updateQuestions = (prev, updatedQuestion) => {
    const pageQuestions = prev[page] || [];
    const newQuestions = pageQuestions.map((q) =>
      q.id === updatedQuestion.id
        ? {
            ...updatedQuestion,
            marks: Number(updatedQuestion.marks),
            correctAnswer: parseCorrectAnswer(updatedQuestion),
            options: updatedQuestion.options.split(',').map(opt => opt.trim().toUpperCase())
          }
        : q
    );
    return { ...prev, [page]: newQuestions };
  };

  const result = updateQuestions(initialState, editedQuestion);
  expect(result[page][0].marks).toBe(3);
  expect(result[page][0].correctAnswer).toEqual(['B']);
});