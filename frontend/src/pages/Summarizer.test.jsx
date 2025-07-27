import * as firestore from 'firebase/firestore';

const mockAddDoc = jest.fn(() => Promise.resolve());

// mockAddDoc
jest.mock('firebase/firestore', () => {
  const originalModule = jest.requireActual('firebase/firestore');
  return {
    ...originalModule,
    addDoc: (...args) => mockAddDoc(...args),
    collection: jest.fn(),
    serverTimestamp: jest.fn(),
  };
});

// mockFirebaseAuth
jest.mock('firebase/auth', () => {
  const originalModule = jest.requireActual('firebase/auth');
  return {
    ...originalModule,
    onAuthStateChanged: jest.fn((auth, callback) => {
      callback({ uid: 'test-user' });
      return () => {};
    }),
  };
});

jest.mock('../config', () => ({
  API_URL: 'http://localhost:10000',
  FIREBASE_CONFIG: {
    apiKey: 'test-key',
    authDomain: 'test-auth-domain',
    projectId: 'test-project-id',
    storageBucket: 'test-bucket',
    messagingSenderId: 'test-sender',
    appId: 'test-app',
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Summarizer from './Summarizer';

import axios from 'axios';
jest.mock('axios');

axios.post.mockResolvedValue({
  data: { summary: 'This is the summarized result.' },
});

// Test handleFileUpload()
describe('Summarizer - handleFileUpload()', () => {
  test('sets selectedFile when a valid file is uploaded', () => {
    render(
      <MemoryRouter>
        <Summarizer />
      </MemoryRouter>
    );

    // Switch to file mode
    const fileModeButton = screen.getByRole('button', { name: /file mode/i });
    fireEvent.click(fileModeButton);

    // Create a valid file
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

    const fileInput = screen.getByLabelText(/choose file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // The filename should appear in the document
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  test('does not crash on unsupported file upload', () => {
    render(
      <MemoryRouter>
        <Summarizer />
      </MemoryRouter>
    );

    // Switch to file mode
    const fileModeButton = screen.getByRole('button', { name: /file mode/i });
    fireEvent.click(fileModeButton);

    const unsupportedFile = new File(['exe content'], 'malware.exe', { type: 'application/x-msdownload' });

    const fileInput = screen.getByLabelText(/choose file/i);
    fireEvent.change(fileInput, { target: { files: [unsupportedFile] } });

    // Should not throw or crash; error may or may not show depending on implementation
    expect(screen.queryByText('malware.exe')).not.toBeInTheDocument();
  });
});

// Test handleFomatChange()
describe('Summarizer - handleFormatChange()', () => {
  test('updates summary type to long', () => {
    render(
      <MemoryRouter>
        <Summarizer />
      </MemoryRouter>
    );

    const formatSelect = screen.getByLabelText('Summary Type:');
    fireEvent.change(formatSelect, { target: { value: 'long' } });

    expect(formatSelect.value).toBe('long');
  });

  test('updates summary type to bullet', () => {
    render(
      <MemoryRouter>
        <Summarizer />
      </MemoryRouter>
    );

    const formatSelect = screen.getByLabelText('Summary Type:');
    fireEvent.change(formatSelect, { target: { value: 'bullet' } });

    expect(formatSelect.value).toBe('bullet');
  });
});

// Test handleSummarize()
describe('Summarizer - handleSummarize()', () => {
  test('does not summarize when input is empty', () => {
    render(
      <MemoryRouter>
        <Summarizer />
      </MemoryRouter>
    );

    const summarizeButtons = screen.getAllByRole('button', { name: /summarize/i });
    const summarizeButton = summarizeButtons.find(btn => btn.className.includes('summarize-button'));
    fireEvent.click(summarizeButton);
    expect(screen.queryByText(/summary:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/please enter some text/i)).toBeInTheDocument();
  });

  test('summarizes text when valid input is provided', async () => {
    render(
      <MemoryRouter>
        <Summarizer />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/enter text here/i);
    fireEvent.change(input, { target: { value: 'This is some sample text to summarize.' } });

    const summarizeButtons = screen.getAllByRole('button', { name: /summarize/i });
    const summarizeButton = summarizeButtons.find(btn => btn.className.includes('summarize-button'));
    expect(summarizeButton).not.toBeDisabled();

    fireEvent.click(summarizeButton);

    // Expect loading state
    expect(screen.getByText(/summarizing/i)).toBeInTheDocument();
  });
});

// Test handleSaveToFirestore()
describe('Summarizer - handleSaveToFirestore()', () => {
    test('saves summary to Firestore when Save button is clicked', async () => {
        render(
        <MemoryRouter>
            <Summarizer />
        </MemoryRouter>
        );
        
        // Simulate typing some text
        const input = screen.getByPlaceholderText(/enter text here/i);
        fireEvent.change(input, { target: { value: 'Sample input for summarizing.' } });

        // Click summarize to trigger showing save option
        const summarizeButtons = screen.getAllByRole('button', { name: /summarize/i });
        const summarizeButton = summarizeButtons.find(btn => btn.className.includes('summarize-button'));
        fireEvent.click(summarizeButton);

        // Wait for save option to appear
        const titleInput = await screen.findByPlaceholderText(/enter title for your summary/i);

        // Now enter the title and click save
        fireEvent.change(titleInput, { target: { value: 'My Summary Title' } });

        const saveButton = screen.getByRole('button', { name: /save to dashboard/i });
        fireEvent.click(saveButton);

        // Expect Firestore addDoc to be called (assuming it's mocked)
        await expect(mockAddDoc).toHaveBeenCalled();
    });
});