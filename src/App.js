import React, { useRef, useState, useEffect } from 'react';
import { withUAL } from "ual-reactjs-renderer";
import './App.css'
import Sheet from '@mui/joy/Sheet';
import Drawer from '@mui/joy/Drawer';
import { Scrollbars } from 'react-custom-scrollbars-2';
import Swal from 'sweetalert2'
import Popover from '@mui/material/Popover';
import Linkify from 'react-linkify';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import { deserializeTransaction } from './deserializer';
import Tooltip from '@mui/joy/Tooltip';
import fetchPermissions from './FetchPermissions';
import Modal from '@mui/joy/Modal';
import ModalClose from '@mui/joy/ModalClose';
import MenuItem from '@mui/joy/MenuItem';


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
window.Buffer = require('buffer/').Buffer;

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0_Y6czXNM6N3cAPYiWMGSqJX779-VP0g",
  authDomain: "eoschatapp.firebaseapp.com",
  projectId: "eoschatapp",
  storageBucket: "eoschatapp.appspot.com",
  messagingSenderId: "528614198164",
  appId: "1:528614198164:web:023f8263ad3cea9ea39d81"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);


function App(props) {
  const {
    ual: { activeUser, showModal, logout },
    endpoint
  } = props;

  const [open, setModalOpen] = useState(false);
  const [userOpen, setUserModalOpen] = useState(false);
  const [addChatOpen, setAddChatModalOpen] = useState(false);
  const [createChatOpen, setCreateChatModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pinnedMessagesOpen, setPinnedMessagesOpen] = useState(false);
  const [refetchproposals, setRefetchproposals] = useState(0)
  const [refetchchatdata, setRefetchchatdata] = useState(0)


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

  const [createCommAccountNames, setCreateCommAccountNames] = useState(['', '']);
  const [createComm, setCreateComm] = useState({});

  const handleCreateCommInputChange = (index, event) => {
    const newAccountNames = [...createCommAccountNames];
    newAccountNames[index] = event.target.value;
    setCreateCommAccountNames(newAccountNames);
  };

  const handleCreateCommChange = (e) => {
    const { name, value } = e.target; // Destructure name and value from the event target
    setCreateComm(prevState => ({
      ...prevState, // Spread the previous state to retain existing property values
      [name]: value // Update the property corresponding to the input name with its new value
    }));
  };

  const handleCreateCommAddInput = () => {
    setCreateCommAccountNames([...createCommAccountNames, '']);
  };

  const [replyTo, setReplyTo] = useState()
  const replyToMessage = (message, handleClose) =>{
    handleClose()
    setReplyTo(message)
  }

  const createCommunity = async() => {

    function generateAccountsOwner(accountsToInclude) {
      return accountsToInclude
        .filter(name => name.trim().length > 0)
        .map(accountName => ({
          permission: {
            actor: accountName.trim(),
            permission: 'active'
          },
          weight: 1
        }));
    }

    const accountsowner = generateAccountsOwner(createCommAccountNames);

    fetch("http://localhost:3000/create-msig", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountNames: createCommAccountNames,
        communityData: createComm,
        accountsowner: accountsowner
      })
    }).then((response) =>
    response.json().then((res) => {
      if(res.success){
        sweetAlert("Community created!")
        setRefetch(prevRefetch => prevRefetch + 1);
        setAddChatModalOpen(false)
      }
      else{
        sweetAlert("There was a problem creating the community.")
      }
    })
    )
  }

  const requestPermission = async () => {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        console.log("Notification permission granted.");
        // Get registration token
        getToken(messaging, { vapidKey: "BNZHt91ZqEkWc-XR2XysZ9lAqXOY-GRhab3k3f0lBu2od0TfmXKMaGRkIvLav--i4k3lR2cxi71s1JsLndVfXSQ"}).then((currentToken) => {
          if (currentToken) {
            console.log("Token:", currentToken);
                // Subscribe to the topic
            console.log(currentCommunity.chat_account)
            fetch("http://localhost:3000/notification", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                token: currentToken,
                account: accountName,
                community: currentCommunity.chat_account
              })
            }).then((response) =>
            response.json().then((res) => {
              console.log(res)
              if(res.success){
                sweetAlert("Subscribed to notifications!")
              }
            })
            )
            // Send the token to your server and update the UI if necessary
            // For example, save the token to localStorage
          } else {
            console.log("No registration token available. Request permission to generate one.");
          }
        }).catch((err) => {
          console.log("An error occurred while retrieving token. ", err);
        });
      } else {
        console.log("Unable to get permission to notify.");
      }
    });
  };

  const filterCommunities = async () => {
    sweetAlert("Filtering communities. This may take a minute.")
    // This will store the final list of communities the user has permissions in
    let userCommunities = [];
  
    // Fetch permissions for each community and check for user's accountName
    const checks = communities.map(async (community) => {
      const fetchedAccounts = await fetchPermissions(community.chat_account, community.permission, endpoint);
      // Check if the user's accountName is in the fetchedAccounts
      if (fetchedAccounts.includes(accountName)) {
        // If yes, add this community to the userCommunities array
        userCommunities.push(community);
      }
    });
  
    // Wait for all fetches and checks to complete
    await Promise.all(checks);
  
    // userCommunities now contains only the communities the user is part of
    console.log("User is in communities:", userCommunities);
    localStorage.setItem("myCommunitiesList", JSON.stringify(userCommunities))
    const myCommunitiesList = userCommunities

    // Create a lookup set for quick access
    const myCommunitiesSet = new Set(myCommunitiesList.map(community => community.chat_account));

    // Assuming res?.rows is your list of communities
    const communitiesdata = communities;

    if (communitiesdata) {
      // Add isMyCommunity property
      const updatedCommunities = communitiesdata.map((community) => ({
        ...community,
        isMyCommunity: myCommunitiesSet.has(community.chat_account),
      }));

      // Reorder so user communities come first
      const reorderedCommunities = updatedCommunities.sort((a, b) => b.isMyCommunity - a.isMyCommunity);

      // Update your state or UI with the reordered communities
      setCommunities(reorderedCommunities);
    }
    sweetAlert("My Communities fetched.")
    
    return userCommunities;
  };

  const [proposalStatusList, setProposalStatusList] = useState([])
  const [proposalStatusModalOpen, setProposalStatusModalOpen] = useState(false)

  const proposalStatus = async (proposal) => {
  console.log(proposal)
   const data = await fetch(`https://wax.eosusa.io/v1/chain/get_table_rows`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: true,
        code: "eosio.msig",
        table: "approvals2",
        scope: "test.chat",
        lower_bound: proposal.proposal_name,
        upper_bound: proposal.proposal_name,
        limit: 1,
      }),
    })
    const result = await data.json();
    const proposalmatch = result?.rows[0]
  
    console.log(proposalmatch)
    setProposalStatusList(proposalmatch)
    setProposalStatusModalOpen(true)
  }
  
  



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
  const [proposalView, setProposalView] = useState("proposals")
  const [communitySettingsOpen, setCommunitySettingsOpen] = useState(false)
  const [proposalsOpen, setProposalsOpen] = useState(false)
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

  const reactToMessage = async (message_id, reaction, handleClose) => {
    sweetAlert("Reacting to message.")
    handleClose()
    ws.send(JSON.stringify(
      { 
        type: 'REACT_MESSAGE', 
        payload: {
          user: accountName,
          community: currentCommunity?.chat_account,
          message_id: message_id,
          reaction: reaction
        } 
      }
    ));
  }

  const removeReaction = async (message_id, reaction, handleClose) => {
    sweetAlert("Removing reaction.")
    handleClose()
    ws.send(JSON.stringify(
      { 
        type: 'REMOVE_REACTION', 
        payload: {
          user: accountName,
          community: currentCommunity?.chat_account,
          message_id: message_id,
          reaction: reaction
        } 
      }
    ));
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
            account: "test.chat",
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

  const approveProposal = async (proposal) => {
    console.log(proposal)
    try {
      const transaction = {
        actions: [
          {
            account: "eosio.msig",
            name: "approve",
            authorization: [
              {
                actor: accountName, // use account that was logged in
                permission: "active",
              },
            ],
            data: {
              proposer: "test.chat",
              proposal_name: proposal?.proposal_name,
              level:{actor:accountName, permission:"active"}
            },
          },
        ],
      };
      await activeUser.signTransaction(transaction, {
        expireSeconds: 300,
        blocksBehind: 3,
        broadcast: true,
      });
      sweetAlert("Proposal approved!")
      } catch (error) {
      sweetAlert(error.message)
      console.error("Signing error", error.message);
    }
  }

  const executeProposal = async (proposal) => {
    console.log(proposal)
    try {
      const transaction = {
        actions: [
          {
            account: "eosio.msig",
            name: "exec",
            authorization: [
              {
                actor: accountName, // use account that was logged in
                permission: "active",
              },
            ],
            data: {
              proposer: "test.chat",
              proposal_name: proposal?.proposal_name,
              executer: accountName
            },
          },
        ],
      };
      await activeUser.signTransaction(transaction, {
        expireSeconds: 300,
        blocksBehind: 3,
        broadcast: true,
      });
      sweetAlert("Proposal executed!")
      } catch (error) {
      sweetAlert(error.message)
    }
  }

  const [proposals, setProposals] = useState()

  useEffect(() => {
    if(currentCommunity && ws){
    console.log("Fetching proposals")
    const fetchTransactionData = async (packedTransaction) => {
      const deserializedTransaction = await deserializeTransaction(packedTransaction);
      return deserializedTransaction;
    };
    const fetchProposals = async () => {
      try {
        const response = await fetch(`https://wax.eosusa.io/v1/chain/get_table_rows`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            json: true,
            code: "test.chat",
            table: "locproposal",
            scope: currentCommunity?.chat_account,
            limit: 1000,
          }),
        });
        const result = await response.json();
        const enhanceRowsWithTransactionData = async (rows) => {
          return await Promise.all(rows.map(async (row) => {
            try {
              const deserializedTransaction = await fetchTransactionData(row.packed_transaction);
              // Assuming fetchTransactionData returns the deserialized data directly
              console.log(deserializedTransaction);
              return { ...row, deserializedTransaction };
            } catch (error) {
              console.error("Error fetching transaction data for row:", row, error);
              // Decide how to handle errors: omit the row, include it without deserialized data, etc.
              // Here, including the row without deserialized data:
              return row;
            }
          }));
        };
        try {
          console.log("PROPOSALS LIST!");
          console.log(result);
        
          const rowsWithTransactionData = await enhanceRowsWithTransactionData(result.rows);
          console.log(rowsWithTransactionData);
        
          setProposals(rowsWithTransactionData); // Update your state with the enhanced rows
        } catch (error) {
          console.error("Error fetching proposals list:", error);
        }
      } catch (error) {
        console.error('Error fetching users and transaction data:', error);
      }
    };
    

    fetchProposals();
    }
  }, [currentCommunity, refetchproposals])


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
        let actorlist =await fetchPermissions(currentCommunity.chat_account, currentCommunity.permission, endpoint);
        console.log(actors)
        console.log(actorlist)
        setMsiggers(actorlist);

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

  const CommunityProfilePicture = ({ currentCommunity }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = currentCommunity?.community_profile_img_url;
    const firstLetter = currentCommunity?.community_name?.charAt(0).toUpperCase();
  
    return (
      <div className="messageProfilePicture" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={currentCommunity?.community_name}
            onError={() => setImageError(true)}
            style={{ width: '50px', height: '50px', borderRadius: '50%' }}
          />
        ) : (
          <div className="messageProfilePicture" style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '24px',
            color: '#333',
          }}>
            {firstLetter}
          </div>
        )}
      </div>
    );
  };
  

  useEffect(() => {
        // When profiles are fetched, update userProfile state
        if (accountName && profiles && localStorage.getItem("hideProfileAlert") !== "true"){
            if(profiles[accountName]?.name_in_chat || profiles[accountName]?.description || profiles[accountName]?.profile_img_url){
            console.log("User has profile.")
          }
          else{
            const sweetAlertButton = (message) => {
              const Toast = Swal.mixin({
                toast: true,
                position: "bottom-end",
                timer: 10000,
                showDenyButton: true,
                confirmButtonText: "Create profile",
                denyButtonText: `Don't show again`,
                denyButtonColor: 'gray',
                confirmButtonColor: '#2155BF',
                timerProgressBar: true,
                onOpen: (toast) => {
                  toast.addEventListener("mouseenter", Swal.stopTimer);
                  toast.addEventListener("mouseleave", Swal.resumeTimer);
                },
                customClass: {
                  actions: 'horizontal-buttons',
                  cancelButton: 'top-margin'
                }
                
              })
              Toast.fire({
                title: message,
              }).then((result) => {
                /* Read more about isConfirmed, isDenied below */
                if (result.isConfirmed) {
                  setUserModalOpen(true)
                } else if (result.isDenied) {
                  localStorage.setItem("hideProfileAlert", "true")
                }
              });
            }
            sweetAlertButton("You don't have a profile yet. Would you like to create it?")
          }
        }
  }, [profiles, accountName])

  useEffect(() => {
    // When profiles are fetched, update userProfile state
    if (profiles) {
      setUserProfile(profiles[accountName]);
    }
    if (currentCommunity) {
      setEditCommunityData(currentCommunity);
    }
  }, [currentCommunity, refetch, accountName]);


  const [pinnedMessages, setPinnedMessages] = useState([])

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
    console.log("Received data: " + data.type);
  
    if (data.type === "memo") {
      setMemo(data.memo);
    } else if (data.verified === true) {
      setVerified(true);
    } else if (data.type === "FAILED_TO_VERIFY") {
      sweetAlert(data?.message);
    } else if (data.type === "PINNED_MESSAGES") {
      console.log("PINNED MESSAGES")
      if (data?.rows?.rows) {
        const sortedRows = [...data.rows.rows].sort((a, b) => {
          return new Date(b.pin_time) - new Date(a.pin_time);
        });
        setPinnedMessages([...sortedRows]);
      }
    }
    else if(data.type === "COMMUNITY_EDITED"){
      sweetAlert("Community edited! Refresh to see all changes.")
      setTimeout(()=>{
        setRefetchchatdata(prevRefetch => prevRefetch + 1);
      }, 2000)

    }
    else {  
      if (Array.isArray(data.rows.rows)) {
        if (data.firstBatch || data.deleteResponse) {
          setMessages(data.rows); // Set the 'rows' object directly
          messagesvariable = data.rows || []
        } else {
          const existingRows = messagesvariable.rows || [];
  
          const newUniqueRows = data.rows.rows.filter(newRow => 
            !existingRows.some(existingRow => existingRow.id.toString() === newRow.id.toString())
            );  
          if (newUniqueRows.length > 0) {
            setMessages(previousMessages => {
              const updatedMessages = {
                  ...previousMessages,
                  rows: [...previousMessages?.rows, ...newUniqueRows]
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


  const emojimap = {
    1: "❤️",
    2: "😂",
    3: "👍",
    4: "👎"
  }
  

  

  useEffect(()=>{
    fetch(`${endpoint}/v1/chain/get_table_rows`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: true,
        code: "test.chat",
        table: "chats1",
        scope: "test.chat",
        limit:1000
      }),
    })
      .then((response) =>
        response.json().then((res) => {
          // Parse the stored list of user communities from localStorage
          const myCommunitiesList = JSON.parse(localStorage.getItem("myCommunitiesList") || "[]");

          // Create a lookup set for quick access
          const myCommunitiesSet = new Set(myCommunitiesList.map(community => community.chat_account));

          // Assuming res?.rows is your list of communities
          const communities = res?.rows;

          if (communities) {
            // Add isMyCommunity property
            const updatedCommunities = communities.map((community) => ({
              ...community,
              isMyCommunity: myCommunitiesSet.has(community.chat_account),
            }));

            // Reorder so user communities come first
            const reorderedCommunities = updatedCommunities.sort((a, b) => b.isMyCommunity - a.isMyCommunity);

            // Update your state or UI with the reordered communities
            setCommunities(reorderedCommunities);
          }
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
        code: "test.chat",
        table: "chats1",
        scope: "test.chat",
        limit:1000
      }),
    })
      .then((response) =>
        response.json().then((res) => {
          // Parse the stored list of user communities from localStorage
          const myCommunitiesList = JSON.parse(localStorage.getItem("myCommunitiesList") || "[]");

          // Create a lookup set for quick access
          const myCommunitiesSet = new Set(myCommunitiesList.map(community => community.chat_account));

          // Assuming res?.rows is your list of communities
          const communities = res?.rows;

          if (communities) {
            // Add isMyCommunity property
            const updatedCommunities = communities.map((community) => ({
              ...community,
              isMyCommunity: myCommunitiesSet.has(community.chat_account),
            }));

            // Reorder so user communities come first
            const reorderedCommunities = updatedCommunities.sort((a, b) => b.isMyCommunity - a.isMyCommunity);

            // Update your state or UI with the reordered communities
            setCommunities(reorderedCommunities);
          }
          const params = new URLSearchParams(window.location.search);
          const communityparam = params.get('community');
          
          if (communityparam) {
            res?.rows?.filter((value, index)=>{
              if(value.chat_account == communityparam){
                setEditCommunityData(value)
              }
            })
          }
        })
      )
      .catch((e) => console.log(e));
  },[refetchchatdata])

  useEffect(()=>{
    fetch(`${endpoint}/v1/chain/get_table_rows`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: true,
        code: "test.chat",
        table: "profile",
        scope: "test.chat",
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
    console.log(userProfile)
    if (activeUser) {
      try {
        const action = {
          actions: [{
            account: "test.chat",
            name: 'setprofile',
            authorization: [{
              actor: accountName,
              permission: 'active',
            }],
            data: {
              user: accountName,
              name_in_chat: userProfile?.name_in_chat,
              description: userProfile?.description,
              profile_img_url: userProfile?.profile_img_url
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
            account: "test.chat",
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

  const [proposalType, setProposalType] = useState()

  const handleProposalTypeChange = (event, newValue) => {
    console.log(newValue)
    setProposalType(newValue);
  }


  const addCommunity = async () => {
    if (activeUser) {
      try {
        const action = {
          actions: [{
            account: "test.chat",
            name: 'setchat',
            authorization: [{
              actor: accountName,
              permission: 'active',
            }],
            data: {
              community_name: addChat["community_name"],
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

  const unPinMessage = async (pinnedmessage) => {
    sweetAlert("Unpinning message.")
    ws.send(JSON.stringify(
      { 
        type: 'UNPIN_MESSAGE', 
        payload: {
          user: accountName,
          community: currentCommunity?.chat_account,
          message_id: pinnedmessage?.message_id
        } 
      }
    ));
  }

  const pinMessage = async (message) => {
    handleClose()
    sweetAlert("Pinning message.")
    ws.send(JSON.stringify(
      { 
        type: 'PIN_MESSAGE', 
        payload: {
          user: accountName,
          community: currentCommunity?.chat_account,
          message_id: message?.id
        } 
      }
    ));
    setTimeout(()=>{
      const payload = JSON.stringify({
        type: 'GET_PINNED_MESSAGES', 
        payload: {
            community: currentCommunity.chat_account
        }
      });
      ws.send(payload);
    },2000)
  }

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
    if (activeUser) {
      try {
        const action = {
          actions: [{
            account: "test.chat",
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
        code: "test.chat",
        table: "delapproval",
        scope: "test.chat",
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
          type: 'DELETE_COMMUNITY', 
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

    const [proposalData, setProposalData] = useState({
      addAccounts: {
        active: [{ accountToAdd: '', permissionName: '', weight: null}],
        owner: [{ accountToAdd: '', permissionName: '', weight: null}],
        chat: [{ accountToAdd: '', permissionName: '' }],
      },
      removeAccounts: {
        active: [{ accountToRemove: '', permissionName: '' }],
        owner: [{ accountToRemove: '', permissionName: '' }],
        chat: [{ accountToRemove: '', permissionName: '' }],
      },
      // Include other necessary fields
    });
    

  //for adding accounts proposal, where theres many
  const handleAccountChange = (action, type, index, e) => {
    const { name, value } = e.target;
    const newValue = name === "weight" ? parseInt(value, 10) || 0 : value; // Parse weight as integer, defaulting to 0 if NaN
    const newAccounts = [...proposalData[action][type]];
    newAccounts[index][name] = newValue;
    setProposalData(prevState => ({
      ...prevState,
      [action]: {
        ...prevState[action],
        [type]: newAccounts,
      },
    }));
  };


  const addAccountField = (action, type) => {
    // Determine the structure of the new account based on the action
    const newAccount = action === 'addAccounts'
      ? { accountToAdd: '', permissionName: '' }
      : { accountToRemove: '', permissionName: '' };
    
    const updatedAccounts = [...proposalData[action][type], newAccount];
    setProposalData(prevState => ({
      ...prevState,
      [action]: {
        ...prevState[action],
        [type]: updatedAccounts,
      },
    }));
  };
  

  const handleProposalDataChange = (e) => {
    const { name, value } = e.target;
  
    // Assuming delonBoolean should be stored as a boolean in your state
    let parsedValue = value;

    // Convert numeric values for other fields, if necessary
    const isNumeric = e.target.type === 'number';
    parsedValue = isNumeric ? parseInt(value, 10) : value;
    
    setProposalData({
      ...proposalData,
      [name]: parsedValue
    });
  };

  const handleProposalBoolChange = (event, newValue, name) => {
    setProposalData({
      ...proposalData,
      [name]: Number(newValue)
    });  }
  

  const createProposal = async (proposalType) => {
    setProposalsOpen(false)
    sweetAlert("Submitting proposal creation.")
    await fetch("http://localhost:3000/create-proposal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proposalType: proposalType,
        proposalData: proposalData,
        community: currentCommunity.chat_account
      })
    }).then((response) =>
    response.json().then((res) => {
      if(res.success){
        sweetAlert("Proposal created!")
        setTimeout(()=>{
          setRefetchproposals(prevRefetchproposals => prevRefetchproposals + 1)
        },2000)
      }
      else{
        sweetAlert("There was a problem creating the proposal.")
      }
    })
    )
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
      sweetAlert("Submitting message.")
      setReplyTo("")
      // Send transaction to verify via WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({
          type: 'SEND_MESSAGE', 
          payload: {
              message: message,
              accountName: accountName,
              community: currentCommunity.chat_account,
              replyTo: replyTo ? replyTo?.message : ""
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
          <button className="viewCommunitiesButton" onClick={()=>filterCommunities()}>{localStorage?.getItem("myCommunitiesList") ? "Refetch communities I'm in" : "Fetch communities I'm in"}</button>
          <Scrollbars style={{ width: "100%", height: "100%" }}>
          {communities?.map((value, index)=>{
            return(
            <div className="communityCardCommunity" onClick={()=>changeCommunity(value)}>
              <CommunityProfilePicture currentCommunity={value} />
              <div>{value.community_name} {value?.isMyCommunity ? <div style={{fontSize:"12px"}}>My community</div> : ""}</div>
            </div>)
          })}
          </Scrollbars>
      </Sheet>
      </Drawer>

      <Drawer
        size="md"
        variant="plain"
        open={pinnedMessagesOpen}
        anchor="right"
        onClose={() => setPinnedMessagesOpen(false)}
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
            <div><b>Pinned messages</b></div>
            <div className="pinnedMessageDrawerWrapper">
              {
                pinnedMessages?.map((value, index)=>{
                  return(
                  <div className="pinnedMessageDrawer" id={value?.message_id }>
                    <div><b>{value?.user_who_created_message}</b> <span style={{fontSize:"13px"}}>{formatDateToLocal(value?.message_time)}</span></div>
                    <div>{value?.pinned_message}</div>
                    <div className="pinnedBy">Pinned by {value?.user_who_pinned}</div>
                    <div className="unPinMessage" onClick={()=>unPinMessage(value)}>UNPIN</div>
                  </div>
                  )
                }
                )
              }
            </div>
          </Scrollbars>
      </Sheet>
      </Drawer>

      <Drawer
        size="md"
        variant="plain"
        open={createChatOpen}
        anchor="right"
        onClose={() => setCreateChatModalOpen(false)}
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
          <div style={{fontWeight:600}}>Create new community</div>
          <span className="inputLabel">Community name</span>
          <input className="editProfile"  name="communityName" value={createComm.communityName} onChange={handleCreateCommChange} />

          <span className="inputLabel">Community description</span>
          <input className="editProfile" name="communityDescription" value={createComm.communityDescription} onChange={handleCreateCommChange} />

          <span className="inputLabel">Profile picture url</span>
          <input placeholder="https://images.com/image.png" className="editProfile" name="profilePictureUrl" value={createComm.profilePictureUrl} onChange={handleCreateCommChange} />

          <span className="inputLabel">Background image url</span>
          <input placeholder="https://images.com/image.png" className="editProfile" name="backgroundImageUrl" value={createComm.backgroundImageUrl} onChange={handleCreateCommChange} />
          <span className="inputLabel">Accounts in the new multisig</span>
          {createCommAccountNames.map((name, index) => (
              <input
                key={index}
                type="text"
                className="editProfile"
                value={name}
                onChange={(e) => handleCreateCommInputChange(index, e)}
                placeholder="Enter account name"
              />
            ))}
          <button className="addAccountToNewMsig" onClick={handleCreateCommAddInput}>Add Account Name</button>
          <button className="viewCommunitiesButton" onClick={()=>createCommunity()}>Create community</button>
          </div>
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
          <span className="inputLabel">Community name</span>
          <input name="community_name" className="editProfile" value={addChat?.community_name} onChange={handleAddCommunityInputChange} placeholder="Community name"></input>
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

      
      <Modal
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        open={proposalStatusModalOpen}
        onClose={() => setProposalStatusModalOpen(false)}
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <Sheet
          variant="outlined"
          sx={{
            borderRadius: 'md',
            p: 3,
            boxShadow: 'lg',
          }}
        >
          <div className="proposalStatusWrapper">
          {proposalStatusList?.provided_approvals?.map((value, index)=>{
              return(<div className="proposalStatusRow">
                <div>{value?.level?.actor + "@" + value?.level?.permission}</div>
                <div className="pendingStatusApproved">Approved</div>
                </div>
              )
            })}
            {proposalStatusList?.requested_approvals?.map((value, index)=>{
              return(<div className="proposalStatusRow">
                <div>{value?.level?.actor + "@" + value?.level?.permission}</div>
                <div className="pendingStatus">Pending</div>
                </div>
              )
            })}
          </div>
        </Sheet>
      </Modal>

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
        open={proposalsOpen}
        anchor="right"
        onClose={() => setProposalsOpen(false)}
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
        <div className="proposalDrawerContents">
          <div className="proposalMenu">
            <button style={{opacity:proposalView == "proposals" ? 1 : 0.8}} className="proposalMenuButton" onClick={() => setProposalView("proposals")}>Proposals</button>
            <button style={{opacity:proposalView == "create" ? 1 : 0.8}} className="proposalMenuButton" onClick={() => setProposalView("create")}>Create new proposal</button>
          </div>
          {proposalView == "proposals" ?
          <Scrollbars style={{ width: "100%", height: "100%"}}>
          <div>
            {proposals?.length > 0 ?
            <>
            {proposals?.map((value, index)=>{
              return(
                <div className="proposalCard">
                  <div style={{fontSize:"16px"}}><b>{value?.title}</b></div>
                  <div className="actionNameTag"><b>Action: {value?.deserializedTransaction?.actions[0]?.name ? value?.deserializedTransaction?.actions[0]?.name : "Undefined action"}</b></div>
                  <div>{value?.description}</div>
                  <button className="seeStatus" onClick={()=>proposalStatus(value)}>See status</button>
                  <div className="proposalCardButtons">
                    <button className="viewCommunitiesButton" onClick={() => approveProposal(value)}>Approve</button>
                    <button className="viewCommunitiesButton" onClick={()=> executeProposal(value)}>Execute</button>
                  </div>
                </div>
              )
            })
            }
            </>
            :
            <div>No proposals yet.</div>
            }
          </div>
          </Scrollbars>
          : proposalView == "create" ?
          <div>
            <div style={{fontWeight:600}}>Create new proposal</div>
              <span className="inputLabel">Proposal type</span>
              <Select value={proposalType} sx={{marginBottom:"15px", border:"1px solid gray", borderRadius:"10px", backgroundColor:"white", fontSize:"14px", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;"}} onChange={handleProposalTypeChange}>
                <Option sx={{fontSize:"14px", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;"}} value="move_funds">Move funds</Option>
                <Option sx={{fontSize:"14px", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;"}} value="change_permission_active">Edit active permission</Option>                
                <Option sx={{fontSize:"14px", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;"}} value="change_permission_owner">Edit owner permission</Option>
                <Option sx={{fontSize:"14px", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;"}} value="add_accounts_to_chat">Add accounts to chat</Option>
                <Option sx={{fontSize:"14px", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;"}} value="del_on_off">Allow/disallow message deletion</Option>
              </Select>
              {proposalType == "move_funds" ?
                <div>
                <hr />
                <div className="inputLabel">Proposal title</div>
                <input style={{marginTop:"5px"}} name="title" onChange={handleProposalDataChange} className="editProfile" placeholder="Title of the proposal" />

                <div className="inputLabel">Proposal description</div>
                <input style={{marginTop:"5px"}} name="description" onChange={handleProposalDataChange} className="editProfile" placeholder="Description for the proposal" />

                <div className="inputLabel">Transfer to account</div>
                <input style={{marginTop:"5px"}} name="transferTo" onChange={handleProposalDataChange} className="editProfile" placeholder="Account name" />

                <div className="inputLabel">Fund amount</div>
                <input style={{marginTop:"5px"}} name="fundAmount" onChange={handleProposalDataChange} className="editProfile" placeholder="Fund amount" />

                <div className="inputLabel">Token contract</div>
                <input style={{marginTop:"5px"}} name="tokenContract" onChange={handleProposalDataChange} className="editProfile" placeholder="Token contract" />

                <button className="createProposalButton" onClick={() => createProposal("move_funds")}>Create proposal</button>
                </div>
                : proposalType === "change_permission_active" ?
                <div>
                  <hr />
                  <div className="inputLabel">Proposal title</div>
                  <input
                    style={{marginTop: "5px"}}
                    name="title"
                    onChange={handleProposalDataChange} // Ensure this function is defined to update proposal title/description
                    className="editProfile"
                    placeholder="Title of the proposal"
                  />

                  <div className="inputLabel">Proposal description</div>
                  <input
                    style={{marginTop: "5px"}}
                    name="description"
                    onChange={handleProposalDataChange} // Ensure this function is defined to update proposal description
                    className="editProfile"
                    placeholder="Description for the proposal"
                  />
                  <div className="inputLabel">Threshold</div>
                  <input
                    type="number"
                    style={{marginTop: "5px"}}
                    name="threshold"
                    value={proposalData.threshold || ''} // Ensure there's a default value to avoid controlled component error
                    onChange={handleProposalDataChange}
                    className="editProfile"
                    placeholder="Threshold value"
                    min="0" // Optional: Ensures only positive numbers are entered
                  />

                  <div className="inputLabel">Accounts to add to active</div>
                  {proposalData.addAccounts.active.map((account, index) => (
                    <div key={index} className="accountField">
                      <input
                        style={{marginTop: "5px"}}
                        name="accountToAdd"
                        value={account.accountToAdd}
                        onChange={(e) => handleAccountChange('addAccounts', 'active', index, e)}
                        className="editProfile"
                        placeholder="Account"
                        id = {"activeaddacc" + index}
                      />
                      <input
                        style={{marginTop: "5px"}}
                        name="permissionName"
                        value={account.permissionName}
                        onChange={(e) => handleAccountChange('addAccounts', 'active', index, e)}
                        className="editProfile"
                        placeholder="Permission"
                        id = {"activeaddperm" + index}
                      />                      
                      <input
                        type="number"
                        style={{marginTop: "5px"}}
                        name="weight"
                        value={account.weight}
                        onChange={(e) => handleAccountChange('addAccounts', 'active', index, e)}
                        className="editProfile weightInput"
                        placeholder="Weight"
                        min={0} // Set minimum value to 1 to avoid invalid weight
                        id = {"activeweight" + index}
                      />
                    </div>
                  ))}
                  <button onClick={() => addAccountField('addAccounts', 'active')} className="addAccountstoChatMore">Add more</button>

                  <hr />
                  <div className="inputLabel">Accounts to Remove from Active</div>
                  {proposalData.removeAccounts.active.map((account, index) => (
                    <div key={index} className="accountField">
                      <input
                        style={{marginTop: "5px"}}
                        name="accountToRemove"
                        value={account.accountToRemove} // Ensure correct referencing for removal
                        onChange={(e) => handleAccountChange('removeAccounts', 'active', index, e)}
                        className="editProfile"
                        placeholder="Account"
                        id = {"activeremoveacc" + index}
                      />
                      <input
                        style={{marginTop: "5px"}}
                        name="permissionName"
                        value={account.permissionName} // Check if necessary and adjust accordingly
                        onChange={(e) => handleAccountChange('removeAccounts', 'active', index, e)}
                        className="editProfile"
                        placeholder="Permission"
                        id = {"activeremoveperm" + index}
                      />
                    </div>
                  ))}
                  <button onClick={() => addAccountField('removeAccounts', 'active')} className="addAccountstoChatMore">Add more</button>

                  <button className="createProposalButton" onClick={() => createProposal("change_permission_active")}>Create proposal</button>
                </div>
                : proposalType === "change_permission_owner" ?
                <div>
                  <hr />
                  <div className="inputLabel">Proposal title</div>
                  <input
                    style={{marginTop: "5px"}}
                    name="title"
                    onChange={handleProposalDataChange} // Make sure you have this function defined to update proposal title/description
                    className="editProfile"
                    placeholder="Title of the proposal"
                  />
              
                  <div className="inputLabel">Proposal description</div>
                  <input
                    style={{marginTop: "5px"}}
                    name="description"
                    onChange={handleProposalDataChange} // And this one too
                    className="editProfile"
                    placeholder="Description for the proposal"
                  />

                  <div className="inputLabel">Threshold</div>
                  <input
                    type="number"
                    style={{marginTop: "5px"}}
                    name="threshold"
                    value={proposalData.threshold || ''} // Ensure there's a default value to avoid controlled component error
                    onChange={handleProposalDataChange}
                    className="editProfile"
                    placeholder="Threshold value"
                    min="0" // Optional: Ensures only positive numbers are entered
                  />
              
                  <div className="inputLabel">Accounts to Add to Owner</div>
                  {proposalData.addAccounts.owner.map((account, index) => (
                    <div key={index} className="accountField">
                      <input
                        style={{marginTop: "5px"}}
                        name="accountToAdd"
                        value={account.accountToAdd}
                        onChange={(e) => handleAccountChange('addAccounts', 'owner', index, e)}
                        className="editProfile"
                        placeholder="Account"
                        id = {"owneraddacc" + index}
                      />
                      <input
                        style={{marginTop: "5px"}}
                        name="permissionName"
                        value={account.permissionName}
                        onChange={(e) => handleAccountChange('addAccounts', 'owner', index, e)}
                        className="editProfile"
                        placeholder="Permission"
                        id = {"owneraddperm" + index}
                      />
                      <input
                        type="number"
                        style={{marginTop: "5px"}}
                        name="weight"
                        value={account.weight}
                        onChange={(e) => handleAccountChange('addAccounts', 'owner', index, e)}
                        className="editProfile weightInput"
                        placeholder="Weight"
                        min="1" // Set minimum value to 1 to avoid invalid weight
                        id={"owneraddweight" + index}
                      />
                    </div>
                  ))}
                  <button onClick={() => addAccountField('addAccounts', 'owner')} className="addAccountstoChatMore">Add more</button>
              
                  <hr />
                  <div className="inputLabel">Accounts to Remove from Owner</div>
                  {proposalData.removeAccounts.owner.map((account, index) => (
                    <div key={index} className="accountField">
                      <input
                        style={{marginTop: "5px"}}
                        name="accountToRemove"
                        value={account.accountToRemove} // Make sure to use accountToRemove for removal fields
                        onChange={(e) => handleAccountChange('removeAccounts', 'owner', index, e)}
                        className="editProfile"
                        placeholder="Account to remove"
                        id = {"ownerremoveacc" + index}
                      />
                      <input
                        style={{marginTop: "5px"}}
                        name="permissionName"
                        value={account.permissionName}
                        onChange={(e) => handleAccountChange('removeAccounts', 'owner', index, e)}
                        className="editProfile"
                        placeholder="Permission name"
                        id = {"ownerremoveperm" + index}
                      />
                    </div>
                  ))}
                  <button onClick={() => addAccountField('removeAccounts', 'owner')} className="addAccountstoChatMore">Add more</button>
              
                  <button className="createProposalButton" onClick={() => createProposal("change_permission_owner")}>Create proposal</button>
                </div>
                : proposalType == "add_accounts_to_chat" ?
                    <div>
                      <hr />
                      <div className="inputLabel">Proposal title</div>
                      <input style={{marginTop:"5px"}} name="title" onChange={handleProposalDataChange} className="editProfile" placeholder="Title of the proposal" />

                      <div className="inputLabel">Proposal description</div>
                      <input style={{marginTop:"5px"}} name="description" onChange={handleProposalDataChange} className="editProfile" placeholder="Description for the proposal" />
                      <div className="inputLabel">Accounts to Add</div>
                      {proposalData.addAccounts.chat.map((account, index) => (
                        <div key={index} className="accountField">
                          <input
                            style={{marginTop: "5px"}}
                            name="accountToAdd"
                            value={account.accountToAdd}
                            onChange={(e) => handleAccountChange('addAccounts', 'chat', index, e)}
                            className="editProfile"
                            placeholder="Account to add"
                            id = {"chataddacc" + index}
                          />
                          <input
                            style={{marginTop: "5px"}}
                            name="permissionName"
                            value={account.permissionName}
                            onChange={(e) => handleAccountChange('addAccounts', 'chat', index, e)}
                            className="editProfile"
                            placeholder="Permission name"
                            id = {"chataddperm" + index}
                          />
                        </div>
                      ))}
                      <button onClick={() => addAccountField('addAccounts', 'chat')} className="addAccountstoChatMore">Add more</button>

                      <hr />
                      <div className="inputLabel">Accounts to Remove</div>
                      {proposalData.removeAccounts.chat.map((account, index) => (
                        <div key={index} className="accountField">
                          <input
                            style={{marginTop: "5px"}}
                            name="accountToRemove"
                            value={account.accountToAdd} // Assuming the structure is the same; adjust if different
                            onChange={(e) => handleAccountChange('removeAccounts', 'chat', index, e)}
                            className="editProfile"
                            placeholder="Account to remove"
                            id = {"chatremoveacc" + index}
                          />
                          <input
                            style={{marginTop: "5px"}}
                            name="permissionName"
                            value={account.permissionName} // Assuming this is needed; adjust if not
                            onChange={(e) => handleAccountChange('removeAccounts', 'chat', index, e)}
                            className="editProfile"
                            placeholder="Permission name"
                            id = {"chatremoveperm" + index}
                          />
                        </div>
                      ))}
                      <button onClick={() => addAccountField('removeAccounts', 'chat')} className="addAccountstoChatMore">Add more</button>

                      <button className="createProposalButton" onClick={() => createProposal("add_accounts_to_chat")}>Create proposal</button>
                    </div>
                : proposalType == "del_on_off" ?
                <div>
                  <hr />
                  <div className="inputLabel">Proposal title</div>
                  <input style={{marginTop:"5px"}} name="title" onChange={handleProposalDataChange} className="editProfile" placeholder="Title of the proposal" />
                  <div className="inputLabel">Proposal description</div>
                  <input style={{marginTop:"5px"}} name="description" onChange={handleProposalDataChange} className="editProfile" placeholder="Description for the proposal" />
                  <span className="inputLabel">Allow message deletion</span>
                  <Select
                    name="delonBoolean"
                    onChange={(e, newValue) => handleProposalBoolChange(e, newValue, 'delonBoolean')} // Ensure this function is defined to update proposal boolean
                    style={{
                      marginBottom: "15px",
                      border: "1px solid gray",
                      borderRadius: "10px",
                      backgroundColor: "white",
                      fontSize: "14px",
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                    }}
                  >
                    <Option value="1">Allow</Option>
                    <Option value="0">Disallow</Option>
                  </Select>
                  <button className="createProposalButton" onClick={() => createProposal("del_on_off")}>Create proposal</button>
                </div>
                :
                <></>
              }
          </div>
          :<></>
          }
        </div>
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
          <span className="inputLabel">Community name</span>
          <input name="community_name" className="editProfile" onChange={handleCommunityInputChange} placeholder="Community name" defaultValue={currentCommunity?.community_name}></input>
          <span className="inputLabel">Community description</span>
          <input name="description" className="editProfile" onChange={handleCommunityInputChange} placeholder="Community description" defaultValue={currentCommunity?.description}></input>
          <button className="viewCommunitiesButton" onClick={()=>editCommunity()}>Edit community</button>
          <hr></hr>
          {delApproval ? <div>Currently CAN delete messages.</div> : <div>Currently CANNOT delete messages.</div>}
          <span className="inputLabel">Amount of messages to delete</span>
          <input className="editProfile" value={delMessagesAmount} onChange={(e)=>setDelMessagesAmount(e.target.value)} disabled={!delApproval} placeholder="Amount of messages to delete"></input>
          <button className="viewCommunitiesButton" disabled={!delApproval} style={{backgroundColor: delApproval ? "#2155BF" : "gray"}} onClick={()=>deleteMessages()}>Delete messages</button>
          <button className="viewCommunitiesButton" disabled={!delApproval} style={{backgroundColor: delApproval ? "red" : "gray"}} onClick={()=>deleteCommunity()}>Delete community</button>
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
          <CommunityProfilePicture currentCommunity={currentCommunity} />
          <div>{currentCommunity?.community_name}</div>
          <div className="communityCardDescription">{currentCommunity?.description}</div>
          <div className="notificationsButton" onClick={()=>requestPermission()}><img src="assets/bell.png" width="16px" /> Get notified</div>

          </div>
          <Scrollbars style={{ width: "100%", height: "100%" }}>
          {msiggers?.length > 0 && msiggers[0] !== "" ?
          <>
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
          </>
          :
          <div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
          }
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
      <div className="mainCardHeader" key={currentCommunity?.community_name + currentCommunity?.community_description + currentCommunity?.community_name + currentCommunity?.community_profile_img_url}>
      <CommunityProfilePicture currentCommunity={currentCommunity} />
      {currentCommunity?.community_name}
      </div>
      : <></>
      }
      <div className="Messages">
      {pinnedMessages && pinnedMessages?.length > 0 ?
      <div className="pinnedMessages">
        <div className="pinnedMessagesMessage" onClick={()=>setPinnedMessagesOpen(true)} id={pinnedMessages[pinnedMessages?.length-1]?.message_id}>
            Pinned: {pinnedMessages[0]?.pinned_message}
          </div>
        </div>
        :
        <></>}
        {/**<Scrollbars ref={scrollbarsRef} autoHeight autoHeightMax={"100%"}> */}
      <Scrollbars ref={scrollbarsRef} autoHeight autoHeightMax={"100%"}>
      <div className="messagesWrapper">
      {messages?.rows?.map((value, index) => (
      <>
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
          <div onClick={()=>replyToMessage(value, handleClose)} className="popoverButton">Reply to message</div>
          <div onClick={()=>pinMessage(value, handleClose)} className="popoverButton">Pin message</div>
          {value.user == accountName ? <div onClick={()=>deleteMessage(value.id, handleClose)} className="popoverButton">Delete message</div> : <></>}
          <hr/>
          <div className="reactionButtons">
            <div className="reactionButton" onClick={() => reactToMessage(value?.id, 1, handleClose)}>❤️</div>
            <div className="reactionButton" onClick={() => reactToMessage(value?.id, 2, handleClose)}>😂</div>
            <div className="reactionButton" onClick={() => reactToMessage(value?.id, 3, handleClose)}>👍</div>
            <div className="reactionButton" onClick={() => reactToMessage(value?.id, 4, handleClose)}>👎</div>
          </div>
        </Popover>
        <>
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
              <div className="reactions" key={value?.emojis.length}>
              {value?.emojis?.map((reaction, index) => {
                const backgroundColor = reaction?.users?.includes(accountName) ? '#d7dcff' : 'white';
                const handleClose = () => {console.log("No close")}
                return (
                  <Tooltip title={reaction?.users?.join(", ")} variant="outlined" key={index}>
                    <div 
                      key={value?.users?.length}
                      style={{ background: backgroundColor }}
                      onClick={(e) => {
                        e.stopPropagation();
                        reaction?.users?.includes(accountName) ? removeReaction(value?.id, reaction?.emoji_id, handleClose) : reactToMessage(value?.id, reaction?.emoji_id, handleClose)}}
                      className="reactionBadge">
                      {reaction?.count} {emojimap[reaction?.emoji_id]}
                    </div>
                  </Tooltip>
                );
              })}      
              </div>
                  {value?.replied_to ? <div className="replyCard">{value?.replied_to}</div> : <></>}
                  {value.message}
              </Linkify>

            </div>
          </div></>
          </>
      ))}
      </div>
    </Scrollbars>

        <div className="sendMessage">
        {replyTo ?
      <div className="replyToMessage">Replying to: {replyTo?.message} <div onClick={()=> setReplyTo("")} className="closeReplyTo">Cancel</div></div>
      :<></>
      }
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
            <button className="connectButton" style={{background: ws && ws.readyState !== WebSocket.OPEN ? "#BBBCB6" : ""}} disabled={ws && ws.readyState !== WebSocket.OPEN} onClick={()=>signDummyTransaction()}>{ws && ws.readyState === WebSocket.OPEN ? "Connect to chat" : "Connecting to server..."}</button>
            : <></>
            }
          
        </div>

      </div>
      </div>


      <div className="sideMenu">
      <img className="sideMenuIcon" src="assets/account.svg" onClick={() => setUserModalOpen(true)}></img>
      <img className="sideMenuIcon" src="assets/community.svg" onClick={() => setModalOpen(true)}></img>
      <img className="sideMenuIcon" src="assets/proposal.svg" onClick={() => {
        if(connected){
        setProposalsOpen(true)
        }
        else{
          sweetAlert("Connect to the chat to see proposals.")
        }
        }}></img>
      <img className="sideMenuIcon" src="assets/settings.svg" onClick={()=>currentCommunity ? openCommunitySettings() : sweetAlert("You're not in a community. That's a bit sad.")}></img>

      </div>
    </>
    :
    <>
        <div className="noCommunityExplainer">
          <div  style={{color:"white"}}>Hop in a chat with your community.</div>
          <div className="viewCommunitiesButtonOutlined" onClick={()=>setModalOpen(true)}>View communities</div>
          <div className="viewCommunitiesButtonOutlined" onClick={()=>setAddChatModalOpen(true)}>Add community</div>
          <div className="viewCommunitiesButtonOutlined" onClick={()=>setCreateChatModalOpen(true)}>Create new community</div>
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
