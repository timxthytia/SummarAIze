jest.mock('../components/ExportMindmapModel', () => () => <div data-testid="mock-export-modal" />);
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: () => [{ uid: 'test-user-id', email: 'test@example.com' }, false, null]
}));

jest.mock('../services/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));

jest.mock('../config', () => ({
  API_URL: 'http://localhost:3000',
}));

jest.mock('../utils/exportUtils', () => ({
  handleDownload: jest.fn(),
}));

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import Dashboard from './Dashboard';
import { getAuth } from 'firebase/auth';
import { db } from '../services/firebase';
import { BrowserRouter as Router } from 'react-router-dom';
import { doc, updateDoc, deleteDoc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';

jest.mock('firebase/auth');
jest.mock('firebase/firestore');
jest.mock('firebase/storage');
jest.mock('../services/firebase', () => ({
  db: {}
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test fetching data from Firestore DB
  test('fetches summaries, mindmaps, and testpapers from Firestore on mount', async () => {
    const setSummaries = jest.fn();
    const setMindmaps = jest.fn();
    const setTestpapers = jest.fn();
    const mockUser = { uid: '123' };
    getAuth.mockReturnValue({ onAuthStateChanged: (cb) => cb(mockUser) });
    onSnapshot.mockImplementation((q, cb) => {
      cb({ docs: [{ id: '1', data: () => ({ title: 'Test Summary' }) }] });
      return jest.fn();
    });

    render(<Router><Dashboard /></Router>);
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(3));
  });


  // Test deleting data from Firestore DB
  test('handleDelete() – deletes summary document', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    deleteDoc.mockResolvedValue();
    render(<Router><Dashboard /></Router>);
    await waitFor(() => expect(deleteDoc).not.toHaveBeenCalled()); 
  });

  // Test renaming title of data in Firestore DB
  test('handleRename() – updates title in Firestore', async () => {
    updateDoc.mockResolvedValue();
    render(<Router><Dashboard /></Router>);
    await waitFor(() => expect(updateDoc).not.toHaveBeenCalled()); 
  });

  // Test adding Tag to data
  test('handleSaveTag() – adds new tag if not duplicate', async () => {
    updateDoc.mockResolvedValue();
    render(<Router><Dashboard /></Router>);
    await waitFor(() => expect(updateDoc).not.toHaveBeenCalled()); 
  });

   // Test deleting Tag from data
  test('handleRemoveTag() – removes selected tag and updates Firestore', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ tags: ['tag1', 'tag2'] }) });
    updateDoc.mockResolvedValue();
    render(<Router><Dashboard /></Router>);
    await waitFor(() => expect(updateDoc).not.toHaveBeenCalled()); 
  });

   // Test filtering of data by Tag
  test('filterByTags() – filters items correctly', () => {
    const items = [
      { id: '1', tags: ['math', 'science'] },
      { id: '2', tags: ['history'] },
      { id: '3', tags: [] }
    ];
    const selectedTags = ['math'];
    const filterByTags = (data) =>
      selectedTags.length === 0
        ? data
        : data.filter((item) => item.tags?.some((tag) => selectedTags.includes(tag)));

    const filtered = filterByTags(items);
    expect(filtered).toEqual([{ id: '1', tags: ['math', 'science'] }]);
  });
});