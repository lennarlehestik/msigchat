import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { UALProvider } from 'ual-reactjs-renderer';
import { Anchor } from 'ual-anchor';
import { Wax } from "@alienworlds/ual-wax";

const appName = "Chat app on wax";
const chainId = "1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4";

const endpoints = [
  "https://wax.greymass.com",
  "https://wax.eosusa.io",
  "https://api.waxsweden.org",
  "https://api.wax.bountyblok.io",
  "https://api.wax.alohaeos.com"
  // Add other endpoints as needed
];

function getAvailableEndpoint() {
  return new Promise((resolve, reject) => {
    const checkEndpoint = (index) => {
      if (index >= endpoints.length) {
        reject(new Error('All endpoints failed.'));
        return;
      }

      const endpoint = endpoints[index];
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
        }),
      })
        .then(response => {
          if (response.ok) {
            console.log("Chose endpoint:", endpoint)
            resolve(endpoint);
          } else {
            checkEndpoint(index + 1);
          }
        })
        .catch(() => {
          checkEndpoint(index + 1);
        });
    };

    checkEndpoint(0);
  });
}

function Root() {
  const [chain, setChain] = useState(null);
  const [endpoint, setEndpoint] = useState(null);

  useEffect(() => {
    getAvailableEndpoint()
      .then(endpoint => {
        const rpcEndpoint = new URL(endpoint);
        setChain({
          chainId,
          rpcEndpoints: [{
            protocol: rpcEndpoint.protocol.replace(':', ''),
            host: rpcEndpoint.hostname,
            port: rpcEndpoint.port || "",
          }],
        });
        setEndpoint(endpoint);

      })
      .catch(error => {
        console.error("Failed to find an available endpoint:", error);
        // Handle the error. Maybe show a message to the user.
      });
  }, []);

  if (!chain) {
    return <div className="App">Finding a working WAX endpoint...</div>; // You can show a loader or some other placeholder here.
  }
  
  const wax = new Wax([chain]);
  const anchor = new Anchor([chain], { appName });
  const supportedChains = [chain];
  const supportedAuthenticators = [wax, anchor];

  return (
    <UALProvider
      chains={supportedChains}
      authenticators={supportedAuthenticators}
      appName={appName}
    >
      <App endpoint={endpoint}/>
    </UALProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);

reportWebVitals();
