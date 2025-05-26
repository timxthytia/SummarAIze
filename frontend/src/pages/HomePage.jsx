import React from 'react';
import { useNavigate } from 'react-router-dom';

const Homepage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 text-gray-800">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome to SummarAIze</h1>
        <p className="text-lg text-gray-600">Your smart study companion</p>
      </header>

      <div className="flex gap-4">
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          Login
        </button>
        <button
          onClick={() => navigate('/register')}
          className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
        >
          Register
        </button>
      </div>
    </div>
  );
};

export default Homepage;