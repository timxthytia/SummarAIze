


import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import CustomNode from './CustomNode';

describe('CustomNode', () => {
    // Test handleTextChange()
    test('handleTextChange() – updates label and fires onChange callback', () => {
        const handleChange = jest.fn();
        const { getByRole } = render(
        <ReactFlowProvider>
            <CustomNode data={{ label: 'Initial', onChange: handleChange }} />
        </ReactFlowProvider>
        );
        const textarea = getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Updated text' } });
        expect(handleChange).toHaveBeenCalledWith('Updated text');
    });

    // Test handleBgColorChange()
    test('handleBgColorChange() – updates state and fires onChangeColors', () => {
        const handleColorChange = jest.fn();
        const { getByText, getByLabelText } = render(
            <ReactFlowProvider>
                <CustomNode data={{ onChangeColors: handleColorChange }} />
            </ReactFlowProvider>
        );
        fireEvent.click(getByText('...'));
        const bgColorInput = getByLabelText(/background/i);
        fireEvent.change(bgColorInput, { target: { value: '#123456' } });
        expect(handleColorChange).toHaveBeenCalledWith({
            bgColor: '#123456',
            borderColor: '#000000',
        });
    });

    // Test handleBorderColorChange()
    test('handleBorderColorChange() – updates state and fires onChangeColors', () => {
        const handleColorChange = jest.fn();
        const { getByText, getByLabelText } = render(
            <ReactFlowProvider>
                <CustomNode data={{ onChangeColors: handleColorChange }} />
            </ReactFlowProvider>
        );
        fireEvent.click(getByText('...'));
        const borderColorInput = getByLabelText(/border/i);
        fireEvent.change(borderColorInput, { target: { value: '#abcdef' } });
        expect(handleColorChange).toHaveBeenCalledWith({
            bgColor: '#ffffff',
            borderColor: '#abcdef',
        });
    });

    // Test Auto-resizing of nodes
    test('Auto-resizing <textarea> via useEffect()', () => {
        const { getByRole } = render(
            <ReactFlowProvider>
                <CustomNode data={{ label: 'Test\nLine\nBreaks' }} />
            </ReactFlowProvider>
        );
        const textarea = getByRole('textbox');

        // Mock scrollHeight to simulate content growth
        Object.defineProperty(textarea, 'scrollHeight', {
            value: 100,
            writable: true,
        });

        // Trigger useEffect resize logic
        fireEvent.change(textarea, { target: { value: 'Test\nLine\nBreaks\nNew Line' } });

        // Check if height has been updated 
        expect(textarea.style.height).toBe('100px');
    });
});