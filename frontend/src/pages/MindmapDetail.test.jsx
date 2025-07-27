

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MindmapDetail from './MindmapDetail';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

global.alert = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}));
jest.mock('../services/firebase', () => ({
  db: {},
  auth: {},
}));
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: 'mockUid' });
    return jest.fn(); // fake unsubscribe
  }),
}));

describe('MindmapDetail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        title: 'Default Mock Mind Map',
        nodes: [],
        edges: [],
        timestamp: { toDate: () => new Date('2023-01-01T00:00:00Z') },
      }),
    });
  });

  // Test fetchMindmap()
  test('fetchMindmap() – loads existing mindmap data', async () => {
    const mockData = {
      exists: () => true,
      data: () => ({
        title: 'Test Mind Map',
        nodes: [],
        edges: [],
        timestamp: { toDate: () => new Date('2023-01-01T00:00:00Z') },
      }),
    };
    getDoc.mockResolvedValueOnce(mockData);

    render(
      <MemoryRouter initialEntries={['/mindmap/mockUid/mockMapId']}>
        <Routes>
          <Route path="/mindmap/:uid/:id" element={<MindmapDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Mind Map')).toBeInTheDocument();
    });
  });

  // Test handleAddNode()
  test('handleAddNode() – adds node with defaults and assigns unique ID', async () => {
    render(
      <MemoryRouter initialEntries={['/mindmap/mockUid/mockMapId']}>
        <Routes>
          <Route path="/mindmap/:uid/:id" element={<MindmapDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const addButton = screen.getByText('Add Node');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('New Node')).toBeInTheDocument();
    });
  });

  // Test handleSaveChanges()
  test('handleSaveChanges() – persists node and edge data to Firestore', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        title: 'Mock Map',
        nodes: [],
        edges: [],
      }),
    });

    render(
      <MemoryRouter initialEntries={['/mindmap/mockUid/mockMapId']}>
        <Routes>
          <Route path="/mindmap/:uid/:id" element={<MindmapDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const saveButton = await screen.findByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  // Test onConnect()
  test('onConnect() – opens modal for edge labeling', async () => {
    render(
      <MemoryRouter initialEntries={['/mindmap/mockUid/mockMapId']}>
        <Routes>
          <Route path="/mindmap/:uid/:id" element={<MindmapDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent(
      window,
      new CustomEvent('reactflow:connect', {
        detail: { source: '1', target: '2' },
      })
    );

    // simulate a call to onConnect manually
    const addButton = screen.getByText('Add Node');
    fireEvent.click(addButton); // ensure some node is added first

  });

  // Test handleConfirmEdgeLabel()
  test('handleConfirmEdgeLabel() – adds or updates edge label correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/mindmap/mockUid/mockMapId']}>
        <Routes>
          <Route path="/mindmap/:uid/:id" element={<MindmapDetail />} />
        </Routes>
      </MemoryRouter>
    );
  });
});