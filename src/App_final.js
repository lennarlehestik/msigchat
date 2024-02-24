import React, { useRef, useState, useEffect } from 'react';
import { withUAL } from "ual-reactjs-renderer";
import './App.css'
import Sheet from '@mui/joy/Sheet';
import Drawer from '@mui/joy/Drawer';
import { Scrollbars } from 'react-custom-scrollbars-2';
import Swal from 'sweetalert2'
import Popover from '@mui/material/Popover';
import Linkify from 'react-linkify';
window.Buffer = require('buffer/').Buffer;



function App(props) {
  const {
    ual: { activeUser, showModal, logout },
    endpoint
  } = props;

  const [open, setModalOpen] = useState(false);
  const [userOpen, setUserModalOpen] = useState(false);
  const [addChatOpen, setAddChatModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  //POPOVER
  const [anchorEl, setAnchorEl] = useState(null);
  const [openPopoverIndex, setOpenPopoverIndex] = useState(null);

  const handleClick = (index, event) => {
    setAnchorEl(event.currentTarget);
    setOpenPopoverIndex(prevIndex => (prevIndex === index ? null : index));
  };

  const handleClose = () => {
    setAnchorEl(null);
    setOpenPopoverIndex(null);
  };

  const [accountName, setAccountName] = useState("");
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState("")
  const [communities, setCommunities] = useState()
  const [profiles, setProfiles] = useState()
  const [currentCommunity, setCurrentCommunity] = useState()
  const [msiggers, setMsiggers] = useState([])
  const [memo, setMemo] = useState("")
  const [refetch, setRefetch] = useState(0)
  const [userProfile, setUserProfile] = useState({
    name_in_chat: '',
    description: '',
    profile_img_url: ''
  });
  const scrollbarsRef = useRef();
  const [currentProfile, setCurrentProfile] = useState("")
  const [communitySettingsOpen, setCommunitySettingsOpen] = useState(false)
  const [delApproval, setDelApproval] = useState()
  const [editCommunityData, setEditCommunityData] = useState({})
  const [addChat, setAddChat] = useState({})
  const [connected, setConnected] = useState(false)
  const [awProfiles, setAwProfiles] = useState([])
  const [delMessagesAmount, setDelMessagesAmount] = useState(0)
  const [verified, setVerified] = useState(false)
  const openUserProfile = (user) => {
    setCurrentProfile(user)
    setProfileOpen(true)
  }

  const deleteMessage = async (id, handleClose) => {
    console.log(id)
    handleClose()
    console.dir({user: accountName,
      message_id:id,
      community: currentCommunity.chat_account})
    if (activeUser) {
      try {
        const action = {
          actions: [{
            account: 'chat',
            name: 'delmessage',
            authorization: [{
              actor: accountName,
              permission: 'active',
            }],
            data: {
              user: accountName,
              message_id:id,
              chat_account: currentCommunity.chat_account
            }
          }]
        };

        // Sign the transaction
        const result = await activeUser.signTransaction(action, {
          broadcast: true,
          expireSeconds: 60,
          blocksBehind: 3
        });
        console.log(messages)
        setMessages(prevMessages => {
          return {
              ...prevMessages,
              rows: prevMessages.rows.filter(message => message.id !== id)
          };
      });
      } catch (error) {
        console.error("Signing error", error.message);
        sweetAlert("There was a problem deleting the message.")
      }
    }
  }


  useEffect(() => {
    // Auto-scroll to the bottom whenever messages update
    if (scrollbarsRef.current) {
      const { scrollHeight } = scrollbarsRef.current.getValues();
      scrollbarsRef.current.scrollTop(scrollHeight);
    }
  }, [messages?.rows?.length]);

  useEffect(() => {
    if (activeUser) {
      console.log(activeUser)
      const accountName = activeUser.getAccountName();
      accountName.then(function (result) {
        setAccountName(result);
      });
    }
  }, [activeUser]);

  useEffect(() => {
    // Define an async function
    const fetchData = async () => {
      try {
        // URL to EOSIO node
        const url = `${endpoint}/v1/chain/get_account`;
        // Fetch data from EOSIO node
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({ account_name: currentCommunity?.chat_account }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // If response is not ok, throw an error
        if (!response.ok) {
          throw Error('Network response was not ok' + response.statusText);
        }

        // Parse JSON data
        const data = await response.json();
        // Update state with data
        const account_list = data.permissions.find(item => item.perm_name === currentCommunity.permission);
        const actors = account_list.required_auth.accounts.map(
          account => account.permission.actor
        );
        setMsiggers(actors);

        let dacList
        await fetch(`https://api.alienworlds.io/v2/dao/dacs`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })
        .then((response) =>
            response.json().then((res) => {
              dacList = res
            })
          ) 

        function getDacIdByAuth(authValue) {
          const foundItem = dacList.results.find(item => item.owner === authValue);
          return foundItem ? foundItem.dacId : null;
        }
        const authToSearch = currentCommunity?.chat_account;
        const dacId = getDacIdByAuth(authToSearch);
        await fetch(`https://api.alienworlds.io/v2/dao/${dacId}/profile?account=${actors.join(",")}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })
        .then((response) =>
            response.json().then((res) => {
              let organizedProfiles = {};

              res?.results.forEach(item => {
                organizedProfiles[item.account] = item;
              });

              setAwProfiles(organizedProfiles)
            })
          )
      } catch (error) {
        // Update error state
        console.log(error);
        // Update loading state
      }
    };

    // Invoke the async function
    fetchData();
  }, [currentCommunity, refetch]);

  useEffect(() => {
    // When profiles are fetched, update userProfile state
    if (profiles) {
      setUserProfile(profiles[accountName]);
    }
    if (currentCommunity) {
      setEditCommunityData(currentCommunity);
    }
  }, [currentCommunity, refetch]);

  const connectToWebSocket = async() => {
    var messagesvariable = [];
    if(ws){
      ws.close()
    }
        // Establish WebSocket connection
    //const websocket = new WebSocket('wss://eoschat-0469a740468f.herokuapp.com/');
    const websocket = new WebSocket('ws://localhost:3000/');

    setWs(websocket);

    websocket.onopen = () => {
      console.log("WebSocket connection established");
      // Ping server every 30 seconds to keep the connection alive
      const pingInterval = setInterval(() => {
        if (websocket.readyState === websocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ping' }));
        }
    }, 30000);

    // Cleanup interval on close/error
    websocket.onclose = () => {
        clearInterval(pingInterval);
        setVerified(false)
        console.log("WebSocket connection closed");
        setConnected(false);
    };
    websocket.onerror = (err) => {
      clearInterval(pingInterval);
      console.error("WebSocket error:", err);
    };
  };

  websocket.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    console.log("Received data:", data);
  
    if (data.type === "memo") {
      setMemo(data.memo);
    } else if (data.verified === true) {
      setVerified(true);
    } else if (data.type === "FAILED_TO_VERIFY") {
      sweetAlert(data?.message);
    } else {
      console.log("ISARRAY: " + Array.isArray(data.rows.rows));
      console.log("FIRSTBATCH: " + data.firstBatch);
  
      if (Array.isArray(data.rows.rows)) {
        if (data.firstBatch || data.deleteResponse) {
          setMessages(data.rows); // Set the 'rows' object directly
          messagesvariable = data.rows || []
        } else {
          const existingRows = messagesvariable.rows || [];
          console.log("Existing rows:", messagesvariable);
          console.log("DATA ROWS" + data.rows.rows)
  
          const newUniqueRows = data.rows.rows.filter(newRow => 
            !existingRows.some(existingRow => existingRow.id.toString() === newRow.id.toString())
            );
  
          console.log("New unique rows:", newUniqueRows);
  
          if (newUniqueRows.length > 0) {
            setMessages(previousMessages => {
              const updatedMessages = {
                  ...previousMessages,
                  rows: [...previousMessages.rows, ...newUniqueRows]
              };
      
              // Update the ref with the new messages
              messagesvariable = updatedMessages;
      
              return updatedMessages;
          });
          }
        }
      } else {
        console.warn("Received data without 'rows.rows' or 'rows.rows' is not an array.");
      }
  
      if (data) {
        setConnected(true);
      }
    }
  };
  
  
  
  
  
  
    
    websocket.onclose = () => {
      console.log("WebSocket connection closed");
      setConnected(false)
    };
    
    websocket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return () => {
      websocket.close();
    };
  }

  useEffect(()=>{
    connectToWebSocket()
  },[currentCommunity])
  
  
  

  useEffect(()=>{
    fetch(`${endpoint}/v1/chain/get_table_rows`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: true,
        code: "chat",
        table: "chats",
        scope: "chat",
        limit:1000
      }),
    })
      .then((response) =>
        response.json().then((res) => {
          setCommunities(res?.rows)
          const params = new URLSearchParams(window.location.search);
          const communityparam = params.get('community');
          
          if (communityparam) {
            res?.rows?.filter((value, index)=>{
              if(value.chat_account == communityparam){
                changeCommunity(value)
                setEditCommunityData(value)
              }
            })
          }
        })
      )
      .catch((e) => console.log(e));
  },[refetch])

  useEffect(()=>{
    fetch(`${endpoint}/v1/chain/get_table_rows`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: true,
        code: "chat",
        table: "profile",
        scope: "chat",
        limit:500
      }),
    })
      .then((response) =>
        response.json().then((res) => {
          const userMap = res?.rows.reduce((acc, user) => {
            acc[user.user] = {
                name_in_chat: user?.name_in_chat,
                description: user?.description,
                profile_img_url: user?.profile_img_url
            };
            return acc;
        }, {});
        setProfiles(userMap)
        })
      )
      .catch((e) => console.log(e));
  }, [refetch])

  const editProfile = async () => {
    if (activeUser) {
      try {
        const action = {
          actions: [{
            account: 'chat',
            name: 'setprofile',
            authorization: [{
              actor: accountName,
              permission: 'active',
            }],
            data: {
              user: accountName,
              name_in_chat: userProfile?.name_in_chat || profiles[accountName]?.name_in_chat,
              description: userProfile?.description || profiles[accountName]?.description,
              profile_img_url: userProfile?.profile_img_url || profiles[accountName]?.profile_img_url
            }
          }]
        };

        // Sign the transaction
        const result = await activeUser.signTransaction(action, {
          broadcast: true,
          expireSeconds: 60,
          blocksBehind: 3
        });
        setUserModalOpen(false)
        sweetAlert("Profile edited!")
        
  } catch (error) {
    console.error("Signing error", error.message);
    setUserModalOpen(false)
    sweetAlert("There was a problem editing your profile.")
  }
  }
  }
  
  const deleteProfile = async () => {
    if (activeUser) {
      try {
        const action = {
          actions: [{
            account: 'chat',
            name: 'delprofile',
            authorization: [{
              actor: accountName,
              permission: 'active',
            }],
            data: {
              user: accountName
            }
          }]
        };

        // Sign the transaction
        const result = await activeUser.signTransaction(action, {
          broadcast: true,
          expireSeconds: 60,
          blocksBehind: 3
        });
      } catch (error) {
        console.error("Signing error", error.message);
        sweetAlert("There was a problem deleting your profile.")
      }
    }
  }

  const addCommunity = async () => {
    if (activeUser) {
      try {
        const action = {
          actions: [{
            account: 'chat',
            name: 'setchat',
            authorization: [{
              actor: accountName,
              permission: 'active',
            }],
            data: {
              chat_account: addChat["chat_account"],
              adder: accountName,
              permission: addChat["permission"],
              community_profile_img_url: addChat["community_profile_img_url"],
              community_background_img_url: addChat["community_background_img_url"],
              description: addChat["description"]
              }
          }]
        };

        // Sign the transaction
        const result = await activeUser.signTransaction(action, {
          broadcast: true,
          expireSeconds: 60
        });
        setAddChatModalOpen(false)
        sweetAlert("Community added!")
        setRefetch(prevRefetch => prevRefetch + 1);
        setAddChat({})
      } catch (error) {
        console.error("Signing error", error.message);
        setAddChatModalOpen(false)
        sweetAlert("There was a problem adding the community.")
      }
    }
  }
  const formatDateToLocal = (utcDate) => {
    // Check for the Unix epoch start timestamp
    if (utcDate === "1970-01-01T00:00:00") {
      return "";
    }
  
    // Ensure the date is treated as UTC
    const date = new Date(utcDate + 'Z');
  
    // Extract and format the components of the date
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
  
    return `${day} ${month} ${hours}:${minutes}`;
  };

  const editCommunity = ()=>{
    // Send transaction to verify via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      let data = editCommunityData
      data["accountName"] = accountName
      const payload = JSON.stringify({
        type: 'EDIT_COMMUNITY', 
        payload: data
    });
    ws.send(payload);
    setCommunitySettingsOpen(false)
    sweetAlert("Community edit submitted!")
    setRefetch(prevRefetch => prevRefetch + 1);
    } else {
      console.error("WebSocket is not open");
    }
  }
  
  const openCommunitySettings = () => {
    if(verified){
      setCommunitySettingsOpen(true)
    }
    else{
      sweetAlert("Connect to the community to change community settings.")
    }
  }

  const signDummyTransaction = async () => {
    console.log(activeUser, accountName, memo)
    if (activeUser) {
      try {
        const action = {
          actions: [{
            account: 'chat',
            name: 'signin',
            authorization: [{
              actor: accountName,
              permission: 'active',
            }],
            data: {
              memo: memo
            }
          }]
        };

        // Sign the transaction
        const result = await activeUser.signTransaction(action, {
          broadcast: false,
          expireSeconds: 60,
          blocksBehind: 3
        });
        // Send transaction to verify via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Function to ensure serializedTransaction is an array
            function ensureArrayFormat(serializedTransaction) {
              if (Array.isArray(serializedTransaction)) {
                return serializedTransaction; // It's already in the correct format
              } else if (typeof serializedTransaction === 'object') {
                // Convert object to array if necessary
                const arrayFormat = Object.keys(serializedTransaction).map(key => serializedTransaction[key]);
                return arrayFormat;
              } else {
                console.error("Unexpected serializedTransaction format");
                return []; // Return an empty array or handle error appropriately
              }
            }

            // Prepare the payload, ensuring serializedTransaction is in the correct format
            const payload = JSON.stringify({
              type: 'TRANSACTION_VERIFICATION', 
              payload: {
                serializedTransaction: ensureArrayFormat(result.transaction.serializedTransaction),
                signatures: result.transaction.signatures,
                accountName,
                community: currentCommunity.chat_account,
                permission: currentCommunity.permission
              }
            });
        console.log(payload)
        ws.send(payload);
        } else {
          console.error("WebSocket is not open");
        }
      } catch (error) {
        console.error("Signing error", error.message);
        sweetAlert("There was a problem signing the transaction.")
      }
    } else {
      console.error("User is not logged in");
    }
    await fetch(`${endpoint}/v1/chain/get_table_rows`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: true,
        code: "chat",
        table: "delapproval",
        scope: "chat",
        lower_bound: currentCommunity.chat_account,
        upper_bound: currentCommunity.chat_account
      }),
    })
      .then((response) =>
        response.json().then((res) => {
        if(res?.rows[0]?.approved_to_delete == 1){
          setDelApproval(true)
        }
        else{
          setDelApproval(false)
        }
        })
      )
      .catch((e) => console.log(e));
  };

  const sweetAlert = (message) => {
    const Toast = Swal.mixin({
      toast: true,
      position: "bottom-end",
      showConfirmButton: false,
      timer: 6000,
      timerProgressBar: true,
      onOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });
    Toast.fire({
      title: message,
    });
  }
  
  const deleteMessages = () => {
    if(delMessagesAmount > 0){
      // Send transaction to verify via WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({
          type: 'DELETE_MESSAGES', 
          payload: {
              amount: delMessagesAmount,
              community: currentCommunity.chat_account
          }
      });
      ws.send(payload);
      setDelMessagesAmount(0)
      setCommunitySettingsOpen(false)
      sweetAlert("Request to delete messages sent.")
    } else {
        console.error("WebSocket is not open");
      }
    }
    else{
      sweetAlert("Amount must be greater than 0!")
    }
  }

  const deleteCommunity = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({
          type: 'DELETE_MESSAGES', 
          payload: {
              community: currentCommunity.chat_account
          }
      });
      ws.send(payload);
      setDelMessagesAmount(0)
      setCommunitySettingsOpen(false)
      sweetAlert("Request to delete community sent.")
    } else {
        console.error("WebSocket is not open");
      }
    }
  

  const submitMessage = () => {
      if(message.length > 500){
        sweetAlert("Your message is longer than 500 characters!")
        return
      }
      if(message.trim().length < 1){
        sweetAlert("You can't submit an empty message.")
        return
      }
      // Send transaction to verify via WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({
          type: 'SEND_MESSAGE', 
          payload: {
              message: message,
              accountName: accountName,
              community: currentCommunity.chat_account
          }
      });
      ws.send(payload);
      setMessage("")
      } else {
        console.error("WebSocket is not open");
      }
  }

  const logoutUser = async () => {
    try {
      await logout();
      setAccountName(""); // Clear the account name after logout
      setMessages([]);
      setConnected(false)
      ws.close()
      } catch (error) {
      console.error("Logout error", error.message);
    }
  };

  const changeCommunity = (community) => {
    if(ws){
      ws.close();
    }
    connectToWebSocket();
    setMessages([]);
    setCurrentCommunity(community);
    setModalOpen(false);
  
    // Create a new URLSearchParams object
    let searchParams = new URLSearchParams(window.location.search);
  
    // Set the 'community' query parameter
    searchParams.set('community', community?.chat_account);
  
    // Construct the new URL
    const newUrl = `${window.location.origin}/?${searchParams.toString()}`;
  
    // Update the URL in the address bar
    window.history.pushState({ path: newUrl }, '', newUrl);
  }
  

  const handleAddCommunityInputChange = (e) => {
    const { name, value } = e.target;
    setAddChat(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setUserProfile(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleCommunityInputChange = (e) => {
    const { name, value } = e.target;
    setEditCommunityData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  function setVhVariable() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  
  // Set the variable initially
  setVhVariable();
  
  // Update on resize or orientation change
  window.addEventListener('resize', setVhVariable);
  window.addEventListener('orientationchange', setVhVariable);


  return (
    <>
    {accountName ?
    <div className="App">
            <Drawer
        size="md"
        variant="plain"
        open={open}
        anchor="right"
        onClose={() => setModalOpen(false)}
        slotProps={{
          content: {
            sx: {
              bgcolor: 'transparent',
              p: { md: 3, sm: 0 },
              boxShadow: 'none',
            },
          },
        }}
      >
        <Sheet
          sx={{
            borderRadius: 'md',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: '100%',
            overflow: 'auto',
          }}
        >
          <Scrollbars style={{ width: "100%", height: "100%" }}>
          {communities?.map((value, index)=>{
            return(
            <div className="communityCardCommunity" onClick={()=>changeCommunity(value)}>
              <img 
                className="communityCardImage" 
                style={{
                  backgroundImage: `url(${value?.community_profile_img_url})` 
                }}
              />              
              <div>{value.chat_account}</div>
            </div>)
          })}
          </Scrollbars>
      </Sheet>
      </Drawer>

      <Drawer
        size="md"
        variant="plain"
        open={addChatOpen}
        anchor="right"
        onClose={() => setAddChatModalOpen(false)}
        slotProps={{
          content: {
            sx: {
              bgcolor: 'transparent',
              p: { md: 3, sm: 0 },
              boxShadow: 'none',
            },
          },
        }}
      >
        <Sheet
          sx={{
            borderRadius: 'md',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: '100%',
            overflow: 'auto',
          }}
        >
          <div className="profileContents">
          <div style={{fontWeight:600}}>Add community</div>
          <span className="inputLabel">Contract</span>
          <input name="chat_account" className="editProfile" value={addChat?.chat_account} onChange={handleAddCommunityInputChange} placeholder="Contract with msig"></input>
          <span className="inputLabel">Permission</span>
          <input name="permission" className="editProfile" value={addChat?.permission} onChange={handleAddCommunityInputChange} placeholder="Msig's permission (active/custom/...)"></input>
          <span className="inputLabel">Profile image url</span>
          <input name="community_profile_img_url" value={addChat?.community_profile_img_url} className="editProfile" onChange={handleAddCommunityInputChange} placeholder="Community image url"></input>
          <span className="inputLabel">Background image url</span>
          <input name="community_background_img_url" value={addChat?.community_background_img_url} className="editProfile" onChange={handleAddCommunityInputChange} placeholder="Community background image url"></input>
          <span className="inputLabel">Description</span>
          <input name="description" className="editProfile" value={addChat?.description} onChange={handleAddCommunityInputChange} placeholder="Community description"></input>
          <button className="viewCommunitiesButton" onClick={()=>addCommunity()}>Add community</button>
          </div>
      </Sheet>
      </Drawer>

      <Drawer
        size="md"
        variant="plain"
        open={userOpen}
        anchor="right"
        onClose={() => setUserModalOpen(false)}
        slotProps={{
          content: {
            sx: {
              bgcolor: 'transparent',
              p: { md: 3, sm: 0 },
              boxShadow: 'none',
            },
          },
        }}
      >
        <Sheet
          sx={{
            borderRadius: 'md',
            height: '100%',
            overflow: 'auto',
            width:"100%"
          }}
        >
          <div className="profileContents">
          {accountName ?
          <>
          {profiles ?
              <img 
                className="communityCardImage" 
                style={{
                  backgroundImage: `url(${profiles[accountName]?.profile_img_url ? profiles[accountName]?.profile_img_url : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"})` 
                }}
              />
          :
          <></>
          }
          <div style={{fontWeight:600}}>{accountName}</div>
          <button className="loginoutbutton" onClick={logoutUser}>Logout</button>
          </>
          :        
          <button className="loginoutbutton" onClick={showModal}>Login</button>
          }
          <br/>
          {profiles ?
          <div className="editProfileArea">
                <span className="inputLabel">Nickname</span>
                <input 
                  className="editProfile" 
                  name="name_in_chat"
                  defaultValue={profiles[accountName]?.name_in_chat} 
                  placeholder="Nickname" 
                  onChange={handleProfileInputChange}
                />
                <span className="inputLabel">Description</span>
                <input 
                  className="editProfile" 
                  name="description"
                  defaultValue={profiles[accountName]?.description} 
                  placeholder="Description" 
                  onChange={handleProfileInputChange}
                />
                <span className="inputLabel">Profile picture url</span>
                <input 
                  className="editProfile" 
                  name="profile_img_url"
                  defaultValue={profiles[accountName]?.profile_img_url} 
                  placeholder="Profile picture URL" 
                  onChange={handleProfileInputChange}
                />
          <button className="viewCommunitiesButton" onClick={()=>editProfile()}>Edit profile</button>
          <button className="viewCommunitiesButton" style={{backgroundColor:"red"}} onClick={()=>deleteProfile()}>Delete profile</button>

          </div>
          :<></>}
          </div>
      </Sheet>
      </Drawer>

      <Drawer
        size="md"
        variant="plain"
        open={profileOpen}
        anchor="right"
        onClose={() => setProfileOpen(false)}
        slotProps={{
          content: {
            sx: {
              bgcolor: 'transparent',
              p: { md: 3, sm: 0 },
              boxShadow: 'none',
            },
          },
        }}
      >
        <Sheet
          sx={{
            borderRadius: 'md',
            height: '100%',
            overflow: 'auto',
            width:"100%"
          }}
        >
        <Scrollbars style={{ width: "100%", height: "100%" }}>

        <div className="profileContents">
          <>
          {profiles ?
              <img 
                className="communityCardImage" 
                style={{
                  backgroundImage: `url(${profiles[currentProfile]?.profile_img_url ? profiles[currentProfile]?.profile_img_url : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"})` 
                }}
              />
          :
          <></>
          }
          </>
          <>
          {profiles && currentProfile && profiles[currentProfile] ?
          <>
          <div style={{fontWeight:600}}>{profiles[currentProfile]?.name_in_chat} ({currentProfile})</div>
          <div style={{fontSize:"13px"}}>{profiles[currentProfile]?.description}</div>
          </>
          :
          <>
          <div style={{fontWeight:600}}>{currentProfile}</div>
          <div style={{fontSize:"13px"}}>No msigApp profile.</div>
          </>
          }
          </>
          <>
          {awProfiles[currentProfile] ?
          <>
          <div className="awProfileContents">
            <div><b>AW Profile</b></div>
            <img 
                className="communityCardImage" 
                style={{
                  backgroundImage: `url(${awProfiles[currentProfile]?.profile?.image})` 
                }}
              />
            <div><b>{awProfiles[currentProfile]?.profile?.givenName}</b></div>
            <div className="awDescription">{awProfiles[currentProfile]?.profile?.description}</div>
            </div>
          </>
          :
          <></>
          }
          </>
        
          </div>
        </Scrollbars>
      </Sheet>
      </Drawer>

      <Drawer
        size="md"
        variant="plain"
        open={communitySettingsOpen}
        anchor="right"
        onClose={() => setCommunitySettingsOpen(false)}
        slotProps={{
          content: {
            sx: {
              bgcolor: 'transparent',
              p: { md: 3, sm: 0 },
              boxShadow: 'none',
            },
          },
        }}
      >
        <Sheet
          sx={{
            borderRadius: 'md',
            height: '100%',
            overflow: 'auto',
            width:"100%"
          }}
        >
          <div className="profileContents">
          <div style={{fontWeight:600}}>Community settings</div>
          <span className="inputLabel">Permission (active/custom/...)</span>
          <input name="permission" className="editProfile" onChange={handleCommunityInputChange} placeholder="Permission (active/custom/...)" defaultValue={currentCommunity?.permission}></input>
          <span className="inputLabel">Community image url</span>
          <input name="community_profile_img_url" className="editProfile" onChange={handleCommunityInputChange} placeholder="Community image url" defaultValue={currentCommunity?.community_profile_img_url}></input>
          <span className="inputLabel">Community background image url</span>
          <input name="community_background_img_url" className="editProfile" onChange={handleCommunityInputChange} placeholder="Community background image url" defaultValue={currentCommunity?.community_background_img_url}></input>
          <span className="inputLabel">Community description</span>
          <input name="description" className="editProfile" onChange={handleCommunityInputChange} placeholder="Community description" defaultValue={currentCommunity?.description}></input>
          <button className="viewCommunitiesButton" onClick={()=>editCommunity()}>Edit community</button>
          <hr></hr>
          {delApproval ? <div>Currently CAN delete messages.</div> : <div>Currently CANNOT delete messages.</div>}
          <span className="inputLabel">Amount of messages to delete</span>
          <input className="editProfile" value={delMessagesAmount} onChange={(e)=>setDelMessagesAmount(e.target.value)} disabled={!delApproval} placeholder="Amount of messages to delete"></input>
          <button className="viewCommunitiesButton" disabled={!delApproval} onClick={()=>deleteMessages()}>Delete messages</button>
          <button className="viewCommunitiesButton" style={{backgroundColor:"red"}} onClick={()=>deleteCommunity()}>Delete community</button>
          </div>

      </Sheet>
      </Drawer>
      {currentCommunity ?
      <>

      
      
      <div className="communityCard">
      {currentCommunity ? (
        <>
          <div className="communityCardCommunities">
          <div className="communityCardHeader">
          <img style={{backgroundImage: `url(${currentCommunity?.community_profile_img_url})`}} className="communityCardProfilePicture"></img>
          <div>{currentCommunity?.chat_account}</div>
          <div className="communityCardDescription">{currentCommunity?.description}</div>

          </div>
          <Scrollbars style={{ width: "100%", height: "100%" }}>

          {msiggers?.map((value, index)=>{
            return(
            <div className="communityCardCommunity" onClick={()=>openUserProfile(value)}>
              <img 
                className="communityCardImage" 
                style={{
                  backgroundImage: `url(${profiles[value]?.profile_img_url ? profiles[value]?.profile_img_url : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"})` 
                }}
              />              
              <div>{value}</div>
            </div>)
          })}
          </Scrollbars>
          </div>
        </>
      ) : (
        <div className="noCommunityExplainer">
          <div>You should choose a community to chat.</div>
          <div className="viewCommunitiesButton" onClick={()=>setModalOpen(true)}>View communities</div>
          <div className="viewCommunitiesButton" onClick={()=>setAddChatModalOpen(true)}>Add community</div>
        </div>
      )}
      </div>
      <div className="mainCard">
      {currentCommunity ?
      <div className="mainCardHeader">
      <img style={{backgroundImage: `url(${currentCommunity?.community_profile_img_url})`}} className="messageProfilePicture"></img>
      {currentCommunity?.chat_account}
      </div>
      : <></>
      }
      <div className="Messages">
        {/**<Scrollbars ref={scrollbarsRef} autoHeight autoHeightMax={"100%"}> */}
      <Scrollbars ref={scrollbarsRef} autoHeight autoHeightMax={"100%"}>
      <div className="messagesWrapper">
      {messages?.rows?.map((value, index) => (
      <>
      {value.user == accountName ?
      <Popover
          id={index}
          open={openPopoverIndex === index}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <div onClick={()=>deleteMessage(value.id, handleClose)} className="popoverButton">Delete message</div>
        </Popover>
        :<></>}
        <div
          className="messageWrapper"
        >
            <img
              style={{ backgroundImage: `url(${profiles[value.user]?.profile_img_url ? profiles[value.user]?.profile_img_url : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"})` }}
              className="messageProfilePicture"
              onClick={() => openUserProfile(value.user)} />

            <div className="messageCard"
              key={value?.id}
              aria-describedby={index}
              onClick={(e) => handleClick(index, e)}
            >
              <div className="messageSender">{profiles[value?.user]?.name_in_chat ? profiles[value?.user]?.name_in_chat : value?.user} <span className="messageTime">{value?.message_time ? formatDateToLocal(value.message_time) : ''}</span></div>
              <Linkify 
                  componentDecorator={(decoratedHref, decoratedText, key) => (
                      <a target="blank" href={decoratedHref} key={key}>
                          {decoratedText}
                      </a>
                  )}
              >
                  {value.message}
              </Linkify>
            </div>
          </div></>
      ))}
      </div>
    </Scrollbars>

        <div className="sendMessage">
        {connected ?
        <><input
                    className="sendMessageInput"
                    placeholder="Write a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); // Prevents the addition of a new line in the input when pressing Enter
                        submitMessage();
                      }
                    } } /><span className="characterCounter">{message.length}/500</span><img
                      onClick={() => submitMessage()}
                      src="assets/sendMessage.svg"
                      className="submitMessageButton"
                      alt="Send Message" /></>
            :
            currentCommunity ?
            <button className="connectButton" style={{background: ws && ws.readyState !== WebSocket.OPEN ? "#BBBCB6" : ""}}disabled={ws && ws.readyState !== WebSocket.OPEN} onClick={()=>signDummyTransaction()}>{ws && ws.readyState === WebSocket.OPEN ? "Connect to chat" : "Connecting to server..."}</button>
            : <></>
            }
          
        </div>

      </div>
      </div>


      <div className="sideMenu">
      <img className="sideMenuIcon" src="assets/account.svg" onClick={() => setUserModalOpen(true)}></img>
      <img className="sideMenuIcon" src="assets/community.svg" onClick={() => setModalOpen(true)}></img>
      <img className="sideMenuIcon" src="assets/settings.svg" onClick={()=>currentCommunity ? openCommunitySettings() : sweetAlert("You're not in a community. That's a bit sad.")}></img>

      </div>
    </>
    :
    <>
        <div className="noCommunityExplainer">
          <div  style={{color:"white"}}>Hop in a chat with your community.</div>
          <div className="viewCommunitiesButtonOutlined" onClick={()=>setModalOpen(true)}>View communities</div>
          <div className="viewCommunitiesButtonOutlined" onClick={()=>setAddChatModalOpen(true)}>Add community</div>
          <div onClick={()=> logoutUser()} style={{marginTop:"-5px", fontSize:"13px", cursor:"pointer"}}><span style={{fontWeight:"500"}}>Log out</span> from {accountName}</div>
        </div>
    </>}
    </div>
    :
    <div className="App" style={{flexDirection:"column"}}>
    <div className="loginTitle">msigChat</div>
    <div className="loginButton" onClick={showModal}>Login</div>
    </div>
    }
    </>
  );
}

export default withUAL(App);
