import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './chatApp.css'; // Add custom CSS for styling
import io from 'socket.io-client';
import { useUserContext } from './UserProvider'; // Import the custom hook
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig'; // Import your Firebase setup

const ChatApp = () => {
  const [lastSeen, setLastSeen] = useState(null);
  const [isGroupMembersVisible, setIsGroupMembersVisible] = useState(false); // New state variable
  const [registered, setRegistered] = useState([]);  // To store all registered users
  const [messages, setMessages] = useState({}); // Store messages by receiver
  const [newMessage, setNewMessage] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); // Track selected chat user
  const [typingUser, setTypingUser] = useState(null); // Track who is typing
  const [searchTerm, setSearchTerm] = useState('');
  const[selectedGroup,setSelectedGroup]=useState('');
  const socket = useRef(null);
  const { user, friends,group_names } = useUserContext();
  const [groups, setGroups] = useState([]); // New state to manage groups
  const [isCreatingGroup, setIsCreatingGroup] = useState(false); // Track group creation dropdown visibility
  const [newGroupName, setNewGroupName] = useState(''); // Group name
  const [selectedFriends, setSelectedFriends] = useState([]); 

  
 console.log("group names",group_names);

//  useEffect(() => {
//   if (user) {
//     setCurrentUser(user.email);
//   }})
useEffect(() => {
  if (user) {
    setCurrentUser(user.email);
  }
}, [user, setCurrentUser]); // Include setCurrentUser as a dependency


// useEffect(() => {
//   if (currentUser) {
//     socket.current = io('http://localhost:5000');

//     socket.current.on('connect', () => {
//       console.log('Socket connected');
//     });
   

//     // socket.current.on('receive_message', (msg) => {
//     //   console.log('Received message:', msg);
//     //   setMessages((prevMessages) => {
//     //     const newMessages = { ...prevMessages };

//     //     if (!newMessages[msg.sender]) {
//     //       newMessages[msg.sender] = [];
//     //     }

//     //     // Prevent duplicating messages
//     //     const messageExists = newMessages[msg.sender].some(
//     //       (existingMsg) => existingMsg.time === msg.time && existingMsg.text === msg.text
//     //     );

//     //     if (!messageExists) {
//     //       newMessages[msg.sender].push(msg);
//     //     }
//     //     console.log(newMessages)

//     //     return newMessages;
//     //   });
//     // });
//     socket.current.on('receive_message', (msg) => {
//       console.log('Received message:', msg);
//       setMessages((prevMessages) => {
//         const newMessages = { ...prevMessages };
    
//         // If the message has a group key, set the sender to the group key
//         const sender = msg.group ? msg.group : msg.sender;
    
//         // Initialize the array if it doesn't exist for the sender (or group)
//         if (!newMessages[sender]) {
//           newMessages[sender] = [];
//         }
    
//         // Prevent duplicating messages
//         const messageExists = newMessages[sender].some(
//           (existingMsg) => existingMsg.time === msg.time && existingMsg.text === msg.text
//         );
    
//         if (!messageExists) {
//           newMessages[sender].push(msg);
//         }
        
//         console.log(newMessages);
    
//         return newMessages;
//       });
//     });
useEffect(() => {
  if (currentUser) {
    console.log(process.env.REACT_APP_API_URL);
    socket.current = io(process.env.REACT_APP_API_URL);
  
    // const socket = io(process.env.BACKEND_URL || "http://localhost:5000");


    socket.current.on('connect', () => {
      console.log('Socket connected');
    });
    socket.current.emit('online_status', { user: currentUser, status: 'online' });

    socket.current.on('receive_message', (msg) => {
      console.log('Received message:', msg);
      setMessages((prevMessages) => {
        const newMessages = { ...prevMessages };
        const sender = msg.group ? msg.group : msg.sender;

        if (!newMessages[sender]) {
          newMessages[sender] = [];
        }

        const messageExists = newMessages[sender].some(
          (existingMsg) => existingMsg.time === msg.time && existingMsg.text === msg.text
        );

        if (!messageExists) {
          newMessages[sender].push(msg);
        }

        return newMessages;
      });
    });

    socket.current.on('update_status', (data) => {
      console.log('Update status received:', data);
    
      setMessages((prevMessages) => {
        const newMessages = { ...prevMessages };
        const receiver = data.receiver;
    
        if (newMessages[receiver]) {
          newMessages[receiver] = newMessages[receiver].map((msg) =>
            msg.time === data.time ? { ...msg, status: data.status } : msg
          );
        }
    
        return newMessages;
      });
    });
    

//     socket.current.emit('register_user', currentUser);

//     return () => {
//       socket.current.disconnect();
//     };
//   }
// }, [currentUser]);


    socket.current.on('update_users', (users) => {
      console.log('Updated user list:', users);
      
      setOnlineUsers(users);
    });
    

    socket.current.on('typing', (user) => {
      if (user !== currentUser) {
        setTypingUser(user);
      }
    });

    // Listen for stop typing event
    socket.current.on('stop_typing', (user) => {
      if (user !== currentUser) {
        setTypingUser(null); // Clear typing user when stop typing event is received
      }
    });


      socket.current.emit('register_user', currentUser);

      return () => {
        socket.current.off('typing');
        socket.current.off('stop_typing');
        setTypingUser(null);
        socket.current.emit('online_status', { user: currentUser, status: 'offline' });
        socket.current.disconnect();
      };
      
    }
   
  }, [currentUser]);
  
  
  // const handleUsernameSubmit = () => {
  //   if (username.trim()) {
  //     setCurrentUser(username);
  //   } else {
  //     alert('Please enter a valid username');
  //   }
  // };
  const fetchUsers = async () => {
    try {
      const current = auth.currentUser;
      console.log(current);
      const usersRef = collection(db, 'users');
     
      const querySnapshot = await getDocs(usersRef);
      const newRegistered = [];
  
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;  // Get the unique document ID
  
        if (userData.username && !newRegistered.some(user => user.username === userData.username) &&
        current.email !== userId) {
          newRegistered.push({ ...userData, userId });  // Add the userId to the user data
        }
      });
  
      setRegistered(newRegistered);
      
      // Example of how to log unique ID and email for each registered user
      console.log(newRegistered)
      newRegistered.forEach(user => {
        console.log(`User ID: ${user.userId}`);
      });
    } catch (error) {
      
      console.error('Error fetching users:', error);
    }
  };
  useEffect(() => {
   fetchUsers();
  }, []);  
  

  // const handleSendMessage = () => {
  //   if (newMessage.trim() && selectedUser) {
  //     const message = {
  //       sender: currentUser,
  //       receiver: selectedUser,
  //       text: newMessage,
  //       time: new Date().toLocaleTimeString(),
  //     };
  //     console.log('Sending message:', message);
  //     socket.current.emit('send_message', message);
  //     socket.current.emit('stop_typing', currentUser); // Stop typing indicator when the message is sent

  //     setMessages((prevMessages) => {
  //       const newMessages = { ...prevMessages };
  //       if (!newMessages[selectedUser]) {
  //         newMessages[selectedUser] = [];
  //       }
  //       // Add new message if it doesn't already exist
  //       const messageExists = newMessages[selectedUser].some(
  //         (existingMsg) => existingMsg.time === message.time && existingMsg.text === message.text
  //       );
  //       if (!messageExists) {
  //         newMessages[selectedUser].push(message);
  //       }
  //       return newMessages;
  //     });
  //     setNewMessage('');
  //   }
  // };

  const handleTyping = () => {
    if (newMessage.trim()) {
      socket.current.emit('typing', currentUser); // Emit typing event
    } else {
      socket.current.emit('stop_typing', currentUser); // Emit stop typing event if the message is empty
    }
  };
  const handleSendMessage = () => {
    if (newMessage.trim() && (selectedUser || selectedGroup)) {
      const message = {
        sender: currentUser,
        text: newMessage,
        time: new Date().toLocaleTimeString(),
        status: 'single-tick',
      };
 
      // If selectedUser exists, send the message to that user
      if (selectedUser) {

        message.receiver = selectedUser;

        console.log('Sending message to user:', message);
        socket.current.emit('send_message', message);
      }
  
      // If selectedGroup exists, send the message to all group members
      if (selectedGroup) {
        // // Get all registered users that belong to the selected group
        // const groupMembers = registered.filter(user =>
        //   user.groups.includes(selectedGroup) // Assuming the user has a `groups` field with group names
        // );
  
        registered.forEach(member => {
          message.group=selectedGroup;
          message.receiver = member.userId;  // Assuming the email is the receiver for group members
          console.log('Sending message to group member:', message);
          socket.current.emit('send_message', message);
        });
      }
  
      // socket.current.emit('stop_typing', currentUser); // Stop typing indicator when the message is sent
  
      // Update messages state
      setMessages((prevMessages) => {
        const newMessages = { ...prevMessages };
  
        // Add new message to selected user or group
        const messageExists = newMessages[selectedUser || selectedGroup]?.some(
          (existingMsg) => existingMsg.time === message.time && existingMsg.text === message.text
        );
        if (!messageExists) {
          newMessages[selectedUser || selectedGroup] = newMessages[selectedUser || selectedGroup] || [];
          newMessages[selectedUser || selectedGroup].push(message);
        }
  
        return newMessages;
      });
      socket.current.emit('stop_typing', currentUser); 
      setNewMessage('');
    }
  };
  

  

  

  // const handleTyping = () => {
  //   if (newMessage.trim()) {
  //     socket.current.emit('typing', currentUser); // Emit typing event
  //   } else {
  //     socket.current.emit('stop_typing', currentUser); // Emit stop typing event if the message is empty
  //   }
  // };
  const handleGroupCreation = async () => {
    const user = auth.currentUser;
  
    // Validate group name and selected friends
    if (newGroupName.trim() && selectedFriends.length) {
      const newGroup = {
        name: newGroupName,
        members: selectedFriends,
      };
  
      // Update local state with the new group
      setGroups((prevGroups) => [...prevGroups, newGroup]);
  
      // Reset input fields and close the group creation modal
      setNewGroupName('');
      setSelectedFriends([]);
      setIsCreatingGroup(false);
  
      console.log('New group created:', newGroup);
  
      // If user is logged in, update their groups in Firestore
      if (user) {
        const userRef = doc(db, 'users', user.email);
  
        try {
          // Fetch current groups and add the new one for the current user
          const userSnapshot = await getDoc(userRef);
          const userData = userSnapshot.data();
          const currentGroups = userData.groups || [];
  
          // Add the new group to the user's groups list
          const updatedUserGroups = [...currentGroups, newGroup];
  
          // Update user document with the new groups array
          await updateDoc(userRef, {
            groups: updatedUserGroups,
          });
  
          console.log('Groups updated for current user successfully!');
  
          // Now, update the groups for each member in the new group
          for (const memberEmail of selectedFriends) {
            if (memberEmail !== user.email) {
              const memberRef = doc(db, 'users', memberEmail);
  
              // Fetch the current groups for each member
              const memberSnapshot = await getDoc(memberRef);
              const memberData = memberSnapshot.data();
              const memberGroups = memberData.groups || [];
  
              // Add the new group to their groups list
              const updatedMemberGroups = [...memberGroups, newGroup];
  
              // Update the member's document with the new groups
              await updateDoc(memberRef, {
                groups: updatedMemberGroups,
              });
  
              console.log(`Groups updated for member ${memberEmail}`);
            }
          }
  
        } catch (error) {
          console.error('Error updating groups:', error);
          alert('Failed to update groups. Please try again.');
        }
      }
    } else {
      alert('Please provide a valid group name and select at least one friend.');
      return; // Exit if validation fails
    }
  };
  
  
 console.log(onlineUsers);
  

 const [isContactsVisible, setIsContactsVisible] = useState(true); // Track visibility of contacts list
 useEffect(() => {
  const fetchGroups = async () => {
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, 'users', user.email);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        // console.log('User Groups:', userData.groups); // Log before setting state
        const userGroups = userData.groups || [];
        // const userGroupsData = userGroups.filter((group) =>
        //   group.members.includes(user.email)
        // );
        setGroups(userGroups); // Update state with filtered groups
      } else {
        console.log('No such user document!');
      }
    }
  };

  fetchGroups();
}, [currentUser]);

// useEffect(() => {
//   console.log('Updated Groups:', groups); // Log groups after state is updated
// }, [groups]);

const markAsRead = (message) => {
  console.log('Mark as read:', message);

  if (message.status !== 'blue-double-tick') {
    socket.current.emit('message_read', {
      sender: selectedUser,
      receiver: currentUser ,
      time: message.time,
    });
  }
};
useEffect(() => {
  if (selectedUser) {
    socket.current.emit('get_last_seen', selectedUser, (lastSeenTimestamp) => {
      setLastSeen(lastSeenTimestamp ? new Date(lastSeenTimestamp).toLocaleString() : '');
    });
  }
}, [selectedUser]);


 return (
  <div className="container">
  <div className="row clearfix">
    <div className="col-lg-12">
      <div className="card chat-app">
        {isContactsVisible && (!selectedUser ||!selectedGroup)&& (
          <div id="plist" className="people-list">
            {/* "+" Button */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4>       </h4>
              <button
                className="btn btn-primary btn-sm rounded-circle"
                onClick={() => setIsCreatingGroup(!isCreatingGroup)}
              >
                +
              </button>
            </div>

            {/* Group Creation Dropdown */}
            {isCreatingGroup && (
              <div className="dropdown-menu show p-3">
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Group Name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <ul className="list-unstyled">
                  {friends.map((friend, index) => (
                    <li key={index} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`friend-${index}`}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedFriends((prev) =>
                            checked
                              ? [...prev, friend.userId]
                              : prev.filter((id) => id !== friend.userId)
                          );
                        }}
                      />
                      <label className="form-check-label" htmlFor={`friend-${index}`}>
                        {friend.username} 
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  className="btn btn-primary btn-sm "
                  onClick={handleGroupCreation}
                >
                  Create Group
                </button>
              </div>
            )}

            {/* Display Groups */}
            {/* <h5 className="mt-3">Groups</h5> */}
            

         {/* Search and Contacts */}
<div className="input-group mt-3">
  <div className="input-group-prepend">
    <span className="input-group-text">
      <i className="fa fa-search"></i>
    </span>
  </div>
  <input
    type="text"
    className="form-control"
    placeholder="Search..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />
</div>

{/* Friends List */}
<ul className="list-unstyled chat-list mt-2 mb-0">
  {friends
    .filter((user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map((user, index) => {
      const isOnline = onlineUsers.includes(user.userId);
      return (
        <li
          key={index}
          className="clearfix"
          onClick={() => {
            setSelectedUser(user.userId);
            setIsContactsVisible(false);
          }}
        >
          <img
            src={
              user.profilePic ||
              'https://bootdey.com/img/Content/avatar/avatar4.png'
            }
            alt="avatar"
          />
          <div className="about">
            <div className="name">{user.username}</div>
            <div className="status">
              <i
                className={`fa fa-circle ${isOnline ? 'online' : 'offline'}`}
              ></i>
              
              {isOnline ? 'online' : 'offline'}
            </div>
          </div>
        </li>
      );
    })}
</ul>

{/* Groups List */}
{/* <h5 className="mt-3">Groups</h5> */}
<ul className="list-unstyled chat-list mt-2 mb-0">
  {/* {groups.length === 0 ? (
    <li>No groups available</li>
  ) : ( */}
   { groups.map((group, index) => (
      <li key={index} className="clearfix"
      onClick={() => {
        setSelectedGroup(group.name);
        setIsContactsVisible(false);
      }}
      >
        <img
          src={
            group.profilePic ||
            'https://bootdey.com/img/Content/avatar/avatar3.png'
          }
          alt="group avatar"
        />
        <div className="about">
          <div className="name">{group.name}</div>
          <div className="status">{group.members.length+1} members</div>
        </div>
      </li>
    ))
  }
</ul>

          </div>
        )}

                  {/* Chat Section - Only visible when a user is selected */}
                  {(selectedUser || selectedGroup)  && (
                      <div className="chat">
                          {/* Back button to show contacts */}
                          <div className="chat-header clearfix">
      <div className="row">
        <div className="col-lg-6 d-flex align-items-center">
          <button
            className="btn btn-link"
            onClick={() => {
              setSelectedUser(null); // Close the chat
              setSelectedGroup(null);
              setIsContactsVisible(true); // Show contacts again
            }}
          >
            <i className="fa fa-chevron-left"></i> {/* Back arrow */}
          </button>
          <a href="#view_info" data-toggle="modal" className="d-flex align-items-center">
            <img
              src="https://bootdey.com/img/Content/avatar/avatar2.png"
              alt="avatar"
            />
            <div className="chat-about ml-2">
              <h6
                className="mb-0"
                onClick={() => {
                  if (selectedGroup) {
                    setIsGroupMembersVisible((prev) => !prev); // Toggle visibility
                  }
                }}
                style={{ cursor: selectedGroup ? "pointer" : "default" }}
              >
                {selectedUser || selectedGroup}
              </h6>
             
              {selectedUser && (onlineUsers.includes(selectedUser) ? 'Online' : `Last seen: ${lastSeen || 'Loading...'}`)}<br />
              {typingUser && typingUser !== currentUser && <small> Typing...</small>}
              {/* <small>Last seen: {lastSeen || 'Loading...'}</small> */}
            </div>
          </a>
        </div>
        <div className="col-lg-6 d-flex justify-content-end">
          {["camera", "image", "cogs", "question"].map((icon, idx) => (
            <button
              key={idx}
              className={`btn btn-outline-${icon === "question" ? "warning" : "primary"}`}
            >
              <i className={`fa fa-${icon}`}></i>
            </button>
          ))}
        </div>
        {selectedGroup && isGroupMembersVisible && (
  <div className="group-members-dropdown">
  <ul className="members-list">
    {/* Display the total number of members only once */}
    <p><strong>{(groups.find((group) => group.name === selectedGroup)?.members.length || 0) + 1} members</strong></p>

    {/* Hardcoded "You" for the current user */}
    <li>
      <h6 className="member-item">You</h6>
    </li>

    {/* Map through the remaining members */}
    {groups
      .find((group) => group.name === selectedGroup)
      ?.members.map((member, idx) => (
        <li key={idx}>
          <h6 className="member-item">{member}</h6>
        </li>
      ))}
  </ul>
</div>

)}


      </div>
    </div>


    

//                           {/* Chat History */}
//                           <div className="chat-history">
//                           <ul className="list-unstyled">
//   {(messages[selectedUser] || messages[selectedGroup] || []).map((msg, index) => (
//     <li key={index} className="clearfix">
//       <div className="message-data">
//         <span className="message-data-name"></span>
//       </div>
//       <div
//         className={`message ${
//           msg.sender === currentUser ? 'my-message' : 'other-message'
//         } float-${msg.sender === currentUser ? 'right' : 'left'}`}
//         onClick={() => markAsRead(msg)}
//       >
//         {msg.text}
        
//         <div className="message-time">{msg.time}</div>
       
//         {msg.sender === currentUser && (
//           <div className="message-status">
//             {msg.status === 'single-tick' && <span className="single-tick"></span>}
//             {msg.status === 'double-tick' && <span className="double-tick"></span>}
//             {msg.status === 'blue-double-tick' && (
//               <span className="blue-double-tick"></span>
//             )}
//           </div>
//         )}
//       </div>
//     </li>
//   ))}
// </ul>


// </div>

<div className="chat-history">
  <ul className="list-unstyled">
    {(messages?.[selectedUser] || messages?.[selectedGroup] || []).map((msg, index) => (
      <li key={index} className="clearfix">
        <div
          className={`message-box ${
            msg.sender === currentUser ? 'my-message' : 'other-message'
          }`}
          onClick={() => markAsRead(msg)}
        >
          {/* Display sender name below the message in group chats */}
          {selectedGroup && typeof msg.sender === 'string' && msg.sender.includes('@') && (
            <div className="message-sender">
              {msg.sender.split('@')[0]}
            </div>
          )}
          <div className="message-text">{msg.text}</div>
          <div className="message-footer">
            <span className="message-time">{msg.time}</span>
            {msg.sender === currentUser && (
              <span className="message-status">
                {msg.status === 'single-tick' && <span className="single-tick"></span>}
                {msg.status === 'double-tick' && <span className="double-tick"></span>}
                {msg.status === 'blue-double-tick' && (
                  <span className="blue-double-tick"></span>
                )}
              </span>
            )}
          </div>
        </div>
      </li>
    ))}
  </ul>
</div>



                          {/* Chat Message Input */}
                          <div className="chat-message clearfix">
                              <div className="input-group mb-0">

                                  <div className="input-group-prepend">
                                      <span className="input-group-text">
                                          <i className="fa fa-send"></i>
                                      </span>
                                  </div>
                                  <input
                                      type="text"
                                      className="form-control"
                                      value={newMessage}
                                      onChange={(e) => {
                                          setNewMessage(e.target.value);
                                          handleTyping();
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSendMessage();
                                        }
                                      }}
                                      placeholder="Enter text here..."
                                  />
                                  <button
                                      className="my-button"
                                      onClick={handleSendMessage}
                                  >
                                      Send
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
  </div>
);
};

export default ChatApp;
