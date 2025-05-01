import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import RecruiterDashboard from './components/RecruiterDashboard';
import AddCandidate from './components/AddCandidateForm'; 
import Positions from './components/Positions'; 
import KanbanBoard from './components/KanbanBoard';

const App = () => {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
            <Route path="/" element={<RecruiterDashboard />} />
            <Route path="/add-candidate" element={<AddCandidate />} /> {/* Agrega esta línea */}
            <Route path="/positions" element={<Positions />} />
            <Route path="/positions/:id" element={<KanbanBoard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App; 