import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ChatApp from "./components/ChatApp";
import Signup from "./components/signup";
import Navbar from './components/navbar';
import Signin from './components/signin';
import Profile from './components/profilepage';
import { UserProvider } from './components/UserProvider'; // Import the UserProvider
function App() {
  return (
    <UserProvider>
    <Router>
      <Navbar />
      <Routes>
     
        <Route path="/" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/chat" element={<ChatApp />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
    </UserProvider>
  );
}

export default App;
