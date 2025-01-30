import { createLightNode, waitForRemotePeer } from '@waku/sdk';
import { createEncoder, createDecoder } from '@waku/sdk';
import { Wallet, ethers } from 'ethers';
import Chat from '../components/Chat';

// Content topic for the messages
const contentTopic = '/my-app/1/chat/proto';

// Generate keypair for encryption using ethers
const generateKeyPair = async () => {
  const wallet = Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    address: wallet.address
  };
};

// Create and initialize Waku node
const initializeWaku = async () => {
  const node = await createLightNode({ 
    defaultBootstrap: true,
  });
  
  await node.start();
  try {
    await waitForRemotePeer(node, { timeoutMs: 15000 });
  } catch (err) {
    console.warn('Timeout waiting for remote peer');
  }
  
  return node;
};

// Message encryption function using ethers
const encryptMessage = async (message, recipientAddress, senderAddress) => {
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
  const encoder = createEncoder({ contentTopic });
  const encryptedPayload = await encryptMessage(message, recipientAddress, senderAddress);

  await node.lightPush.send(encoder, {
    payload: encryptedPayload
  });
};

// Receive and decrypt messages
const receiveMessages = async (node, privateKey, myAddress, onMessageReceived) => {
  const decoder = createDecoder(contentTopic);

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
      console.error('Failed to process message:', error);
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