beforeAll(() => {
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SummaryDetail from './SummaryDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, updateDoc } from 'firebase/firestore';
import * as firebaseServices from '../services/firebase';

jest.mock('firebase/auth', () => {
  const originalModule = jest.requireActual('firebase/auth');
  return {
    ...originalModule,
    getAuth: jest.fn(() => ({})),
    onAuthStateChanged: jest.fn((auth, callback) => {
      callback({ uid: 'test-user' });
      return () => {}; // no-op unsubscribe function
    }),
    GoogleAuthProvider: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
  };
});

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  getFirestore: jest.fn(),        
  setDoc: jest.fn(),              
  collection: jest.fn(),          
  addDoc: jest.fn(),              
  serverTimestamp: jest.fn(), 
}));

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

jest.mock('../components/NavbarLoggedin', () => () => <div>Mocked Navbar</div>);

describe('SummaryDetail Component', () => {
  const mockSummaryData = {
    title: 'Test Title',
    summary: '<p>Initial summary content</p>',
    type: 'long',
    timestamp: { toDate: () => new Date('2023-01-01T12:00:00Z') }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: 'test-user' });
      return () => {}; // no-op unsubscribe function
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockSummaryData
    });
  });

  // Test useEffect() on load
  test('useEffect() on load – fetches correct summary content from Firestore', async () => {
    render(
      <MemoryRouter initialEntries={['/summary/test-user/summary-id']}>
        <Routes>
          <Route path="/summary/:uid/:id" element={<SummaryDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
    });
  });

  // Test handleTextChange() if updates Firestore db
  test('handleTextChange() – updates Firestore when edited content changes', async () => {
    updateDoc.mockResolvedValue();

    render(
      <MemoryRouter initialEntries={['/summary/test-user/summary-id']}>
        <Routes>
          <Route path="/summary/:uid/:id" element={<SummaryDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
    });
  });
});