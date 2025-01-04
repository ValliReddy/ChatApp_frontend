import React from "react";
import { Link } from "react-router-dom";
import "./navbar.css";

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="container">
      <div className="navbar-header">
  <Link to="/" className="navbar-brand cursive">
    ChatterBox
  </Link>
</div>
        <nav className="navbar-nav">
          <ul>
            {/* <li>
              <Link to="/">Home</Link>
            </li> */}
            {/* <li className="dropdown">
              <span className="dropbtn">Sign in</span>
             
            </li> */}
            <li>
              <Link to="/" >Home</Link>
            </li>
            <li>
              <Link to="/signin">Sign in</Link>
            </li>
            <li>
              <Link to="/profile">Profile</Link>
            </li>
            <li>
              <Link to="/chat">ChatBox</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
