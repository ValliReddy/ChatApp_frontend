import React, { useEffect, useState,useCallback } from 'react';

import { db, auth } from './firebaseConfig'; // Import your Firebase setup
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Notification from './notification';
const ProfilePage = () => {
  const [username, setUsername] = useState('');
  const[curr,setCurrent]=useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [friends, setFriends] = useState([]);  // To store the list of friends
  const [registered, setRegistered] = useState([]);  // To store all registered users

  const [searchText, setSearchText] = useState('');  // For searching users by name
  const [notificationKey, setNotificationKey] = useState(0);
  const [error, setError] = useState('');

  // Fetch all users once on component mount
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
      // newRegistered.forEach(user => {
      //   console.log(`User ID: ${user.userId}`);
      // });
    } catch (error) {
      
      console.error('Error fetching users:', error);
    }
  };
  const fetchUserFriends = useCallback(async (userEmail) => {
    try {
      const userRef = doc(db, 'users', userEmail);
      const userSnap = await getDoc(userRef);
  
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const friendIds = userData.friends || [];
  
        // Fetch friend details by their IDs
        const friendsData = await Promise.all(
          friendIds.map(async (friendId) => {
            const friendRef = doc(db, 'users', friendId);
            const friendSnap = await getDoc(friendRef);
            return friendSnap.exists() ? friendSnap.data() : null;
          })
        );
  
        setFriends(friendsData.filter(Boolean)); // Exclude nulls
        console.log("Fetched friends:", friendsData);
      } else {
        console.log("User not found.");
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  }, []);
  

 // Fetch current user's friends
// const fetchUserFriends = async (userEmail) => {
 
//   try {
//     const userRef = doc(db, 'users', userEmail);
//     const userSnap = await getDoc(userRef);

//     if (userSnap.exists()) {
//       const userData = userSnap.data();
//       const friendIds = userData.friends || [];

//       // Fetch friend details by their IDs
//       const friendsData = await Promise.all(
//         friendIds.map(async (friendId) => {
//           const friendRef = doc(db, 'users', friendId);
//           const friendSnap = await getDoc(friendRef);
//           return friendSnap.exists() ? friendSnap.data() : null;
//         })
//       );

//       setFriends(friendsData.filter(Boolean)); // Exclude nulls if any friends are missing
//       console.log(friends);
//     } else {
//       console.log("User not found.");
//     }
//   } catch (error) {
//     console.error("Error fetching friends:", error);
//   }
// };


  // useEffect(() => {
  //   // fetchUsers(); // Fetch all registered users
  //   const unsubscribe = onAuthStateChanged(auth, async (user) => {
  //     if (user) {
  //       console.log("User signed in:", user.email);
  //       setCurrent(user.email);
  //       // Fetch user data from Firestore
  //       fetchUserFriends(user.email);
  //         // Get the user's friends

  //       // Check if user data exists in Firestore, create it if not
  //       const userRef = doc(db, 'users', user.email);
  //       const userSnap = await getDoc(userRef);

  //       if (!userSnap.exists()) {
  //         await setDoc(userRef, {
  //           username: user.displayName || 'Guest',
  //           profilePic: user.photoURL || '',
  //           friends: [],  // Start with an empty friends list
  //           chats: []  // Empty chats list initially
  //         });
  //         console.log("User data created in Firestore.");
  //       } else {
  //         console.log("User data already exists in Firestore.");
  //       }
  //     }
  //     fetchUsers(); // Fetch all registered users
  //   });

  //   return () => unsubscribe(); // Clean up the listener when component unmounts
  // }, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User signed in:", user.email);
        setCurrent(user.email);
  
        // Fetch user friends
        fetchUserFriends(user.email);
  
        // Check Firestore for user data
        const userRef = doc(db, 'users', user.email);
        const userSnap = await getDoc(userRef);
  
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            username: user.displayName || 'Guest',
            profilePic: user.photoURL || '',
            friends: [],
            chats: [],
          });
          console.log("User data created in Firestore.");
        } else {
          console.log("User data already exists in Firestore.");
        }
      }
      fetchUsers(); // Fetch all registered users
    });
  
    return () => unsubscribe();
  }, [fetchUserFriends]); // Include fetchUserFriends in dependencies
  

  const handleAddFriend = async (friend) => {
    const user = auth.currentUser;
    
    if (user && friend) {
      const userRef = doc(db, 'users', user.email);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
      
        // Validate friend ID and ensure it doesn't already exist
        if (!friend.id || userData.friends.includes(friend.id)) {
          console.log(friend.id);
          // alert('Invalid friend data or already added.');
          setError('Invalid friend data or already added.');
        setNotificationKey(prevKey => prevKey + 1);
        
          return;
        }
  
        try {
          const updatedFriends = [...(userData.friends || []), friend.id];
          await updateDoc(userRef, {
            friends: updatedFriends,
          });
          console.log(`Added ${friend.username} to friends`);
          fetchUserFriends(user.email); // Refresh friends list
        } catch (error) {
          console.error('Error adding friend:', error);
          alert('Failed to add friend. Please try again.');
        }
      }
    }
  };
  

  
  // Handle profile picture upload
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(URL.createObjectURL(file));
    }
  };

  // Filter registered users based on search input
  const filteredUsers = registered.filter((user) =>
    user.username.toLowerCase().includes(searchText.toLowerCase())
    
  );

  // Handle saving the updated profile info
  const handleSave = async () => {
    const user = auth.currentUser;
     console.log(user);
    if (user) {
      const userRef = doc(db, 'users', user.email);
  
      // Use default values if username or profilePic is undefined
      const updatedUsername = username || user.displayName || 'Guest';
      const updatedProfilePic = profilePic || user.photoURL || '';
  
      try {
        await updateDoc(userRef, {
          username: updatedUsername,
          profilePic: updatedProfilePic,
        });
       
        console.log('Profile updated successfully!');
        // alert('Profile updated!');
        setError('Profile updated!');
        setNotificationKey(prevKey => prevKey + 1);
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      }
    }
  };
  

  return (
    <div>
      <div className="container">
        <div className="row">
          <div className="col-lg-3 col-md-2"></div>
          <div className="col-lg-6 col-md-8 login-box">
            <div className="col-lg-12 login-key">
              <i className="fa fa-user" aria-hidden="true"></i>
            </div>
            <div className="col-lg-12 login-title">{curr}</div>

            <div className="col-lg-12 login-form">
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                {/* Left Section: Profile Picture and Username */}
                <div style={{ textAlign: 'center' }}>
                  <div className="form-group">
                    <div className="profile-pic-container" style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
                      <img
                        src={profilePic || "https://bootdey.com/img/Content/avatar/avatar1.png"}
                        alt="Profile"
                        className="profile-img"
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f8f9fa' }}
                      />
                      <input
                        type="file"
                        onChange={handleProfilePicChange}
                        className="form-control mt-2"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                    />
                  </div>
                  <button
        onClick={handleSave}
        style={{
          // position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 20px',
          borderRadius: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Save
      </button>
                </div>

                {/* Right Section: Add Friend and Friends List */}
                <div style={{ width: '300px', paddingLeft: '20px', borderLeft: '2px solid #f8f9fa', paddingTop: '20px' }}>
                  {/* Search Registered Users */}
                  <div className="form-group">
                    <label className="form-control-label">Search Friend</label>
                    <div className="input-group">
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="form-control"
                        placeholder="Enter friend's name"
                      />
                    </div>
                  </div>

                  {/* Registered Users List */}
                  <div className="form-group">
                    <label className="form-control-label">All Registered Users</label>
                    <ul>
                    {filteredUsers.map((user) => (
  <li key={user.userId} style={{ color: 'white', fontWeight: 'bold' }}>

    {user.username}
    {/* {user.userId} */}
    <button
      onClick={() => handleAddFriend({ id: user.userId, username: user.username })}
      style={{
        marginLeft: '10px',
        padding: '6px 12px',
        borderRadius: '20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      Add Friend
    </button>
  </li>
))};


                    
                    </ul>
                  </div>

                  {/* Friends List */}
                  <div className="form-group">
                    <label className="form-control-label">Your Friends</label>
                    <ul>
                    {friends.length > 0 ? (
      friends.map((friend, index) => (
        <li key={index} style={{ color: 'white', fontWeight: 'bold' }}>
          <img
            src={friend.profilePic || "https://bootdey.com/img/Content/avatar/avatar1.png"}
            alt={friend.username}
            style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px' }}
          />
          {friend.username}
        </li>
      ))
    ) : (
      <li>No friends yet</li>
    )}
    {error && (
          <Notification
            key={notificationKey}
            message={error}
          />
        )}

                    </ul>
                    
                  </div>
                  
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-2"></div>
        </div>
        
      </div>

      {/* Save Button */}
     
    </div>
  );
};

export default ProfilePage;






// import { useEffect } from 'react';
// import { auth, db } from './firebaseConfig';  // Import your Firebase setup
// import { onAuthStateChanged } from 'firebase/auth';
// import { doc, setDoc,getDoc } from 'firebase/firestore';

// const ProfilePage = () => {
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (user) {
//         console.log("User signed in:", user.email);

//         // Check if the user already exists in Firestore
//         const userRef = doc(db, 'users', user.email);
//         const userSnap = await getDoc(userRef);

//         // If user doesn't exist, create a new document with their email
//         if (!userSnap.exists()) {
//           await setDoc(userRef, {
//             username: user.displayName || 'Sagar',  // You can add more fields here
//             profilePic: user.photoURL || '',  // Default or provided photo URL
//             friends: [],  // Empty friends list initially
//             chats: []  // Empty chats list initially
//           });
//           console.log("User data created in Firestore.");
//         } else {
//           console.log("User data already exists in Firestore.");
//         }
//       }
//     });

//     return () => unsubscribe(); // Clean up the listener when the component unmounts
//   }, []);

//   return (
//     <div>
//       <h1>Test Firebase Integration</h1>
//     </div>
//   );
// };

// export default ProfilePage;

