import React, { useState, useEffect } from 'react';

function Notification({ message }) {
  const [showMsg, setShowMsg] = useState(false); // Start with false initially
  const [timeLeft, setTimeLeft] = useState(5); // Timer state initialized to 5 seconds

  useEffect(() => {
    if (showMsg && timeLeft > -1) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === -1) {
      setShowMsg(false);
      setTimeLeft(5); // Reset timeLeft for next notification
    }
  }, [showMsg, timeLeft]);

  useEffect(() => {
    // Reset showMsg and timeLeft when message changes (new notification)
    if (message) {
      setShowMsg(true);
      setTimeLeft(5); // Reset the timer countdown
    }
  }, [message]);

  return (
    <>
      {showMsg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{
            position: 'fixed',
            top: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            padding: '20px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            zIndex: 1001,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{message}</span>
              <a
                onClick={() => setShowMsg(false)}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#3182ce',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                //   textDecoration: 'underline',
                }}
              >
                X
              </a>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#4a5568' }}>
              Disappearing in {timeLeft} seconds
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', marginTop: '0.5rem' }}>
              <div style={{
                width: `${(timeLeft / 5) * 100}%`,
                height: '100%',
                backgroundColor: '#3182ce',
                transition: `width ${timeLeft === 5 ? 0 : 1}s linear`,
              }}></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Notification;
