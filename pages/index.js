import { createLightNode, waitForRemotePeer } from '@waku/sdk';
import { createEncoder, createDecoder } from '@waku/sdk';
import { Wallet, ethers } from 'ethers';
import Chat from '../components/Chat';

// Content topic for the messages
const contentTopic = '/my-app/1/chat/proto';
const discoveryTopic = '/my-app/1/discovery/proto';
const heartbeatTopic = '/my-app/1/heartbeat/proto';
const chatTopic = '/my-app/1/messages/proto';
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const PEER_TIMEOUT = 20000; // 20 seconds

// Generate keypair for encryption using ethers
const generateKeyPair = async () => {
  const wallet = Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    address: wallet.address
  };
};

// Create and initialize Waku node
const initializeWaku = async (onPeersChange, myAddress) => {
  const node = await createLightNode({ 
    defaultBootstrap: true,
  });
  
  await node.start();
  try {
    await waitForRemotePeer(node, { timeoutMs: 15000 });
  } catch (err) {
    console.warn('Timeout waiting for remote peer');
  }

  // Track active peers in the topic
  const activePeers = new Map(); // address -> last seen timestamp
  
  // Update the peer count
  const updatePeerCount = () => {
    const now = Date.now();
    // Clean up peers that haven't been seen recently
    for (const [address, lastSeen] of activePeers.entries()) {
      if (now - lastSeen > PEER_TIMEOUT) {
        activePeers.delete(address);
      }
    }
    onPeersChange(activePeers.size);
  };

  // Send discovery announcement
  const sendDiscoveryMessage = async (type) => {
    const encoder = createEncoder({ contentTopic: discoveryTopic });
    const message = {
      type,
      address: myAddress,
      timestamp: Date.now()
    };
    
    try {
      await node.lightPush.send(encoder, {
        payload: new TextEncoder().encode(JSON.stringify(message))
      });
    } catch (error) {
      console.error('Failed to send discovery message:', error);
    }
  };

  // Set up heartbeat to broadcast presence
  const sendHeartbeat = async () => {
    try {
      await sendDiscoveryMessage('heartbeat');
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  };

  // Start heartbeat interval
  const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  // Subscribe to discovery messages
  const discoveryDecoder = createDecoder(discoveryTopic);
  await node.filter.subscribe([discoveryDecoder], async (wakuMessage) => {
    if (!wakuMessage.payload) return;
    
    try {
      const message = JSON.parse(new TextDecoder().decode(wakuMessage.payload));
      if (message.address !== myAddress) {
        // Update peer's last seen timestamp
        activePeers.set(message.address, message.timestamp);
        updatePeerCount();

        // If this is a new peer announcing themselves, respond with our presence
        if (message.type === 'announce') {
          await sendDiscoveryMessage('response');
        }
      }
    } catch (error) {
      console.error('Failed to process discovery message:', error);
    }
  });

  // Send initial announcement and heartbeat
  await sendDiscoveryMessage('announce');
  await sendHeartbeat();

  // Clean up function
  node.cleanup = () => {
    clearInterval(heartbeatInterval);
  };
  
  return node;
};

// Message encryption function using ethers
const encryptMessage = async (message, recipientAddress, senderAddress) => {
  try {
    const messageBytes = new TextEncoder().encode(JSON.stringify({
      content: message,
      timestamp: new Date().toISOString()
    }));
    
    const encryptedData = {
      message: Array.from(messageBytes),
      senderAddress,
      recipientAddress
    };
    
    return new TextEncoder().encode(JSON.stringify(encryptedData));
  } catch (error) {
    console.error('Failed to encrypt message:', error);
    throw error;
  }
};

// Message decryption function using ethers
const decryptMessage = async (encryptedPayload, privateKey) => {
  try {
    const decryptedData = JSON.parse(new TextDecoder().decode(encryptedPayload));
    const messageBytes = new Uint8Array(decryptedData.message);
    const messageContent = JSON.parse(new TextDecoder().decode(messageBytes));
    return {
      content: messageContent.content,
      timestamp: new Date(messageContent.timestamp),
      senderAddress: decryptedData.senderAddress,
      recipientAddress: decryptedData.recipientAddress
    };
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    return null;
  }
};

// Send encrypted message
const sendEncryptedMessage = async (node, message, recipientAddress, senderAddress) => {
  const encoder = createEncoder({ contentTopic: chatTopic });
  try {
    const encryptedPayload = await encryptMessage(message, recipientAddress, senderAddress);
    await node.lightPush.send(encoder, {
      payload: encryptedPayload
    });
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

// Receive and decrypt messages
const receiveMessages = async (node, privateKey, myAddress, onMessageReceived) => {
  const decoder = createDecoder(chatTopic);

  // Subscribe to messages
  const callback = async (wakuMessage) => {
    if (!wakuMessage.payload) return;

    try {
      const decryptedMessage = await decryptMessage(wakuMessage.payload, privateKey);
      
      if (decryptedMessage && 
          (decryptedMessage.recipientAddress === myAddress || 
           decryptedMessage.senderAddress === myAddress)) {
        onMessageReceived(decryptedMessage);
      }
    } catch (error) {
      console.error('Failed to process chat message:', error);
    }
  };

  // Subscribe to new messages
  const subscription = await node.filter.subscribe([decoder], callback);
  return subscription;
};

export {
  generateKeyPair,
  initializeWaku,
  sendEncryptedMessage,
  receiveMessages
};

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <Chat />
    </div>
  );
}